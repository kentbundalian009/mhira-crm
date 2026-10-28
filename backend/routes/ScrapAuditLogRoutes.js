import express from 'express';
import {
  getScrapAuditLogs,
  createScrapAuditLog,
} from '../controllers/ScrapAuditLogController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorize('Admin', 'Logistic'));

router.get('/', getScrapAuditLogs);
router.post('/', createScrapAuditLog);

export default router;
