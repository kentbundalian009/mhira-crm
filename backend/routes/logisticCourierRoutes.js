import express from 'express';
import {
  getCouriers,
  createCourier,
  updateCourier,
  deleteCourier,
  toggleArchiveCourier,
} from '../controllers/LogisticCourierController.js';

const router = express.Router();

router.route('/')
  .get(getCouriers)
  .post(createCourier);

router.route('/:id')
  .put(updateCourier)
  .delete(deleteCourier);

router.patch('/:id/archive', toggleArchiveCourier);

export default router;
