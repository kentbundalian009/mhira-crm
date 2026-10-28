import express from 'express';
import { getWIPs, createWIP, completePendingWIP } from '../controllers/InventoryWipController.js';

const router = express.Router();

router.get('/', getWIPs);
router.post('/', createWIP);
router.put('/:id/complete', completePendingWIP);

export default router;