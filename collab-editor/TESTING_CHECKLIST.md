# Testing Checklist - Collaborative Editor

## ✅ Pre-Testing Setup

### 1. Backend Running
```bash
cd backend
npm run dev
```

**Check for:**
- ✅ "Server started" message
- ✅ "MongoDB connected" message
- ✅ "WebSocket server initialized" message
- ✅ No error messages

### 2. Frontend Running
```bash
cd frontend
npm run dev
```

**Check for:**
- ✅ "VITE ... ready" message
- ✅ "Local: http://localhost:5173/" shown
- ✅ No error messages

### 3. MongoDB Running
```bash
pgrep mongod
```

**Should return:** A process ID number

---

## 🧪 Testing Flow

### Step 1: Open Browser
1. Open http://localhost:5173
2. Open DevTools (F12)
3. Go to Console tab

### Step 2: Register/Login
1. Click "Register" (or "Login" if you already have an account)
2. Fill in the form
3. Click submit

**Expected:**
- ✅ Redirects to dashboard
- ✅ No errors in console
- ✅ See "Welcome, [your name]" in header

**If errors:**
- Check backend logs for authentication errors
- Check browser console for API errors
- Verify token is saved: `localStorage.getItem('token')`

### Step 3: Create Document
1. Click "New Document" button
2. Enter a title (e.g., "Test Doc")
3. Click "Create"

**Expected:**
- ✅ Redirects to editor page
- ✅ Editor loads with your document
- ✅ Can see document title in header
- ✅ Can start typing

**Check Browser Console:**
Should see logs like:
```
Create document response: { success: true, data: { document: {...} } }
Document response: { success: true, data: { document: {...} } }
```

**Check Backend Logs:**
Should see logs like:
```
Document created { documentId: '...', userId: '...', owner: '...', title: 'Test Doc' }
Document access check { ..., userRole: 'owner', hasAccess: true }
```

**If "Document not found" error:**
- Check browser console for the document ID
- Check backend logs for "Document not found" or "Access denied"
- Verify the document was created in MongoDB

**If "Access denied" error:**
- Check backend logs for "Document access check"
- Look at `userRole` - should be `'owner'`
- Look at `hasAccess` - should be `true`
- Compare `documentOwner` and `requestUserId` - should match

### Step 4: Test Editing
1. Type some text in the editor
2. Wait a moment

**Expected:**
- ✅ Text appears as you type
- ✅ No errors in console
- ✅ Backend logs show WebSocket activity

### Step 5: Test Collaboration (Optional)
1. Copy the document URL
2. Open a new incognito/private window
3. Register/login with a different account
4. Paste the document URL (or share the document first)
5. Type in both windows

**Expected:**
- ✅ Changes appear in both windows in real-time
- ✅ See colored cursors for each user
- ✅ See user avatars in the "Online" section

---

## 🐛 Common Issues & Solutions

### Issue: "Document not found"

**Check:**
1. Browser console - what's the document ID?
2. Backend logs - was the document created?
3. MongoDB - does the document exist?

**Solution:**
```bash
# Check MongoDB
mongosh
use collab-editor
db.documents.find().pretty()
```

Look for your document. If it exists, check the `_id` matches the URL.

### Issue: "Access denied"

**Check:**
1. Backend logs for "Document access check"
2. Compare `documentOwner` and `requestUserId`
3. Check `userRole` and `hasAccess` values

**Solution:**
- If IDs don't match: The document owner is different from logged-in user
- If `userRole` is null: Access control method is failing
- If `hasAccess` is false: Role hierarchy check is failing

### Issue: "WebSocket disconnected"

**Check:**
1. Backend is running
2. WebSocket URL is correct in `.env`
3. No firewall blocking WebSocket

**Solution:**
```bash
# Check backend .env
cat backend/.env | grep WS

# Should show WebSocket config
```

### Issue: Editor not loading

**Check:**
1. Browser console for errors
2. CodeMirror imports are correct
3. Yjs is initializing

**Solution:**
- Check for import errors in console
- Verify all CodeMirror packages are installed
- Check WebSocket connection

### Issue: Changes not syncing

**Check:**
1. WebSocket is connected
2. Backend logs show "yjs-update" events
3. Multiple users are in the same document

**Solution:**
- Check browser console for WebSocket status
- Verify document IDs match
- Check backend logs for sync events

---

## 📊 What to Look For

### Browser Console (F12)
**Good signs:**
```
✅ WebSocket connected
✅ Create document response: { success: true, ... }
✅ Document response: { success: true, ... }
✅ No red error messages
```

**Bad signs:**
```
❌ Failed to load document
❌ Access denied
❌ WebSocket disconnected
❌ 403 Forbidden
❌ 404 Not Found
```

### Backend Logs
**Good signs:**
```
✅ Server started
✅ MongoDB connected
✅ Document created
✅ Document access check { ..., hasAccess: true }
✅ Client connected (WebSocket)
```

**Bad signs:**
```
❌ MongoDB connection failed
❌ Access denied to document
❌ Document not found
❌ Authentication error
```

### Network Tab (F12 → Network)
**Check:**
1. POST `/api/documents` - Should return 201 with document data
2. GET `/api/documents/:id` - Should return 200 with document data
3. WebSocket connection - Should show "101 Switching Protocols"

---

## 🔍 Debugging Commands

### Check MongoDB Documents
```bash
mongosh
use collab-editor
db.documents.find().pretty()
```

### Check Users
```bash
mongosh
use collab-editor
db.users.find().pretty()
```

### Check Backend Logs
```bash
tail -f backend/logs/combined.log
```

### Check Frontend Build
```bash
cd frontend
npm run build
```

Should complete without errors.

### Check Backend Tests
```bash
cd backend
npm test
```

---

## ✅ Success Criteria

You know everything is working when:

1. ✅ Can register/login without errors
2. ✅ Can create documents
3. ✅ Documents open in the editor
4. ✅ Can type and see changes
5. ✅ WebSocket shows "connected"
6. ✅ No errors in browser console
7. ✅ No errors in backend logs
8. ✅ Multiple users can edit simultaneously (if testing collaboration)

---

## 📝 Report Template

If you're still having issues, provide this information:

**Browser Console:**
```
[Paste any error messages here]
```

**Backend Logs:**
```
[Paste relevant log entries here]
```

**What I did:**
1. [Step 1]
2. [Step 2]
3. [Error occurred]

**What I expected:**
[What should have happened]

**What actually happened:**
[What actually happened]

**Screenshots:**
[If applicable]

---

This will help identify exactly where the issue is!
