import express from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Admin-only audit query endpoint
router.get('/', authMiddleware, adminMiddleware, getAuditLogs);

export default router;
