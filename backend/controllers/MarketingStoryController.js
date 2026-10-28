import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import MarketingStory, { defaultStoryContent } from '../models/MarketingStory.js';
import { uploadToCloudinary, isCloudinaryConfigured } from '../lib/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configDir = path.join(process.cwd(), 'config');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}
const storyJsonPath = path.join(configDir, 'our_story.json');

// In-Memory Story Cache (0ms Instant Delivery)
let memoryCachedStory = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 30 * 1000;

export const invalidateStoryCache = () => {
  memoryCachedStory = null;
  lastCacheTime = 0;
};

// Helper: read from local disk fallback
const readStoryFromDisk = () => {
  try {
    if (fs.existsSync(storyJsonPath)) {
      const data = fs.readFileSync(storyJsonPath, 'utf-8');
      return { ...defaultStoryContent, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error reading story JSON from disk:', err.message);
  }
  return { ...defaultStoryContent };
};

// Helper: save to local disk fallback
const saveStoryToDisk = (story) => {
  try {
    fs.writeFile(storyJsonPath, JSON.stringify(story, null, 2), 'utf-8', (err) => {
      if (err) console.error('Async error saving story to disk:', err.message);
    });
  } catch (err) {
    console.error('Error initiating story disk write:', err.message);
  }
};

// Process an uploaded file to Cloudinary or /uploads/
const processUploadedFile = async (file, folder = 'mhira_crm/story') => {
  if (!file) return null;

  if (isCloudinaryConfigured()) {
    try {
      const uploaded = await uploadToCloudinary(file.path, folder);
      if (fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {}
      }
      return uploaded.url;
    } catch (cloudErr) {
      console.warn('Cloudinary upload error in story controller, using local fallback:', cloudErr.message);
      return `/uploads/${file.filename}`;
    }
  }
  return `/uploads/${file.filename}`;
};

/**
 * GET /api/story or /api/marketing/story
 * Public & Admin accessible
 */
export const getMarketingStory = async (req, res) => {
  try {
    const now = Date.now();
    if (memoryCachedStory && now - lastCacheTime < CACHE_TTL_MS) {
      return res.status(200).json({
        success: true,
        story: memoryCachedStory,
      });
    }

    let story = null;
    try {
      story = await MarketingStory.findOne().lean().maxTimeMS(4000);
    } catch (dbErr) {
      console.warn('MongoDB query warning for story, using file cache:', dbErr.message);
    }

    if (!story) {
      story = readStoryFromDisk();
      // Try initializing DB entry if possible
      try {
        const count = await MarketingStory.countDocuments();
        if (count === 0) {
          const newDoc = new MarketingStory(story);
          await newDoc.save();
        }
      } catch (e) {}
    }

    memoryCachedStory = { ...defaultStoryContent, ...story };
    lastCacheTime = Date.now();

    return res.status(200).json({
      success: true,
      story: memoryCachedStory,
    });
  } catch (error) {
    console.error('Error fetching marketing story:', error);
    const fallback = readStoryFromDisk();
    return res.status(200).json({
      success: true,
      story: fallback,
      warning: error.message,
    });
  }
};

/**
 * PUT/POST /api/story or /api/marketing/story
 * Update "Our Story" content & media
 */
export const updateMarketingStory = async (req, res) => {
  try {
    const currentStory = memoryCachedStory || readStoryFromDisk();
    const body = req.body || {};

    let founderImageUrl = body.founderImage !== undefined ? body.founderImage : currentStory.founderImage;
    let bannerImageUrl = body.bannerImage !== undefined ? body.bannerImage : currentStory.bannerImage;

    // Check if new files uploaded via multer
    const files = req.files || {};
    if (files.founderImage && files.founderImage[0]) {
      const uploadedFounder = await processUploadedFile(files.founderImage[0]);
      if (uploadedFounder) founderImageUrl = uploadedFounder;
    }
    if (files.bannerImage && files.bannerImage[0]) {
      const uploadedBanner = await processUploadedFile(files.bannerImage[0]);
      if (uploadedBanner) bannerImageUrl = uploadedBanner;
    }

    // Parse pillars if passed as string JSON
    let parsedPillars = currentStory.pillars;
    if (body.pillars) {
      if (typeof body.pillars === 'string') {
        try {
          parsedPillars = JSON.parse(body.pillars);
        } catch (e) {
          console.warn('Could not parse pillars JSON, keeping existing:', e.message);
        }
      } else if (Array.isArray(body.pillars)) {
        parsedPillars = body.pillars;
      }
    }

    const updatedData = {
      headline: body.headline !== undefined ? body.headline : currentStory.headline,
      intro: body.intro !== undefined ? body.intro : currentStory.intro,
      founderName: body.founderName !== undefined ? body.founderName : currentStory.founderName,
      founderRole: body.founderRole !== undefined ? body.founderRole : currentStory.founderRole,
      founderImage: founderImageUrl,
      founderBio1: body.founderBio1 !== undefined ? body.founderBio1 : currentStory.founderBio1,
      founderBio2: body.founderBio2 !== undefined ? body.founderBio2 : currentStory.founderBio2,
      visionTitle: body.visionTitle !== undefined ? body.visionTitle : currentStory.visionTitle,
      visionText: body.visionText !== undefined ? body.visionText : currentStory.visionText,
      taglineTitle: body.taglineTitle !== undefined ? body.taglineTitle : currentStory.taglineTitle,
      taglineText: body.taglineText !== undefined ? body.taglineText : currentStory.taglineText,
      pillars: parsedPillars,
      bannerImage: bannerImageUrl,
      closingTagline: body.closingTagline !== undefined ? body.closingTagline : currentStory.closingTagline,
      updatedBy: body.updatedBy || req.user?.username || 'Marketing Staff',
      updatedAt: new Date().toISOString(),
    };

    // Save to MongoDB
    let savedDoc = null;
    try {
      savedDoc = await MarketingStory.findOneAndUpdate(
        {},
        { $set: updatedData },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).lean();
    } catch (dbErr) {
      console.warn('MongoDB save warning for story, persisting to file:', dbErr.message);
    }

    const finalStory = savedDoc || updatedData;

    // Save to Disk & Memory Cache
    saveStoryToDisk(finalStory);
    memoryCachedStory = finalStory;
    lastCacheTime = Date.now();

    return res.status(200).json({
      success: true,
      message: 'Our Story content and images updated successfully!',
      story: finalStory,
    });
  } catch (error) {
    console.error('Error updating marketing story:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update story: ' + error.message,
    });
  }
};

/**
 * POST /api/story/reset or /api/marketing/story/reset
 * Reverts to initial factory default story
 */
export const resetMarketingStory = async (req, res) => {
  try {
    const defaultData = {
      ...defaultStoryContent,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user?.username || 'System Reset',
    };

    try {
      await MarketingStory.deleteMany({});
      const newDoc = new MarketingStory(defaultData);
      await newDoc.save();
    } catch (dbErr) {
      console.warn('MongoDB reset warning:', dbErr.message);
    }

    saveStoryToDisk(defaultData);
    memoryCachedStory = defaultData;
    lastCacheTime = Date.now();

    return res.status(200).json({
      success: true,
      message: 'Our Story content has been reset to factory defaults!',
      story: defaultData,
    });
  } catch (error) {
    console.error('Error resetting marketing story:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset story: ' + error.message,
    });
  }
};
