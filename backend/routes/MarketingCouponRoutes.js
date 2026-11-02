import express from 'express';
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  updateCouponStatus,
  deleteCoupon,
  validateCoupon,
} from '../controllers/MarketingCouponController.js';

const router = express.Router();

router.get('/', getCoupons);
router.post('/validate', validateCoupon);
router.post('/', createCoupon);
router.put('/:id', updateCoupon);
router.patch('/:id', updateCoupon);
router.patch('/:id/status', updateCouponStatus);
router.delete('/:id', deleteCoupon);

export default router;
