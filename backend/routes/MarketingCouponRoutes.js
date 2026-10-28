import express from 'express';
import {
  getCoupons,
  createCoupon,
  updateCouponStatus,
  deleteCoupon,
  validateCoupon,
} from '../controllers/MarketingCouponController.js';

const router = express.Router();

router.get('/', getCoupons);
router.post('/validate', validateCoupon);
router.post('/', createCoupon);
router.patch('/:id/status', updateCouponStatus);
router.delete('/:id', deleteCoupon);

export default router;
