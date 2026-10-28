import express from 'express';
import { upload, sanitizeUploadedMedia } from '../middleware/uploadMiddleware.js';
import {
  getMarketingStory,
  updateMarketingStory,
  resetMarketingStory,
} from '../controllers/MarketingStoryController.js';

const router = express.Router();

// GET story (Public for storefront & admin CMS)
router.get('/', getMarketingStory);

// PUT/POST story with optional multipart file uploads for founderImage and bannerImage
router.put(
  '/',
  upload.fields([
    { name: 'founderImage', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 },
  ]),
  sanitizeUploadedMedia,
  updateMarketingStory
);

router.post(
  '/',
  upload.fields([
    { name: 'founderImage', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 },
  ]),
  sanitizeUploadedMedia,
  updateMarketingStory
);

// Reset story to default values
router.post('/reset', resetMarketingStory);

export default router;
