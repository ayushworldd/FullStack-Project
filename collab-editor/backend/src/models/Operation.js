import mongoose from 'mongoose';

const operationSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Yjs update/operation data
  update: {
    type: Buffer,
    required: true
  },
  // Vector clock or Lamport timestamp for ordering
  clock: {
    type: Number,
    required: true
  },
  // Operation sequence number within document
  sequenceNumber: {
    type: Number,
    required: true
  },
  // Hash for duplicate detection
  operationHash: {
    type: String,
    required: true
  },
  // Metadata for debugging and observability
  clientId: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  // Size in bytes for monitoring
  size: {
    type: Number,
    required: true
  },
  // Flag for compacted operations
  isCompacted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
operationSchema.index({ documentId: 1, clock: 1 });
operationSchema.index({ documentId: 1, sequenceNumber: 1 });
operationSchema.index({ documentId: 1, timestamp: 1 });
operationSchema.index({ operationHash: 1 }, { unique: true });

// TTL index for automatic cleanup (30 days)
operationSchema.index(
  { timestamp: 1 }, 
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

// Static method to get operations for a document after a specific clock
operationSchema.statics.getOperationsSince = function(documentId, sinceClock) {
  return this.find({
    documentId,
    clock: { $gt: sinceClock }
  }).sort({ clock: 1 });
};

// Static method to get operations in a time range (for time travel)
operationSchema.statics.getOperationsInTimeRange = function(documentId, startTime, endTime) {
  return this.find({
    documentId,
    timestamp: { $gte: startTime, $lte: endTime }
  }).sort({ clock: 1 });
};

// Static method to check for duplicate operation
operationSchema.statics.isDuplicate = async function(operationHash) {
  const count = await this.countDocuments({ operationHash });
  return count > 0;
};

export default mongoose.model('Operation', operationSchema);
