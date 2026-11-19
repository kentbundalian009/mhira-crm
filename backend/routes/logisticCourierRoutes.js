import express from 'express';
import {
  getCouriers,
  createCourier,
  updateCourier,
  deleteCourier,
  toggleArchiveCourier,
} from '../controllers/LogisticCourierController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getCouriers)
  .post(protect, createCourier);

router.route('/:id')
  .put(protect, updateCourier)
  .delete(protect, deleteCourier);

router.patch('/:id/archive', protect, toggleArchiveCourier);

export default router;
