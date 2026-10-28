import HomeSection from '../models/MarketingHomeSection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadToCloudinary, isCloudinaryConfigured } from '../lib/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultMediaFallbacks = {
  carousel: ['/uploads/images-1787841936081.mp4'],
  'ads-i': ['/uploads/images-1787841699206.jpg'],
  'ads-ii': ['/uploads/images-1787841704908.jpg'],
  'popup-ad': ['/uploads/images-1787841610736.webp'],
};

const resolveExistingMedia = (sectionName, images = []) => {
  const resolved = [];
  if (Array.isArray(images)) {
    for (const img of images) {
      if (!img || typeof img !== 'string') continue;
      const clean = img.trim();
      if (clean && clean !== 'banner' && clean.length > 3) {
        resolved.push(clean);
      }
    }
  }

  // If section has no valid media uploaded, supply guaranteed fallback
  if (resolved.length === 0 && defaultMediaFallbacks[sectionName]) {
    for (const fb of defaultMediaFallbacks[sectionName]) {
      resolved.push(fb);
    }
  }

  return resolved;
};

// In-Memory Cache for Instant (0ms) Home Sections Delivery
let cachedSections = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export const invalidateSectionsCache = () => {
  cachedSections = null;
  lastCacheTime = 0;
};

const DEFAULT_SECTIONS = [
  {
    sectionName: 'carousel',
    title: 'Uncomplicated Natural Beauty',
    text: 'Uncomplicated, multi-use products designed to simplify your routine.',
    images: ['/uploads/images-1787841936081.mp4'],
    order: 0,
  },
  {
    sectionName: 'ads-i',
    title: 'Organic Summer Glow Collection',
    text: 'Experience pure botanical luxury with cold-pressed coconut & papaya extracts.',
    images: ['/uploads/images-1787841699206.jpg'],
    order: 1,
  },
  {
    sectionName: 'ads-ii',
    title: 'Handcrafted With Pure Botanicals',
    text: 'Non-toxic, cruelty-free, and ethically formulated for all skin types.',
    images: ['/uploads/images-1787841704908.jpg'],
    order: 2,
  },
  {
    sectionName: 'popup-ad',
    title: 'Special Promotion Announcement 🌿',
    text: 'Discover our latest organic handcrafted skin care collections & special promotional discounts today!',
    images: ['/uploads/images-1787841610736.webp'],
    order: 3,
  },
  {
    sectionName: 'topbar-announcement',
    title: 'Announcement:',
    text: 'Announcement: Current pricing and offers end 8/11/2026 at 11:59 PM ET / 8:59 PM PT — Grab your organic favorites now! 🌿',
    images: [],
    order: 4,
  },
];

// GET all home sections (Fast In-Memory + Lean DB Query)
export const getHomeSections = async (req, res) => {
  try {
    const now = Date.now();
    if (cachedSections && Array.isArray(cachedSections) && cachedSections.length > 0 && now - lastCacheTime < CACHE_TTL_MS) {
      return res.status(200).json(cachedSections);
    }

    let sections = await HomeSection.find().sort({ order: 1, createdAt: 1 }).lean().maxTimeMS(8000);

    // If new database or empty, seed clean default sections
    if (!sections || sections.length === 0) {
      try {
        sections = await HomeSection.insertMany(DEFAULT_SECTIONS);
      } catch (e) {
        sections = DEFAULT_SECTIONS;
      }
    }

    const cleanSections = (sections || [])
      .filter((s) => s && !['ads-iii', 'ads-iv', 'featured', 'navbar-promo'].includes(s.sectionName))
      .map((s) => ({
        ...s,
        images: resolveExistingMedia(s.sectionName, s.images)
      }));

    // Ensure topbar-announcement section is always present in response
    if (!cleanSections.some((s) => s.sectionName === 'topbar-announcement')) {
      cleanSections.push({
        sectionName: 'topbar-announcement',
        title: 'Announcement:',
        text: 'Announcement: Current pricing and offers end 8/11/2026 at 11:59 PM ET / 8:59 PM PT — Grab your organic favorites now! 🌿',
        images: [],
        order: 5,
      });
    }

    cachedSections = cleanSections;
    lastCacheTime = Date.now();

    return res.status(200).json(cleanSections);
  } catch (error) {
    console.error("Error fetching home sections:", error);
    if (cachedSections && cachedSections.length > 0) return res.status(200).json(cachedSections);
    return res.status(200).json(DEFAULT_SECTIONS);
  }
};

