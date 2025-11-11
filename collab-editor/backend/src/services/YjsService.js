import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { createHash } from 'crypto';
import Document from '../models/Document.js';
import Operation from '../models/Operation.js';
import logger from '../config/logger.js';
import config from '../config/index.js';

/**
 * Manages Yjs documents with persistence and synchronization
 */
class YjsService {
  constructor() {
    // Map of documentId -> Y.Doc instances
    this.documents = new Map();
    // Map of documentId -> clock counter
    this.clocks = new Map();
    // Map of documentId -> sequence number
    this.sequences = new Map();
  }

  /**
   * Get or create Yjs document
   */
  async getDocument(documentId) {
    if (this.documents.has(documentId)) {
      return this.documents.get(documentId);
    }

    const ydoc = new Y.Doc();
    
    // Load document state from database
    const doc = await Document.findById(documentId);
    
    if (doc && doc.yjsState) {
      try {
        Y.applyUpdate(ydoc, doc.yjsState);
        logger.info('Loaded Yjs state from database', { documentId });
      } catch (error) {
        logger.error('Failed to apply Yjs state', { documentId, error: error.message });
      }
    }

    // Initialize clock and sequence
    if (!this.clocks.has(documentId)) {
      const lastOp = await Operation.findOne({ documentId })
        .sort({ clock: -1 })
        .limit(1);
      
      this.clocks.set(documentId, lastOp ? lastOp.clock : 0);
      this.sequences.set(documentId, lastOp ? lastOp.sequenceNumber : 0);
    }

    this.documents.set(documentId, ydoc);
    return ydoc;
  }

  /**
   * Apply update to document
   */
  async applyUpdate(documentId, update, userId, clientId) {
    const ydoc = await this.getDocument(documentId);
    
    try {
      // Apply update to document
      Y.applyUpdate(ydoc, update);
      
      // Increment clock and sequence
      const clock = this.incrementClock(documentId);
      const sequenceNumber = this.incrementSequence(documentId);
      
      // Create operation hash for duplicate detection
      const operationHash = this.hashOperation(update, userId, clientId, clock);
      
      // Check for duplicates
      const isDuplicate = await Operation.isDuplicate(operationHash);
      
      if (isDuplicate) {
        logger.warn('Duplicate operation detected', { 
          documentId, 
          operationHash,
          userId,
          clientId 
        });
        return { isDuplicate: true, clock, sequenceNumber };
      }
      
      // Save operation to database
      const operation = new Operation({
        documentId,
        userId,
        update: Buffer.from(update),
        clock,
        sequenceNumber,
        operationHash,
        clientId,
        size: update.length
      });
      
      await operation.save();
      
      // Update document metadata
      await Document.findByIdAndUpdate(documentId, {
        $inc: { version: 1, operationsSinceSnapshot: 1 },
        updatedAt: new Date()
      });
      
      logger.debug('Applied update', { 
        documentId, 
        clock, 
        sequenceNumber,
        size: update.length 
      });
      
      // Check if snapshot is needed
      await this.checkSnapshot(documentId);
      
      return { 
        isDuplicate: false, 
        clock, 
        sequenceNumber,
        operationHash 
      };
    } catch (error) {
      logger.error('Failed to apply update', { 
        documentId, 
        error: error.message,
        userId,
        clientId 
      });
      throw error;
    }
  }

  /**
   * Get state vector for synchronization
   */
  async getStateVector(documentId) {
    const ydoc = await this.getDocument(documentId);
    return Y.encodeStateVector(ydoc);
  }

  /**
   * Get state as update
   */
  async getStateAsUpdate(documentId, stateVector = null) {
    const ydoc = await this.getDocument(documentId);
    
    if (stateVector) {
      return Y.encodeStateAsUpdate(ydoc, stateVector);
    }
    
    return Y.encodeStateAsUpdate(ydoc);
  }

