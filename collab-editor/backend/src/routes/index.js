import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';
import * as documentController from '../controllers/documentController.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Auth routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authenticate, authController.logout);
router.get('/auth/me', authenticate, authController.me);

// Document routes
router.post('/documents', authenticate, documentController.createDocument);
router.get('/documents', authenticate, documentController.getDocuments);
router.get('/documents/:id', authenticate, documentController.getDocument);
router.put('/documents/:id', authenticate, documentController.updateDocument);
router.delete('/documents/:id', authenticate, documentController.deleteDocument);
router.post('/documents/:id/share', authenticate, documentController.shareDocument);
router.get('/documents/:id/history', authenticate, documentController.getDocumentAtTime);

export default router;
