import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import logger, { createLogger } from '../config/logger.js';
import Document from '../models/Document.js';
import User from '../models/User.js';
import YjsService from '../services/YjsService.js';
import PresenceService from '../services/PresenceService.js';

/**
 * WebSocket server for real-time collaboration
 */
class SocketServer {
  constructor(httpServer) {
    logger.info('Creating Socket.IO server with config', {
      cors: config.websocket.cors,
      transports: ['websocket', 'polling']
    });

    this.io = new Server(httpServer, {
      cors: config.websocket.cors,
      pingInterval: config.websocket.pingInterval,
      pingTimeout: config.websocket.pingTimeout,
      maxHttpBufferSize: config.websocket.maxBufferSize,
      transports: ['websocket', 'polling']
    });

    // Log raw engine connections
    this.io.engine.on('initial_headers', (headers, request) => {
      logger.info('WebSocket initial headers', {
        origin: request.headers.origin,
        url: request.url
      });
    });

    this.io.engine.on('connection', (rawSocket) => {
      logger.info('Raw engine connection received', {
        id: rawSocket.id,
        transport: rawSocket.transport.name
      });
    });

    this.presenceService = new PresenceService();
    this.setupMiddleware();
    this.setupEventHandlers();
    
    logger.info('WebSocket server initialized');
  }

