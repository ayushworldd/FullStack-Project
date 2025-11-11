# Real-Time Collaborative Text Editor

A production-grade real-time collaborative text editor built with Node.js, React, MongoDB, Socket.IO, and Yjs CRDT for conflict-free concurrent editing.

## 🚀 Features

### Core Functionality
- **Real-time Collaboration**: Multiple users can edit the same document simultaneously
- **CRDT-based Conflict Resolution**: Uses Yjs for guaranteed eventual consistency
- **Shared Cursors & Selections**: See other users' cursors and selections in real-time
- **Optimistic UI Updates**: Local edits appear instantly with server reconciliation
- **Offline Support**: Queue operations while offline and sync on reconnection

### Persistence & Versioning
- **MongoDB Persistence**: Document snapshots and operation logs
- **Time Travel**: View document state at any point in history
- **Automatic Snapshots**: Periodic snapshots to optimize sync performance
- **Operation Compaction**: Automatic cleanup of old operations

### Security & Access Control
- **JWT Authentication**: Secure token-based authentication
- **Role-based Permissions**: Owner, Editor, and Viewer roles
- **Document ACLs**: Fine-grained access control per document
- **Public/Private Documents**: Share documents publicly or with specific users

### Scalability & Performance
- **WebSocket Transport**: Low-latency bidirectional communication
- **Efficient State Synchronization**: Yjs state vectors for minimal data transfer
- **Backpressure Controls**: Handle high-throughput scenarios
- **Operation Deduplication**: Hash-based duplicate detection

### Observability
- **Structured Logging**: Winston-based logging with correlation IDs
- **Health Endpoints**: Monitor server status and metrics
- **Error Tracking**: Comprehensive error handling and reporting

## 📋 Prerequisites

- **Node.js**: v18 or higher
- **MongoDB**: v5.0 or higher
- **npm** or **yarn**: Package manager

## 🛠️ Installation

### 1. Clone the Repository

```bash
cd collab-editor
```

### 2. Backend Setup

```bash
cd backend
npm install

# Copy environment variables
cp .env.example .env

# Edit .env and configure your settings
# Required: MONGODB_URI, JWT_SECRET
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install

# Copy environment variables
cp .env.example .env

# Edit .env if needed (defaults should work for local development)
```

## 🚀 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
The backend will start on `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
The frontend will start on `http://localhost:5173`

### Production Mode

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## 📐 Architecture

### System Overview

```
┌─────────────┐         WebSocket/HTTP         ┌─────────────┐
│   React     │◄──────────────────────────────►│  Node.js    │
│  Frontend   │                                 │   Backend   │
│             │         Socket.IO               │             │
│  - Yjs      │◄──────────────────────────────►│  - Yjs      │
│  - CodeMirror│                                │  - Express  │
└─────────────┘                                 └──────┬──────┘
                                                       │
                                                       ▼
                                                ┌─────────────┐
                                                │   MongoDB   │
                                                │             │
                                                │ - Documents │
                                                │ - Operations│
                                                └─────────────┘
```

### Backend Architecture

```
backend/
├── src/
│   ├── config/          # Configuration and environment variables
│   │   ├── index.js     # Main config loader
│   │   └── logger.js    # Winston logger setup
│   ├── models/          # MongoDB schemas
│   │   ├── User.js      # User model with authentication
│   │   ├── Document.js  # Document model with ACLs
│   │   └── Operation.js # Operation log for event sourcing
│   ├── controllers/     # Request handlers
│   │   ├── authController.js       # Authentication logic
│   │   └── documentController.js   # Document CRUD
│   ├── middleware/      # Express middleware
│   │   └── auth.js      # JWT authentication
│   ├── services/        # Business logic
│   │   ├── YjsService.js         # Yjs document management
│   │   └── PresenceService.js    # User presence tracking
│   ├── websocket/       # WebSocket handlers
│   │   └── SocketServer.js       # Socket.IO server
│   ├── routes/          # API routes
│   │   └── index.js     # Route definitions
│   └── server.js        # Application entry point
```

### Frontend Architecture

```
frontend/
├── src/
│   ├── components/      # React components
│   │   └── CollaborativeEditor.jsx  # Main editor component
│   ├── pages/           # Page components
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── DashboardPage.jsx
│   │   └── EditorPage.jsx
│   ├── services/        # API and WebSocket services
│   │   ├── api.js       # REST API client
│   │   └── socket.js    # Socket.IO client
│   ├── store/           # State management
│   │   └── useAuthStore.js  # Authentication store
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   └── main.jsx         # Application entry point
```

## 🔐 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepass123",
  "displayName": "John Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepass123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Document Endpoints

#### Create Document
```http
POST /api/documents
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My Document",
  "language": "markdown",
  "isPublic": false
}
```

#### Get All Documents
```http
GET /api/documents?page=1&limit=20
Authorization: Bearer <token>
```

#### Get Document by ID
```http
GET /api/documents/:id
Authorization: Bearer <token>
```

#### Update Document
```http
PUT /api/documents/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "isPublic": true
}
```

#### Delete Document
```http
DELETE /api/documents/:id
Authorization: Bearer <token>
```

#### Share Document
```http
POST /api/documents/:id/share
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user_id_here",
  "role": "editor"
}
```

