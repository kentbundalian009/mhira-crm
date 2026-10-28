import express from 'express';
import {
  getExpiryItems,
  createExpiryItem,
  updateExpiryItem,
  deleteExpiryItem,
  disposeExpiryBatch
} from '../controllers/InventoryExpiryController.js';

const router = express.Router();

router.get('/', getExpiryItems);
router.post('/dispose', disposeExpiryBatch);
router.post('/', createExpiryItem);
router.put('/:id', updateExpiryItem);
router.delete('/:id', deleteExpiryItem);

export default router;
