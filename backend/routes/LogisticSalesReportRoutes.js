import express from 'express';
import {
  getSalesReport,
  createSalesTransaction,
  deleteSalesTransaction,
  getPublicCustomerLeaderboard
} from '../controllers/LogisticSalesReportController.js';
import { protect, authorize, protectOptional } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public / Customer accessible leaderboard
router.get('/leaderboard', getPublicCustomerLeaderboard);

// Read sales analytics report (protectOptional ensures customer analytics always loads without 401 crash)
router.get('/', protectOptional, getSalesReport);

// Write / Delete transactions (Strict Admin / Logistics protection)
router.post('/', protect, authorize('Admin', 'Logistic', 'Logistics'), createSalesTransaction);
router.delete('/:id', protect, authorize('Admin', 'Logistic', 'Logistics'), deleteSalesTransaction);

export default router;
