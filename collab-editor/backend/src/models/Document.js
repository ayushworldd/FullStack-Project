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
    unique: true,
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
documentSchema.index({ slug: 1 });
documentSchema.index({ owner: 1, isDeleted: 1 });
documentSchema.index({ 'permissions.userId': 1, isDeleted: 1 });
documentSchema.index({ isPublic: 1, isDeleted: 1 });
documentSchema.index({ updatedAt: -1 });

// Method to check user permission
documentSchema.methods.getUserRole = function(userId) {
  // Owner has full access
  if (this.owner.toString() === userId.toString()) {
    return 'owner';
  }
  
  // Check explicit permissions
  const permission = this.permissions.find(
    p => p.userId.toString() === userId.toString()
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

// Method to check if user has access
documentSchema.methods.hasAccess = function(userId, requiredRole = 'viewer') {
  const userRole = this.getUserRole(userId);
  
  if (!userRole) return false;
  
  const roleHierarchy = { owner: 3, editor: 2, viewer: 1 };
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

export default mongoose.model('Document', documentSchema);
