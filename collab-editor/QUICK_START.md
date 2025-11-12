# Quick Start Guide

## ✅ All Issues Fixed!
The CodeMirror import error has been resolved. The project is now ready to run!

## 🚀 Start the Application (3 Simple Steps)

### Step 1: Ensure MongoDB is Running
```bash
# Check if MongoDB is running
pgrep mongod

# If not running, start it:
brew services start mongodb-community
```

### Step 2: Start the Application
Choose one method:

**Method A - Automatic (Easiest):**
```bash
./start-dev.sh
```

**Method B - Manual (Better for debugging):**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

### Step 3: Open Your Browser
```
http://localhost:5173
```

## 📝 First Time Usage

1. **Register**: Click "Register" and create an account
2. **Create Document**: Click "New Document" on the dashboard
3. **Start Typing**: Your changes sync in real-time!

## 🧪 Test Collaboration

1. Open the same document in 2+ browser windows
2. Log in with different accounts (or use incognito mode)
3. Type in one window - see it appear instantly in others!
4. Notice the colored cursors showing where others are typing

## 🔗 Important URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## 📊 Project Info

- **Backend**: Node.js + Express + Socket.IO + MongoDB
- **Frontend**: React + Vite + CodeMirror + Tailwind CSS
- **Real-time**: Yjs CRDT for conflict-free collaboration

## 🛠️ Useful Commands

```bash
# Backend
cd backend
npm run dev          # Development mode with hot reload
npm start            # Production mode
npm test             # Run tests

# Frontend
cd frontend
npm run dev          # Development mode
npm run build        # Build for production
npm run preview      # Preview production build

# MongoDB
brew services start mongodb-community    # Start MongoDB
brew services stop mongodb-community     # Stop MongoDB
mongosh                                  # MongoDB shell
```

## 🐛 Common Issues

**MongoDB not running?**
```bash
brew services start mongodb-community
```

**Port already in use?**
- Backend: Change `PORT` in `backend/.env`
- Frontend: Vite will auto-select next port

**Dependencies missing?**
```bash
cd backend && npm install
cd frontend && npm install
```

## 📚 More Information

- Full documentation: `README.md`
- Setup guide: `SETUP.md`
- Project status: `PROJECT_STATUS.md`

---

**That's it! You're ready to collaborate in real-time!** 🎉
