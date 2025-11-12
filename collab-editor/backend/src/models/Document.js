import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'editor', 'viewer'],
    default: 'viewer'
  }
}, { _id: false });

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  content: {
    type: String,
    default: ''
  },
  // Yjs state snapshot
  yjsState: {
    type: Buffer,
    default: null
  },
  // Yjs state vector for efficient syncing
  yjsStateVector: {
    type: Buffer,
    default: null
  },
  // Document version for conflict detection
  version: {
    type: Number,
    default: 0
  },
  // Access control list
  permissions: [permissionSchema],
  // Public access settings
  isPublic: {
    type: Boolean,
    default: false
  },
  publicRole: {
    type: String,
    enum: ['viewer', 'editor', null],
    default: null
  },
  // Snapshot metadata
  lastSnapshotAt: {
    type: Date,
    default: null
  },
  operationsSinceSnapshot: {
    type: Number,
    default: 0
  },
  // Active users tracking
  activeUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Metadata
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  language: {
    type: String,
    enum: ['plaintext', 'markdown', 'javascript', 'typescript', 'python', 'html', 'css'],
    default: 'plaintext'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
documentSchema.index({ slug: 1 }, { unique: true });
documentSchema.index({ owner: 1, isDeleted: 1 });
documentSchema.index({ 'permissions.userId': 1, isDeleted: 1 });
documentSchema.index({ isPublic: 1, isDeleted: 1 });
documentSchema.index({ updatedAt: -1 });

// Method to check user permission
documentSchema.methods.getUserRole = function(userId) {
  if (!userId) {
    return null;
  }
  
  // Convert to string for comparison
  const userIdStr = userId.toString();
  
  // Handle both populated and non-populated owner
  // If owner is populated, it's an object with _id, otherwise it's just the ObjectId
  let ownerIdStr = null;
  if (this.owner) {
    if (this.owner._id) {
      // Owner is populated (it's a User object)
      ownerIdStr = this.owner._id.toString();
    } else {
      // Owner is not populated (it's just an ObjectId)
      ownerIdStr = this.owner.toString();
    }
  }
  
  // Owner has full access
  if (ownerIdStr && ownerIdStr === userIdStr) {
    return 'owner';
  }
  
  // Check explicit permissions
  const permission = this.permissions.find(p => {
    if (!p.userId) return false;
    
    // Handle populated userId in permissions
    const permUserId = p.userId._id ? p.userId._id.toString() : p.userId.toString();
    return permUserId === userIdStr;
  });
  
  if (permission) {
    return permission.role;
  }
  
  // Check public access
  if (this.isPublic && this.publicRole) {
    return this.publicRole;
  }
  
  return null;
};

// Method to check if user has access
documentSchema.methods.hasAccess = function(userId, requiredRole = 'viewer') {
  if (!userId) return false;
  
  const userRole = this.getUserRole(userId);
  
  if (!userRole) return false;
  
  const roleHierarchy = { owner: 3, editor: 2, viewer: 1 };
  const userRoleLevel = roleHierarchy[userRole] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
  
  return userRoleLevel >= requiredRoleLevel;
};

export default mongoose.model('Document', documentSchema);
