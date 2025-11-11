# Setup Guide - Real-Time Collaborative Editor

This guide will help you set up and run the collaborative editor on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher): [Download here](https://nodejs.org/)
- **MongoDB** (v5.0 or higher): [Download here](https://www.mongodb.com/try/download/community)
- **npm** (comes with Node.js)

## Step-by-Step Setup

### 1. Start MongoDB

First, ensure MongoDB is running on your machine.

**MacOS (if installed via Homebrew):**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

**Windows:**
```bash
net start MongoDB
```

**Or run MongoDB manually:**
```bash
mongod --dbpath /path/to/data/directory
```

Verify MongoDB is running:
```bash
mongosh
# Should connect to MongoDB shell
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

This will install all required packages including:
- Express (web framework)
- Socket.IO (WebSocket communication)
- Mongoose (MongoDB ODM)
- Yjs (CRDT for collaboration)
- JWT for authentication
- Winston for logging

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

This will install:
- React (UI framework)
- Vite (build tool)
- CodeMirror (text editor)
- Yjs (CRDT)
- Socket.IO client
- Tailwind CSS
- Zustand (state management)

### 4. Start the Backend Server

Open a new terminal window:

```bash
cd backend
npm run dev
```

You should see output like:
```
Server started { host: 'localhost', port: 3001, env: 'development' }
MongoDB connected
WebSocket server initialized
```

The backend API is now running at: `http://localhost:3001`

### 5. Start the Frontend Development Server

Open another terminal window:

```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.0.11  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

The frontend is now running at: `http://localhost:5173`

### 6. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

## First Time Usage

### 1. Create an Account

1. Click on "Don't have an account? Register"
2. Fill in the registration form:
   - Username (3-30 characters)
   - Email (valid email address)
   - Display Name (optional)
   - Password (minimum 6 characters)
3. Click "Create Account"

You'll be automatically logged in and redirected to the dashboard.

### 2. Create Your First Document

1. On the dashboard, click the "New Document" button
2. Enter a document title
3. Click "Create"

You'll be redirected to the editor with your new document.

### 3. Test Collaboration

To test real-time collaboration:

1. Open the same document in multiple browser windows or tabs
2. Log in with different accounts (or use private/incognito windows)
3. Start typing in one window
4. You should see the changes appear instantly in other windows
5. Notice the colored cursors showing where other users are typing

## Troubleshooting

### Backend won't start

**Error: MongoDB connection failed**
- Ensure MongoDB is running: `mongosh` should connect successfully
- Check the MongoDB URI in `backend/.env`
- Default: `mongodb://localhost:27017/collab-editor`

**Error: Port 3001 already in use**
- Change the PORT in `backend/.env` to another port (e.g., 3002)
- Update `VITE_API_URL` and `VITE_WS_URL` in `frontend/.env` accordingly

**Error: JWT_SECRET not set**
- The .env file should already have a JWT_SECRET
- For production, generate a strong random secret:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

### Frontend won't start

**Error: Port 5173 already in use**
- Vite will automatically try the next available port
- Or manually change it in `vite.config.js`

**Error: Cannot connect to backend**
- Ensure the backend is running on port 3001
- Check browser console for CORS errors
- Verify `VITE_API_URL` in `frontend/.env` matches your backend URL

### WebSocket connection issues

**Error: WebSocket connection failed**
- Check that Socket.IO is working: backend logs should show "Client connected"
- Verify firewall isn't blocking WebSocket connections
- Check `VITE_WS_URL` in `frontend/.env`

### MongoDB issues

**Error: Authentication failed**
- If you set up MongoDB with authentication, update the URI:
  ```
  MONGODB_URI=mongodb://username:password@localhost:27017/collab-editor
  ```

**Error: Database not found**
- MongoDB creates the database automatically on first write
- You don't need to manually create it

## Testing the System

### Backend Health Check

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Test Authentication

Register a user:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User"
  }'
```

### Test WebSocket Connection

Open browser console and run:
```javascript
const socket = io('http://localhost:3001', {
  auth: { token: 'your-jwt-token-here' }
});

socket.on('connect', () => {
  console.log('Connected!', socket.id);
});
```

## Development Tips

### Hot Reload

Both backend and frontend support hot reload:

- **Backend**: Uses `nodemon` - changes to `.js` files automatically restart the server
- **Frontend**: Uses Vite HMR - changes appear instantly without full page reload

### Viewing Logs

Backend logs are saved to:
- `backend/logs/combined.log` - All logs
- `backend/logs/error.log` - Error logs only
- `backend/logs/exceptions.log` - Uncaught exceptions

View logs in real-time:
```bash
tail -f backend/logs/combined.log
```

### Database Inspection

View data in MongoDB:
```bash
mongosh
use collab-editor
db.users.find().pretty()
db.documents.find().pretty()
db.operations.find().limit(10).pretty()
```

### Clear Database (Development Only)

```bash
mongosh
use collab-editor
db.dropDatabase()
```

## Production Deployment

For production deployment, see:
- [README.md](./README.md) - Full documentation
- [Deployment section](./README.md#-deployment) - Deployment guide

## Environment Variables Summary

### Backend (.env)
```env
# Required
MONGODB_URI=mongodb://localhost:27017/collab-editor
JWT_SECRET=<your-secret-key>

# Optional (have defaults)
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)
```env
# Required
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## Next Steps

1. ✅ System is running
2. ✅ You've created an account
3. ✅ You've created a document
4. 📝 Try collaborating with multiple users
5. 🔍 Explore the codebase
6. 🚀 Customize and extend the features

## Getting Help

If you encounter issues:

1. Check the logs (backend console and browser console)
2. Review the [Troubleshooting section](./README.md#-troubleshooting) in README
3. Ensure all prerequisites are correctly installed
4. Verify environment variables are set correctly

## Quick Commands Reference

```bash
# Start MongoDB
brew services start mongodb-community  # MacOS

# Backend
cd backend
npm install          # Install dependencies
npm run dev          # Development mode with hot reload
npm start            # Production mode
npm test             # Run tests

# Frontend
cd frontend
npm install          # Install dependencies
npm run dev          # Development mode
npm run build        # Build for production
npm run preview      # Preview production build

# Check MongoDB
mongosh              # Connect to MongoDB shell
```

Happy coding! 🎉
