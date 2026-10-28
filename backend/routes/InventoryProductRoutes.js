import express from 'express';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleArchiveProduct,
} from '../controllers/InventoryProductController.js';

const router = express.Router();

// Route mapping
router.get('/', getProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.patch('/:id/archive', toggleArchiveProduct);

export default router;