  /**
   * Create snapshot of current state
   */
  async createSnapshot(documentId) {
    try {
      const ydoc = await this.getDocument(documentId);
      const state = Y.encodeStateAsUpdate(ydoc);
      const stateVector = Y.encodeStateVector(ydoc);
      
      // Get plain text content
      const yText = ydoc.getText('content');
      const content = yText.toString();
      
      await Document.findByIdAndUpdate(documentId, {
        yjsState: Buffer.from(state),
        yjsStateVector: Buffer.from(stateVector),
        content,
        lastSnapshotAt: new Date(),
        operationsSinceSnapshot: 0
      });
      
      logger.info('Created snapshot', { 
        documentId, 
        stateSize: state.length,
        contentLength: content.length 
      });
      
      return { success: true, stateSize: state.length };
    } catch (error) {
      logger.error('Failed to create snapshot', { 
        documentId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Check if snapshot is needed and create it
   */
  async checkSnapshot(documentId) {
    const doc = await Document.findById(documentId);
    
    if (!doc) return;
    
    const timeSinceSnapshot = doc.lastSnapshotAt 
      ? Date.now() - doc.lastSnapshotAt.getTime() 
      : Infinity;
    
    const needsSnapshot = 
      doc.operationsSinceSnapshot >= config.snapshot.minOps ||
      timeSinceSnapshot >= config.snapshot.intervalMs;
    
    if (needsSnapshot) {
      await this.createSnapshot(documentId);
    }
  }

  /**
   * Compact old operations (keep only recent ones)
   */
  async compactOperations(documentId, keepDays = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);
      
      const result = await Operation.deleteMany({
        documentId,
        timestamp: { $lt: cutoffDate },
        isCompacted: false
      });
      
      logger.info('Compacted operations', { 
        documentId, 
        deleted: result.deletedCount,
        keepDays 
      });
      
      return result.deletedCount;
    } catch (error) {
      logger.error('Failed to compact operations', { 
        documentId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Time travel: Get document state at specific time
   */
  async getStateAtTime(documentId, targetTime) {
    try {
      // Get last snapshot before target time
      const doc = await Document.findById(documentId);
      
      if (!doc) {
        throw new Error('Document not found');
      }
      
      // Create new Y.Doc
      const ydoc = new Y.Doc();
      
      // Apply snapshot if available
      if (doc.yjsState) {
        Y.applyUpdate(ydoc, doc.yjsState);
      }
      
      // Get operations between snapshot and target time
      const snapshotTime = doc.lastSnapshotAt || new Date(0);
      const operations = await Operation.getOperationsInTimeRange(
        documentId,
        snapshotTime,
        targetTime
      );
      
      // Apply operations in order
      for (const op of operations) {
        Y.applyUpdate(ydoc, op.update);
      }
      
      const yText = ydoc.getText('content');
      const content = yText.toString();
      
      logger.info('Time travel completed', { 
        documentId, 
        targetTime,
        operationsApplied: operations.length,
        contentLength: content.length 
      });
      
      return { content, operations: operations.length };
    } catch (error) {
      logger.error('Time travel failed', { 
        documentId, 
        targetTime,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Unload document from memory
   */
  unloadDocument(documentId) {
    if (this.documents.has(documentId)) {
      const ydoc = this.documents.get(documentId);
      ydoc.destroy();
      this.documents.delete(documentId);
      logger.debug('Unloaded document', { documentId });
    }
  }

  /**
   * Helper: Increment clock
   */
  incrementClock(documentId) {
    const current = this.clocks.get(documentId) || 0;
    const next = current + 1;
    this.clocks.set(documentId, next);
    return next;
  }

  /**
   * Helper: Increment sequence
   */
  incrementSequence(documentId) {
    const current = this.sequences.get(documentId) || 0;
    const next = current + 1;
    this.sequences.set(documentId, next);
    return next;
  }

  /**
   * Helper: Hash operation for duplicate detection
   */
  hashOperation(update, userId, clientId, clock) {
    const hash = createHash('sha256');
    hash.update(update);
    hash.update(userId.toString());
    hash.update(clientId);
    hash.update(clock.toString());
    return hash.digest('hex');
  }

  /**
   * Get document text content
   */
  async getContent(documentId) {
    const ydoc = await this.getDocument(documentId);
    const yText = ydoc.getText('content');
    return yText.toString();
  }
}

export default new YjsService();
