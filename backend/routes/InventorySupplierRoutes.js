import express from 'express';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  toggleArchiveSupplier,
} from '../controllers/InventorySupplierController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getSuppliers)
  .post(protect, createSupplier);

router.route('/:id')
  .put(protect, updateSupplier)
  .delete(protect, deleteSupplier);

router.patch('/:id/archive', protect, toggleArchiveSupplier);

export default router;
