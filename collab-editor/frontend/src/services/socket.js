import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.connected = true;
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.connected = false;
      this.emit('disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Join document room
  joinDocument(documentId) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('join-document', { documentId });

      const timeout = setTimeout(() => {
        reject(new Error('Join document timeout'));
      }, 10000);

      this.socket.once('sync-response', (data) => {
        clearTimeout(timeout);
        resolve(data);
      });

      this.socket.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  // Leave document room
  leaveDocument(documentId) {
    if (this.socket) {
      this.socket.emit('leave-document', { documentId });
    }
  }

  // Send Yjs update
  sendUpdate(documentId, update) {
    if (this.socket) {
      this.socket.emit('yjs-update', { documentId, update });
    }
  }

  // Send cursor update
  sendCursor(documentId, cursor) {
    if (this.socket) {
      this.socket.emit('cursor-update', { documentId, cursor });
    }
  }

  // Send awareness update
  sendAwareness(documentId, awareness) {
    if (this.socket) {
      this.socket.emit('awareness-update', { documentId, awareness });
    }
  }

  // Request sync
  requestSync(documentId, stateVector) {
    if (this.socket) {
      this.socket.emit('request-sync', { documentId, stateVector });
    }
  }

  // Event listeners
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }

    // Store for custom events
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }

    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Emit custom event
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  isConnected() {
    return this.connected && this.socket?.connected;
  }
}

export default new SocketService();