// UPDATE specific home section
export const updateHomeSection = async (req, res) => {
  const { sectionName } = req.params;
  const { title, text, existingImages, slideDetails, newSlideDetails } = req.body;

  try {
    let keptImages = [];
    if (existingImages) {
      keptImages = Array.isArray(existingImages) ? existingImages : [existingImages];
    }
    keptImages = keptImages.filter((img) => img && typeof img === 'string' && img !== 'banner' && img.trim() !== '');

    let newImagePaths = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (isCloudinaryConfigured()) {
          try {
            const uploaded = await uploadToCloudinary(file.path, 'mhira_home_sections');
            newImagePaths.push(uploaded.url);
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch (cloudErr) {
            console.error('⚠️ Cloudinary upload error in home section, falling back to local:', cloudErr.message);
            newImagePaths.push(`/uploads/${file.filename}`);
          }
        } else {
          newImagePaths.push(`/uploads/${file.filename}`);
        }
      }
    }

    let finalImages = [...keptImages, ...newImagePaths];

    if (sectionName !== 'carousel' && finalImages.length > 1) {
      finalImages = [finalImages[finalImages.length - 1]];
    }

    let parsedExistingSlideDetails = [];
    if (slideDetails) {
      try {
        parsedExistingSlideDetails = typeof slideDetails === 'string' ? JSON.parse(slideDetails) : slideDetails;
      } catch (e) {
        console.warn('Could not parse slideDetails:', e.message);
      }
    }

    let parsedNewSlideDetails = [];
    if (newSlideDetails) {
      try {
        parsedNewSlideDetails = typeof newSlideDetails === 'string' ? JSON.parse(newSlideDetails) : newSlideDetails;
      } catch (e) {
        console.warn('Could not parse newSlideDetails:', e.message);
      }
    }

    let finalSlideDetails = [];
    if (sectionName === 'carousel') {
      keptImages.forEach((img, idx) => {
        const match = (Array.isArray(parsedExistingSlideDetails) ? parsedExistingSlideDetails.find((s) => s && s.image === img) : null)
          || (Array.isArray(parsedExistingSlideDetails) ? parsedExistingSlideDetails[idx] : null)
          || {};
        finalSlideDetails.push({
          image: img,
          title: match.title || '',
          text: match.text || '',
        });
      });

      newImagePaths.forEach((path, idx) => {
        const newDetail = (Array.isArray(parsedNewSlideDetails) ? parsedNewSlideDetails[idx] : null) || {};
        finalSlideDetails.push({
          image: path,
          title: newDetail.title || '',
          text: newDetail.text || '',
        });
      });
    }

    const updatePayload = {
      title: title || '',
      text: text || '',
      images: finalImages,
    };
    if (sectionName === 'carousel') {
      updatePayload.slideDetails = finalSlideDetails;
    }

    const section = await HomeSection.findOneAndUpdate(
      { sectionName },
      updatePayload,
      { returnDocument: 'after', upsert: true }
    );

    invalidateSectionsCache();

    return res.status(200).json({
      message: `Section '${sectionName}' updated successfully`,
      section,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error updating section',
      error: error.message,
    });
  }
};

// DELETE / CLEAR specific home section media, title, and text
export const deleteHomeSection = async (req, res) => {
  const { sectionName } = req.params;
  try {
    const section = await HomeSection.findOneAndUpdate(
      { sectionName },
      { title: '', text: '', images: [] },
      { returnDocument: 'after', upsert: true }
    );

    invalidateSectionsCache();

    return res.status(200).json({
      message: `Section '${sectionName}' completely cleared and reset`,
      section,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error deleting section media',
      error: error.message,
    });
  }
};

// REORDER home sections (Drag and Drop persistence)
export const reorderHomeSections = async (req, res) => {
  const { orderedSectionNames } = req.body;
  if (!Array.isArray(orderedSectionNames)) {
    return res.status(400).json({ message: 'orderedSectionNames must be an array' });
  }

  try {
    const bulkOps = orderedSectionNames.map((sectionName, index) => ({
      updateOne: {
        filter: { sectionName },
        update: { $set: { order: index } },
        upsert: true,
      },
    }));

    await HomeSection.bulkWrite(bulkOps);
    invalidateSectionsCache();

    const updatedSections = await HomeSection.find().sort({ order: 1, createdAt: 1 }).lean();
    return res.status(200).json({
      message: 'Sections reordered successfully',
      sections: updatedSections,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error reordering sections',
      error: error.message,
    });
  }
};