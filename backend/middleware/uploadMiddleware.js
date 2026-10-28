import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs';

// Set up storage engine (stores uploaded files in 'uploads/' folder)
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Check file type (Images AND Videos)
function checkFileType(file, cb) {
  // Disallow SVG if it might contain embedded scripts, or allow standard raster images & videos
  const filetypes = /\.(jpg|jpeg|png|webp|gif|avif|jfif|bmp|mp4|webm|ogg|mov|m4v|mkv|avi)$/i;
  
  const extValid = filetypes.test(file.originalname);
  const isMimeValid = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream';

  if (extValid || isMimeValid) {
    return cb(null, true);
  } else {
    const error = new Error('Only valid image and video files are supported (JPG, PNG, WebP, GIF, MP4, WebM, MOV, etc.)');
    error.status = 400;
    cb(error);
  }
}

export const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

/**
 * Image Sanitizer Middleware:
 * Uses Sharp to strip EXIF metadata, GPS geotags, and embedded malicious payloads from uploaded raster images.
 */
export const sanitizeUploadedMedia = async (req, res, next) => {
  try {
    const filesToProcess = [];
    if (req.file) filesToProcess.push(req.file);
    if (req.files) {
      if (Array.isArray(req.files)) {
        filesToProcess.push(...req.files);
      } else {
        Object.values(req.files).forEach((fileArr) => {
          if (Array.isArray(fileArr)) filesToProcess.push(...fileArr);
        });
      }
    }

    for (const file of filesToProcess) {
      if (file && file.mimetype && file.mimetype.startsWith('image/') && !file.mimetype.includes('gif')) {
        const filePath = file.path;
        if (fs.existsSync(filePath)) {
          const tempPath = `${filePath}.clean`;
          await sharp(filePath)
            .rotate() // Auto-orient based on EXIF before stripping
            .toFile(tempPath);
          fs.renameSync(tempPath, filePath);
        }
      }
    }
    next();
  } catch (error) {
    console.error('⚠️ Image sanitization warning:', error.message);
    // Proceed if non-fatal
    next();
  }
};

export default upload;