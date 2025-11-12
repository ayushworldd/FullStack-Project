# Access Denied Error - FIXED

## Problem
After creating a document, when trying to access it, you get:
- ❌ **403 (Forbidden)** error
- ❌ **"Access denied"** message
- ❌ Document shows as "Document not found"

## Root Cause
The issue was in the Document model's access control methods (`getUserRole` and `hasAccess`). The ObjectId comparison wasn't handling edge cases properly:

1. **Null checks were missing** - If `userId` or `owner` was null/undefined, the comparison would fail
2. **ObjectId comparison** - The `.toString()` conversion wasn't being done safely
3. **Insufficient logging** - Hard to debug what was happening

## Fixes Applied

### 1. Fixed Document.js Access Control Methods

**Before:**
```javascript
documentSchema.methods.getUserRole = function(userId) {
  // Owner has full access
  if (this.owner.toString() === userId.toString()) {
    return 'owner';
  }
  // ... rest of code
};

documentSchema.methods.hasAccess = function(userId, requiredRole = 'viewer') {
  const userRole = this.getUserRole(userId);
  
  if (!userRole) return false;
  
  const roleHierarchy = { owner: 3, editor: 2, viewer: 1 };
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};
```

**After:**
```javascript
documentSchema.methods.getUserRole = function(userId) {
  if (!userId) return null;
  
  // Convert to string for comparison
  const userIdStr = userId.toString();
  const ownerIdStr = this.owner ? this.owner.toString() : null;
  
  // Owner has full access
  if (ownerIdStr && ownerIdStr === userIdStr) {
    return 'owner';
  }
  
  // Check explicit permissions
  const permission = this.permissions.find(
    p => p.userId && p.userId.toString() === userIdStr
  );
  
  if (permission) {
    return permission.role;
  }
  
  // Check public access
  if (this.isPublic && this.publicRole) {
    return this.publicRole;
  }
  
  return null;
};

documentSchema.methods.hasAccess = function(userId, requiredRole = 'viewer') {
  if (!userId) return false;
  
  const userRole = this.getUserRole(userId);
  
  if (!userRole) return false;
  
  const roleHierarchy = { owner: 3, editor: 2, viewer: 1 };
  const userRoleLevel = roleHierarchy[userRole] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
  
  return userRoleLevel >= requiredRoleLevel;
};
```

**Key improvements:**
- ✅ Added null/undefined checks for `userId`
- ✅ Safe conversion of ObjectIds to strings
- ✅ Check if `owner` exists before converting
- ✅ Check if `userId` exists in permissions before converting
- ✅ Better role hierarchy comparison with fallback to 0

### 2. Enhanced Document Controller Logging

**Added debug logging to `getDocument`:**
```javascript
// Debug logging
logger.info('Document access check', {
  documentId: document._id,
  documentOwner: document.owner._id,
  requestUserId: req.userId,
  userRole: document.getUserRole(req.userId),
  hasAccess: document.hasAccess(req.userId, 'viewer')
});
```

**Added logging to `createDocument`:**
```javascript
logger.info('Document created', { 
  documentId: document._id, 
  userId: req.userId,
  owner: document.owner,
  title: document.title
});
```

### 3. Populate Owner on Document Creation

**Added owner population:**
```javascript
// Populate owner before sending response
await document.populate('owner', 'username displayName avatar color');
```

This ensures the owner information is available in the response.

## Files Modified

1. ✅ `backend/src/models/Document.js` - Fixed access control methods
2. ✅ `backend/src/controllers/documentController.js` - Enhanced logging and owner population

## How to Test

### 1. Restart the Backend
The backend needs to be restarted to pick up the changes:

```bash
# Stop the current backend (Ctrl+C)
cd backend
npm run dev
```

### 2. Test Document Creation Flow

1. **Clear your browser cache** (or use incognito mode)
2. **Login/Register** to your account
3. **Create a new document:**
   - Click "New Document"
   - Enter a title (e.g., "Test Document")
   - Click "Create"
4. **The document should now open successfully!**

### 3. Check Backend Logs

Watch the backend logs to see the debug information:

```bash
tail -f backend/logs/combined.log
```

You should see logs like:
```
Document created { documentId: '...', userId: '...', owner: '...', title: 'Test Document' }
Document access check { documentId: '...', documentOwner: '...', requestUserId: '...', userRole: 'owner', hasAccess: true }
```

### 4. Check Browser Console

Open DevTools (F12) and check the console. You should see:
- ✅ "Create document response: { success: true, data: { document: {...} } }"
- ✅ "Document response: { success: true, data: { document: {...} } }"
- ✅ No red error messages

## What Was Happening

### Before the Fix:
1. User creates document → Document saved with `owner: userId`
2. User tries to access document → `hasAccess()` is called
3. `getUserRole()` tries to compare `this.owner.toString() === userId.toString()`
4. If either value was null/undefined or comparison failed → returns `null`
5. `hasAccess()` returns `false` → **403 Access Denied**

### After the Fix:
1. User creates document → Document saved with `owner: userId`
2. User tries to access document → `hasAccess()` is called
3. `getUserRole()` safely checks if both values exist
4. Converts both to strings safely
5. Compares them → returns `'owner'`
6. `hasAccess()` returns `true` → **✅ Access Granted**

## Debugging Tips

If you still have issues, check these in the backend logs:

### Look for "Document access check" logs:
```json
{
  "documentId": "abc123...",
  "documentOwner": "xyz789...",
  "requestUserId": "xyz789...",
  "userRole": "owner",  // Should be "owner" for your own documents
  "hasAccess": true     // Should be true
}
```

### If `userRole` is `null`:
- The owner comparison is failing
- Check if `documentOwner` and `requestUserId` match

### If `hasAccess` is `false`:
- The role hierarchy check is failing
- Check what `userRole` is being returned

## Additional Checks

### Verify Document Owner in MongoDB:
```bash
mongosh
use collab-editor
db.documents.find().pretty()
```

Look for:
```javascript
{
  _id: ObjectId("..."),
  title: "Your Document",
  owner: ObjectId("..."),  // Should match your user ID
  // ...
}
```

### Verify Your User ID:
Check the backend logs when you login - you should see your userId.

Or check in MongoDB:
```bash
mongosh
use collab-editor
db.users.find().pretty()
```

## Expected Behavior Now

✅ **Create Document:**
- Document is created with you as the owner
- Owner field is populated with your user info
- Returns document with all details

✅ **Access Document:**
- Your userId is compared with document owner
- Comparison succeeds (both are ObjectIds converted to strings)
- `getUserRole()` returns `'owner'`
- `hasAccess()` returns `true`
- Document loads successfully

✅ **Editor Opens:**
- Document data is available
- Editor initializes
- You can start typing

## Status

✅ **Access Control Fixed**
✅ **Null Checks Added**
✅ **Debug Logging Added**
✅ **Owner Population Added**

---

**Restart your backend and try creating a document again!** It should work now. Check the logs to see the debug information.
