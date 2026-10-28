import express from 'express';

// ✅ TAMA AT EKSAKTONG PATH PATUNGO SA FILE MO:
import upload from '../middleware/uploadMiddleware.js'; 

import {
  getHomeSections,
  updateHomeSection,
  deleteHomeSection,
  reorderHomeSections,
} from '../controllers/MarketingHomeSectionController.js';

const router = express.Router();

// GET: Para sa Customer
router.get('/', getHomeSections);

// POST: Reorder sections sequence
router.post('/reorder', reorderHomeSections);

// PUT: Para sa Marketing
router.put('/:sectionName', upload.array('images', 10), updateHomeSection);

// DELETE: Para sa Marketing (Burahin ang advertisement banner)
router.delete('/:sectionName', deleteHomeSection);

export default router;