import express from 'express';
import {
  getShippingSettings,
  updateShippingSettings,
  calculateShippingFee,
  getProductsShipping,
  updateProductShipping,
  bulkUpdateProductShipping,
} from '../controllers/LogisticsShippingController.js';

const router = express.Router();

// General & calculation routes
router.get('/', getShippingSettings);
router.put('/', updateShippingSettings);
router.post('/calculate', calculateShippingFee);

// Product-specific shipping routes
router.get('/products', getProductsShipping);
router.put('/products/bulk', bulkUpdateProductShipping);
router.put('/products/:id', updateProductShipping);

export default router;
