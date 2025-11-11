import Document from '../models/Document.js';
import YjsService from '../services/YjsService.js';
import logger from '../config/logger.js';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

// Validation schemas
const createDocumentSchema = Joi.object({
  title: Joi.string().max(200).required(),
  content: Joi.string().optional(),
  language: Joi.string().valid('plaintext', 'markdown', 'javascript', 'typescript', 'python', 'html', 'css').optional(),
  isPublic: Joi.boolean().optional(),
  publicRole: Joi.string().valid('viewer', 'editor', null).optional()
});

const updateDocumentSchema = Joi.object({
  title: Joi.string().max(200).optional(),
  language: Joi.string().valid('plaintext', 'markdown', 'javascript', 'typescript', 'python', 'html', 'css').optional(),
  isPublic: Joi.boolean().optional(),
  publicRole: Joi.string().valid('viewer', 'editor', null).optional()
});

const shareSchema = Joi.object({
  userId: Joi.string().required(),
  role: Joi.string().valid('editor', 'viewer').required()
});

/**
 * Create new document
 */
export const createDocument = async (req, res) => {
  try {
    const { error } = createDocumentSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { title, content = '', language = 'plaintext', isPublic = false, publicRole = null } = req.body;

    // Generate unique slug
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${uuidv4().slice(0, 8)}`;

    // Create document
    const document = new Document({
      title,
      slug,
      content,
      language,
      owner: req.userId,
      isPublic,
      publicRole,
      permissions: []
    });

    await document.save();

    logger.info('Document created', { documentId: document._id, userId: req.userId });

    res.status(201).json({
      success: true,
      data: { document }
    });
  } catch (error) {
    logger.error('Failed to create document', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to create document'
    });
  }
};

/**
 * Get user's documents
 */
export const getDocuments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const documents = await Document.find({
      $or: [
        { owner: req.userId },
        { 'permissions.userId': req.userId },
        { isPublic: true }
      ],
      isDeleted: false
    })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('owner', 'username displayName avatar')
      .populate('activeUsers', 'username displayName avatar color');

    const total = await Document.countDocuments({
      $or: [
        { owner: req.userId },
        { 'permissions.userId': req.userId },
        { isPublic: true }
      ],
      isDeleted: false
    });

    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get documents', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get documents'
    });
  }
};

/**
 * Get document by ID or slug
 */
export const getDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await Document.findOne({
      $or: [{ _id: id }, { slug: id }],
      isDeleted: false
    })
      .populate('owner', 'username displayName avatar')
      .populate('activeUsers', 'username displayName avatar color');

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    if (!document.hasAccess(req.userId, 'viewer')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        document,
        userRole: document.getUserRole(req.userId)
      }
    });
  } catch (error) {
    logger.error('Failed to get document', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get document'
    });
  }
};

/**
 * Update document
 */
export const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = updateDocumentSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    if (!document.hasAccess(req.userId, 'owner')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const { title, language, isPublic, publicRole } = req.body;

    if (title) document.title = title;
    if (language) document.language = language;
    if (typeof isPublic !== 'undefined') document.isPublic = isPublic;
    if (typeof publicRole !== 'undefined') document.publicRole = publicRole;

    await document.save();

    logger.info('Document updated', { documentId: document._id, userId: req.userId });

    res.json({
      success: true,
      data: { document }
    });
  } catch (error) {
    logger.error('Failed to update document', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update document'
    });
  }
};

/**
 * Delete document (soft delete)
 */
export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    if (!document.hasAccess(req.userId, 'owner')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    document.isDeleted = true;
    document.deletedAt = new Date();
    await document.save();

    logger.info('Document deleted', { documentId: document._id, userId: req.userId });

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete document', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to delete document'
    });
  }
};

/**
 * Share document with user
 */
export const shareDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = shareSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { userId, role } = req.body;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    if (!document.hasAccess(req.userId, 'owner')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check if permission already exists
    const existingPermission = document.permissions.find(
      p => p.userId.toString() === userId
    );

    if (existingPermission) {
      existingPermission.role = role;
    } else {
      document.permissions.push({ userId, role });
    }

    await document.save();

    logger.info('Document shared', { documentId: document._id, sharedWith: userId, role });

    res.json({
      success: true,
      message: 'Document shared successfully'
    });
  } catch (error) {
    logger.error('Failed to share document', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to share document'
    });
  }
};

/**
 * Get document content at specific time (time travel)
 */
export const getDocumentAtTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { timestamp } = req.query;

    if (!timestamp) {
      return res.status(400).json({
        success: false,
        error: 'Timestamp is required'
      });
    }

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    if (!document.hasAccess(req.userId, 'viewer')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const targetTime = new Date(parseInt(timestamp));
    const result = await YjsService.getStateAtTime(id, targetTime);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Time travel failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get document at time'
    });
  }
};
