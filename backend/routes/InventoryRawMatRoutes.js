import express from 'express';
import {
  getRawMaterials,
  getSupplierReturnTickets,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  toggleArchiveRawMaterial,
} from '../controllers/InventoryRawMatController.js';

const router = express.Router();

router.get('/', getRawMaterials);
router.get('/supplier-returns', getSupplierReturnTickets);
router.post('/', createRawMaterial);
router.put('/:id', updateRawMaterial);
router.delete('/:id', deleteRawMaterial);
router.patch('/:id/archive', toggleArchiveRawMaterial);

export default router;