import express from 'express';
import {
  getConfig,
  updateConfig,
  addCategory,
  deleteCategory,
  addUom,
  deleteUom,
} from '../controllers/InventoryCategoryUomController.js';

const router = express.Router();

router.get('/:moduleType', getConfig);
router.put('/:moduleType', updateConfig);
router.post('/:moduleType/category', addCategory);
router.delete('/:moduleType/category', deleteCategory);
router.post('/:moduleType/uom', addUom);
router.delete('/:moduleType/uom', deleteUom);

export default router;
