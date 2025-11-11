/**
 * Manages user presence, cursors, and awareness in documents
 */
class PresenceService {
  constructor() {
    // Map of documentId -> Map of userId -> Set of socketIds
    this.presence = new Map();
    // Map of documentId -> Map of userId -> cursor data
    this.cursors = new Map();
    // Map of documentId -> Map of userId -> awareness data
    this.awareness = new Map();
  }

  /**
   * Add user to document presence
   */
  async addUser(documentId, userId, socketId) {
    if (!this.presence.has(documentId)) {
      this.presence.set(documentId, new Map());
    }

    const docPresence = this.presence.get(documentId);
    
    if (!docPresence.has(userId)) {
      docPresence.set(userId, new Set());
    }

    docPresence.get(userId).add(socketId);
  }

  /**
   * Remove user from document presence
   */
  async removeUser(documentId, userId, socketId) {
    if (!this.presence.has(documentId)) return;

    const docPresence = this.presence.get(documentId);
    
    if (docPresence.has(userId)) {
      docPresence.get(userId).delete(socketId);
      
      // If user has no more sockets, remove entirely
      if (docPresence.get(userId).size === 0) {
        docPresence.delete(userId);
        
        // Clean up cursor and awareness
        if (this.cursors.has(documentId)) {
          this.cursors.get(documentId).delete(userId);
        }
        if (this.awareness.has(documentId)) {
          this.awareness.get(documentId).delete(userId);
        }
      }
    }

    // Clean up empty maps
    if (docPresence.size === 0) {
      this.presence.delete(documentId);
      this.cursors.delete(documentId);
      this.awareness.delete(documentId);
    }
  }

  /**
   * Update cursor position
   */
  async updateCursor(documentId, userId, socketId, cursor) {
    if (!this.cursors.has(documentId)) {
      this.cursors.set(documentId, new Map());
    }

    this.cursors.get(documentId).set(userId, {
      ...cursor,
      updatedAt: Date.now()
    });
  }

  /**
   * Update awareness (selection, etc.)
   */
  async updateAwareness(documentId, userId, socketId, awareness) {
    if (!this.awareness.has(documentId)) {
      this.awareness.set(documentId, new Map());
    }

    this.awareness.get(documentId).set(userId, {
      ...awareness,
      updatedAt: Date.now()
    });
  }

  /**
   * Get all users in document
   */
  async getPresence(documentId) {
    const users = [];
    
    if (this.presence.has(documentId)) {
      const docPresence = this.presence.get(documentId);
      const docCursors = this.cursors.get(documentId) || new Map();
      const docAwareness = this.awareness.get(documentId) || new Map();
      
      for (const [userId, sockets] of docPresence.entries()) {
        users.push({
          userId,
          socketCount: sockets.size,
          cursor: docCursors.get(userId) || null,
          awareness: docAwareness.get(userId) || null
        });
      }
    }
    
    return users;
  }

  /**
   * Get user's sockets in document
   */
  async getUserSockets(documentId, userId) {
    if (!this.presence.has(documentId)) return [];
    
    const docPresence = this.presence.get(documentId);
    
    if (!docPresence.has(userId)) return [];
    
    return Array.from(docPresence.get(userId));
  }

  /**
   * Get active user count
   */
  async getUserCount(documentId) {
    if (!this.presence.has(documentId)) return 0;
    return this.presence.get(documentId).size;
  }

  /**
   * Check if user is present
   */
  async isUserPresent(documentId, userId) {
    if (!this.presence.has(documentId)) return false;
    return this.presence.get(documentId).has(userId);
  }
}

export default PresenceService;
