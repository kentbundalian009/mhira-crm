import express from 'express';
import fs from 'fs';
import upload, { sanitizeUploadedMedia } from '../middleware/uploadMiddleware.js';
import { uploadToCloudinary, isCloudinaryConfigured, deleteFromCloudinary } from '../lib/cloudinary.js';

const router = express.Router();

/**
 * GET /api/upload/status
 * Check if Cloudinary integration is active
 */
router.get('/status', (req, res) => {
  res.status(200).json({
    configured: isCloudinaryConfigured(),
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
  });
});

/**
 * POST /api/upload
 * Accepts single file ('image' or 'file') or multiple files ('images')
 * Uploads to Cloudinary (falls back to local /uploads/ if secret not set)
 */
router.post('/', upload.any(), sanitizeUploadedMedia, async (req, res) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const folder = req.body.folder || 'mhira_crm';
    const results = [];

    for (const file of files) {
      if (isCloudinaryConfigured()) {
        try {
          const uploaded = await uploadToCloudinary(file.path, folder);
          results.push({
            url: uploaded.url,
            public_id: uploaded.public_id,
            originalName: file.originalname,
            storage: 'cloudinary',
          });
          // Clean up local temp file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cloudErr) {
          console.error('Cloudinary upload error for file, falling back to local:', cloudErr.message);
          results.push({
            url: `/uploads/${file.filename}`,
            originalName: file.originalname,
            storage: 'local',
          });
        }
      } else {
        results.push({
          url: `/uploads/${file.filename}`,
          originalName: file.originalname,
          storage: 'local',
        });
      }
    }

    if (results.length === 1) {
      return res.status(200).json({
        success: true,
        ...results[0],
      });
    }

    return res.status(200).json({
      success: true,
      files: results,
      urls: results.map((r) => r.url),
    });
  } catch (error) {
    console.error('Error during file upload:', error);
    return res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

/**
 * POST /api/upload/base64
 * Uploads a base64 string or remote image URL to Cloudinary
 */
router.post('/base64', async (req, res) => {
  try {
    const { image, folder = 'mhira_crm' } = req.body;
    if (!image) {
      return res.status(400).json({ message: 'Image data or URL is required' });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(400).json({
        message: 'Cloudinary is not configured. Please set CLOUDINARY_API_SECRET in your .env.',
      });
    }

    const uploaded = await uploadToCloudinary(image, folder);
    return res.status(200).json({
      success: true,
      url: uploaded.url,
      public_id: uploaded.public_id,
    });
  } catch (error) {
    console.error('Error in base64 upload to Cloudinary:', error);
    return res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

/**
 * DELETE /api/upload
 * Deletes an asset by public_id
 */
router.delete('/', async (req, res) => {
  try {
    const { public_id } = req.body;
    if (!public_id) {
      return res.status(400).json({ message: 'public_id is required' });
    }

    await deleteFromCloudinary(public_id);
    return res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Delete failed', error: error.message });
  }
});

export default router;