#### Get Document History (Time Travel)
```http
GET /api/documents/:id/history?timestamp=1699564800000
Authorization: Bearer <token>
```

## 🔌 WebSocket Events

### Client to Server

- **`join-document`**: Join a document room
  ```javascript
  socket.emit('join-document', { documentId });
  ```

- **`leave-document`**: Leave a document room
  ```javascript
  socket.emit('leave-document', { documentId });
  ```

- **`yjs-update`**: Send Yjs update
  ```javascript
  socket.emit('yjs-update', { documentId, update: [1,2,3,...] });
  ```

- **`cursor-update`**: Update cursor position
  ```javascript
  socket.emit('cursor-update', { documentId, cursor: { from: 0, to: 5 } });
  ```

- **`request-sync`**: Request full sync
  ```javascript
  socket.emit('request-sync', { documentId, stateVector: [...] });
  ```

### Server to Client

- **`sync-response`**: Initial sync data
- **`yjs-update`**: Broadcast Yjs update from other users
- **`cursor-update`**: Cursor position updates
- **`user-joined`**: User joined the document
- **`user-left`**: User left the document
- **`error`**: Error message

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
npm run test:watch
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📊 Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  displayName: String,
  avatar: String,
  color: String,
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Document Collection
```javascript
{
  _id: ObjectId,
  title: String,
  slug: String (unique),
  content: String,
  yjsState: Buffer,
  yjsStateVector: Buffer,
  version: Number,
  permissions: [{
    userId: ObjectId,
    role: String (owner|editor|viewer)
  }],
  isPublic: Boolean,
  publicRole: String,
  lastSnapshotAt: Date,
  operationsSinceSnapshot: Number,
  activeUsers: [ObjectId],
  owner: ObjectId,
  language: String,
  isDeleted: Boolean,
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Operation Collection
```javascript
{
  _id: ObjectId,
  documentId: ObjectId,
  userId: ObjectId,
  update: Buffer,
  clock: Number,
  sequenceNumber: Number,
  operationHash: String (unique),
  clientId: String,
  timestamp: Date,
  size: Number,
  isCompacted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
NODE_ENV=development
PORT=3001
HOST=localhost

MONGODB_URI=mongodb://localhost:27017/collab-editor
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

WS_PING_INTERVAL=25000
WS_PING_TIMEOUT=60000

SNAPSHOT_INTERVAL_MS=300000
SNAPSHOT_MIN_OPS=100
OPERATION_RETENTION_DAYS=30

LOG_LEVEL=info
CORS_ORIGIN=http://localhost:5173
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_CURSOR_TRACKING=true
VITE_CURSOR_THROTTLE_MS=50
```

## 🚀 Deployment

### Docker Deployment (Recommended)

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    restart: always
    volumes:
      - mongo-data:/data/db
    ports:
      - "27017:27017"

  backend:
    build: ./backend
    restart: always
    ports:
      - "3001:3001"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/collab-editor
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mongo-data:
```

Run:
```bash
docker-compose up -d
```

### Manual Deployment

1. **Setup MongoDB** (Atlas, EC2, etc.)
2. **Deploy Backend** (Heroku, AWS, DigitalOcean, etc.)
3. **Build and Deploy Frontend** (Vercel, Netlify, S3, etc.)

## 🔍 Key Technical Decisions

### Why Yjs?
- **Strong Eventual Consistency**: Guaranteed convergence across all clients
- **Efficient Synchronization**: Minimal data transfer with state vectors
- **Battle-tested**: Used in production by many companies
- **Framework Agnostic**: Works with any editor (CodeMirror, Monaco, etc.)

### Why Socket.IO?
- **Reliable**: Automatic reconnection and fallback transports
- **Room Support**: Built-in room management for document isolation
- **Battle-tested**: Industry standard for WebSocket communication

### Why MongoDB?
- **Flexible Schema**: Easy to evolve data models
- **Binary Storage**: Efficient storage of Yjs state as Buffer
- **Aggregation**: Powerful queries for analytics
- **Horizontal Scaling**: Sharding support for large deployments

## 📈 Performance Considerations

### Client-Side
- **Optimistic Updates**: Changes appear instantly
- **Throttled Cursor Updates**: Reduce network traffic (50ms)
- **Lazy Loading**: Documents loaded on-demand
- **Efficient Reconciliation**: Yjs handles conflict resolution

### Server-Side
- **Connection Pooling**: MongoDB connection pooling
- **Rate Limiting**: Prevent abuse
- **Operation Batching**: Batch multiple operations
- **Snapshot Strategy**: Balance between storage and sync speed

### Scalability
- **Horizontal Scaling**: Multiple Node.js instances with sticky sessions
- **Redis Adapter**: Socket.IO Redis adapter for multi-server setup
- **CDN**: Serve frontend assets from CDN
- **Database Sharding**: Partition data across multiple MongoDB instances

## 🐛 Troubleshooting

### Connection Issues
- Verify MongoDB is running
- Check firewall rules
- Ensure WebSocket is not blocked by proxy

### Authentication Errors
- Verify JWT_SECRET is set
- Check token expiration
- Clear browser localStorage

### Sync Issues
- Check browser console for errors
- Verify network connectivity
- Check server logs

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open a GitHub issue.
