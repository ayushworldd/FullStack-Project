# WebSocket Disconnection Fix

## Problem
WebSocket shows "disconnected" in the browser console.

## Quick Fix

### Step 1: Make Sure Backend is Running

In your backend terminal, you should see:
```
Server started { host: 'localhost', port: 3001, ... }
MongoDB connected
WebSocket server initialized
```

If you don't see this, the backend is not running!

**Start it:**
```bash
cd backend
npm run dev
```

### Step 2: Check Browser Console

Open DevTools (F12) and look for:
```
[Socket] Connecting to: ws://localhost:3001
[Socket] With token: present
[Socket] WebSocket connected, ID: ...
```

If you see:
```
[Socket] Connection error: ...
```

This tells you what's wrong!

### Step 3: Common Issues

#### Issue: "Connection error: Authentication required"
**Problem:** No token or invalid token

**Fix:**
1. Clear localStorage: `localStorage.clear(); location.reload();`
2. Login again
3. Try creating a document

#### Issue: "Connection error: xhr poll error"
**Problem:** Backend is not running or not accessible

**Fix:**
1. Check backend terminal - is it running?
2. Check the URL in `.env`: `VITE_WS_URL=ws://localhost:3001`
3. Restart backend

#### Issue: Connects then immediately disconnects
**Problem:** Authentication failing after connection

**Fix:**
1. Check backend logs for "Socket authentication failed"
2. Make sure JWT_SECRET is the same in backend `.env`
3. Clear browser data and login again

---

## Detailed Debugging

### Check 1: Backend Logs

When a client connects, you should see in backend logs:
```
Client connected { userId: '...', socketId: '...' }
```

If you see:
```
Socket authentication failed
```

The token is invalid or expired.

### Check 2: Browser Console

Look for these messages:
```
✅ [Socket] Connecting to: ws://localhost:3001
✅ [Socket] With token: present
✅ [Socket] WebSocket connected, ID: abc123
```

If you see:
```
❌ [Socket] Connection error: ...
❌ [Socket] WebSocket disconnected, reason: ...
```

The error message tells you what's wrong.

### Check 3: Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "WS" (WebSocket)
4. Look for connection to `localhost:3001`
5. Check the status:
   - ✅ 101 Switching Protocols = Good
   - ❌ 401 Unauthorized = Bad token
   - ❌ Failed = Backend not running

---

## Step-by-Step Fix

### 1. Stop Everything

```bash
# Kill any processes on port 3001
lsof -ti:3001 | xargs kill -9

# Kill any processes on port 5173
lsof -ti:5173 | xargs kill -9
```

### 2. Start Backend

```bash
cd backend
npm run dev
```

Wait for:
```
✅ Server started
✅ MongoDB connected
✅ WebSocket server initialized
```

### 3. Start Frontend

Open a NEW terminal:
```bash
cd frontend
npm run dev
```

Wait for:
```
✅ VITE ... ready
✅ Local: http://localhost:5173/
```

### 4. Clear Browser Data

1. Open http://localhost:5173
2. Press F12
3. Console tab
4. Run: `localStorage.clear(); location.reload();`

### 5. Login

1. Register or login
2. Check console for:
   ```
   [Socket] WebSocket connected, ID: ...
   ```

### 6. Create Document

1. Click "New Document"
2. Enter title
3. Click "Create"
4. Editor should load!

---

## What to Look For

### Good Signs ✅
```
[Socket] Connecting to: ws://localhost:3001
[Socket] With token: present
[Socket] WebSocket connected, ID: abc123
[Editor] Socket connected: true
[Editor] Joining document room...
[Editor] Joined document, sync data: {...}
```

### Bad Signs ❌
```
[Socket] Connection error: Authentication required
[Socket] WebSocket disconnected, reason: io server disconnect
[Editor] Socket not connected
```

---

## Environment Variables

### Backend `.env`
```env
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-in-production-please-use-a-long-random-string
CORS_ORIGIN=http://localhost:5173
WS_PING_INTERVAL=25000
WS_PING_TIMEOUT=60000
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

**Make sure these match!**

---

## Still Not Working?

### Check Backend Logs

```bash
tail -f backend/logs/combined.log
```

Look for:
- "Client connected" = Good
- "Socket authentication failed" = Bad token
- "Authentication required" = No token

### Check MongoDB

```bash
pgrep mongod
```

Should return a process ID. If not:
```bash
brew services start mongodb-community
```

### Check Ports

```bash
# Backend should be on 3001
lsof -ti:3001

# Frontend should be on 5173
lsof -ti:5173
```

Both should return process IDs.

---

## Summary

The WebSocket disconnection is usually caused by:

1. **Backend not running** - Start it!
2. **Invalid/missing token** - Clear localStorage and login again
3. **Wrong URL** - Check `.env` files match
4. **Port conflict** - Kill old processes and restart

Follow the "Step-by-Step Fix" above and it should work!

---

**After following these steps, the WebSocket should connect and stay connected!** 🚀