  /**
   * Setup authentication middleware
   */
  setupMiddleware() {
    logger.info('Setting up WebSocket authentication middleware');
    
    this.io.use((socket, next) => {
      logger.info('WebSocket middleware called', {
        socketId: socket.id,
        hasAuth: !!socket.handshake.auth,
        authKeys: socket.handshake.auth ? Object.keys(socket.handshake.auth) : []
      });
      
      // Wrap in async IIFE to handle async operations
      (async () => {
        try {
          const token = socket.handshake.auth.token;
          
          logger.info('WebSocket auth attempt', { 
            hasToken: !!token,
            socketId: socket.id,
            tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
          });
          
          if (!token) {
            logger.warn('WebSocket auth failed: no token');
            return next(new Error('Authentication required'));
          }

          // Verify JWT
          const decoded = jwt.verify(token, config.jwt.secret);
          logger.info('JWT verified', { userId: decoded.userId });
          
          const user = await User.findById(decoded.userId);

          if (!user) {
            logger.warn('WebSocket auth failed: user not found', { userId: decoded.userId });
            return next(new Error('Invalid user'));
          }
          
          if (!user.isActive) {
            logger.warn('WebSocket auth failed: user not active', { userId: decoded.userId });
            return next(new Error('Invalid user'));
          }

          socket.userId = user._id.toString();
          socket.user = user;
          socket.correlationId = uuidv4();
          
          logger.info('WebSocket auth successful', { 
            userId: socket.userId,
            username: user.username 
          });
          
          next();
        } catch (error) {
          logger.error('Socket authentication failed', { 
            error: error.message,
            name: error.name,
            stack: error.stack
          });
          next(new Error('Authentication failed: ' + error.message));
        }
      })();
    });
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    // Log all connection attempts
    this.io.engine.on('connection_error', (err) => {
      logger.error('WebSocket connection error', {
        message: err.message,
        code: err.code,
        context: err.context
      });
    });

    this.io.on('connection', (socket) => {
      const log = createLogger(socket.correlationId);
      
      log.info('Client connected', { 
        userId: socket.userId,
        socketId: socket.id 
      });

      // Join document room
      socket.on('join-document', async (data) => {
        await this.handleJoinDocument(socket, data, log);
      });

      // Leave document room
      socket.on('leave-document', async (data) => {
        await this.handleLeaveDocument(socket, data, log);
      });

      // Handle Yjs updates
      socket.on('yjs-update', async (data) => {
        await this.handleYjsUpdate(socket, data, log);
      });

      // Handle cursor updates
      socket.on('cursor-update', async (data) => {
        await this.handleCursorUpdate(socket, data, log);
      });

      // Handle awareness updates (selection, presence)
      socket.on('awareness-update', async (data) => {
        await this.handleAwarenessUpdate(socket, data, log);
      });

      // Request full sync
      socket.on('request-sync', async (data) => {
        await this.handleSyncRequest(socket, data, log);
      });

      // Disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket, log);
      });
    });
  }

  /**
   * Handle join document
   */
  async handleJoinDocument(socket, { documentId }, log) {
    try {
      // Check document access
      const document = await Document.findById(documentId);
      
      if (!document) {
        socket.emit('error', { message: 'Document not found' });
        return;
      }

      if (!document.hasAccess(socket.userId, 'viewer')) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      // Join room
      socket.join(`document:${documentId}`);
      socket.currentDocumentId = documentId;

      // Add user to presence
      await this.presenceService.addUser(documentId, socket.userId, socket.id);

      // Update active users in document
      await Document.findByIdAndUpdate(documentId, {
        $addToSet: { activeUsers: socket.userId }
      });

      // Get document state
      const stateVector = await YjsService.getStateVector(documentId);
      const state = await YjsService.getStateAsUpdate(documentId);

      // Get current presence
      const presence = await this.presenceService.getPresence(documentId);

      // Send sync data to client
      socket.emit('sync-response', {
        documentId,
        state: Array.from(state),
        stateVector: Array.from(stateVector),
        presence,
        userRole: document.getUserRole(socket.userId)
      });

      // Notify others
      socket.to(`document:${documentId}`).emit('user-joined', {
        userId: socket.userId,
        user: {
          _id: socket.user._id,
          username: socket.user.username,
          displayName: socket.user.displayName,
          color: socket.user.color,
          avatar: socket.user.avatar
        }
      });

      log.info('User joined document', { documentId, userId: socket.userId });
    } catch (error) {
      log.error('Join document failed', { 
        documentId, 
        error: error.message 
      });
      socket.emit('error', { message: 'Failed to join document' });
    }
  }

  /**
   * Handle leave document
   */
  async handleLeaveDocument(socket, { documentId }, log) {
    try {
      socket.leave(`document:${documentId}`);
      
      // Remove from presence
      await this.presenceService.removeUser(documentId, socket.userId, socket.id);

      // Update active users
      const remainingSockets = await this.presenceService.getUserSockets(documentId, socket.userId);
      
      if (remainingSockets.length === 0) {
        await Document.findByIdAndUpdate(documentId, {
          $pull: { activeUsers: socket.userId }
        });
      }

      // Notify others
      socket.to(`document:${documentId}`).emit('user-left', {
        userId: socket.userId
      });

      socket.currentDocumentId = null;

      log.info('User left document', { documentId, userId: socket.userId });
    } catch (error) {
      log.error('Leave document failed', { 
        documentId, 
        error: error.message 
      });
    }
  }

  /**
   * Handle Yjs update
   */
  async handleYjsUpdate(socket, { documentId, update }, log) {
    try {
      // Verify access
      const document = await Document.findById(documentId);
      
      if (!document || !document.hasAccess(socket.userId, 'editor')) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      // Convert array to Uint8Array
      const updateArray = new Uint8Array(update);

      // Apply update
      const result = await YjsService.applyUpdate(
        documentId,
        updateArray,
        socket.userId,
        socket.id
      );

      // Broadcast to others (not sender)
      if (!result.isDuplicate) {
        socket.to(`document:${documentId}`).emit('yjs-update', {
          documentId,
          update,
          clock: result.clock,
          userId: socket.userId
        });

        log.debug('Yjs update broadcast', { 
          documentId, 
          clock: result.clock,
          size: update.length 
        });
      }

      // Acknowledge to sender
      socket.emit('yjs-update-ack', {
        documentId,
        clock: result.clock,
        sequenceNumber: result.sequenceNumber
      });

    } catch (error) {
      log.error('Yjs update failed', { 
        documentId, 
        error: error.message 
      });
      socket.emit('error', { message: 'Failed to apply update' });
    }
  }

  /**
   * Handle cursor update
   */
  async handleCursorUpdate(socket, { documentId, cursor }, log) {
    try {
      // Update presence with cursor
      await this.presenceService.updateCursor(
        documentId,
        socket.userId,
        socket.id,
        cursor
      );

      // Broadcast to others
      socket.to(`document:${documentId}`).emit('cursor-update', {
        userId: socket.userId,
        cursor,
        user: {
          username: socket.user.username,
          displayName: socket.user.displayName,
          color: socket.user.color
        }
      });
    } catch (error) {
      log.error('Cursor update failed', { 
        documentId, 
        error: error.message 
      });
    }
  }

  /**
   * Handle awareness update (selection, etc.)
   */
  async handleAwarenessUpdate(socket, { documentId, awareness }, log) {
    try {
      await this.presenceService.updateAwareness(
        documentId,
        socket.userId,
        socket.id,
        awareness
      );

      socket.to(`document:${documentId}`).emit('awareness-update', {
        userId: socket.userId,
        awareness
      });
    } catch (error) {
      log.error('Awareness update failed', { 
        documentId, 
        error: error.message 
      });
    }
  }

  /**
   * Handle sync request
   */
  async handleSyncRequest(socket, { documentId, stateVector }, log) {
    try {
      const document = await Document.findById(documentId);
      
      if (!document || !document.hasAccess(socket.userId, 'viewer')) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      const stateVectorArray = stateVector ? new Uint8Array(stateVector) : null;
      const update = await YjsService.getStateAsUpdate(documentId, stateVectorArray);

      socket.emit('sync-response', {
        documentId,
        state: Array.from(update)
      });

      log.debug('Sync response sent', { documentId });
    } catch (error) {
      log.error('Sync request failed', { 
        documentId, 
        error: error.message 
      });
      socket.emit('error', { message: 'Sync failed' });
    }
  }

  /**
   * Handle disconnect
   */
  async handleDisconnect(socket, log) {
    try {
      if (socket.currentDocumentId) {
        await this.handleLeaveDocument(
          socket, 
          { documentId: socket.currentDocumentId }, 
          log
        );
      }

      log.info('Client disconnected', { userId: socket.userId });
    } catch (error) {
      log.error('Disconnect handling failed', { error: error.message });
    }
  }

  /**
   * Get Socket.IO instance
   */
  getIO() {
    return this.io;
  }
}

export default SocketServer;
