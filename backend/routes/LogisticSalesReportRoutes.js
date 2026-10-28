import express from 'express';
import {
  getSalesReport,
  createSalesTransaction,
  deleteSalesTransaction,
  getPublicCustomerLeaderboard
} from '../controllers/LogisticSalesReportController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public / Customer accessible leaderboard
router.get('/leaderboard', getPublicCustomerLeaderboard);

router.use(protect, authorize('Admin', 'Logistic'));

router.get('/', getSalesReport);
router.post('/', createSalesTransaction);
router.delete('/:id', deleteSalesTransaction);

export default router;
