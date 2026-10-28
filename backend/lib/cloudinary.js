import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'zxitdmuf',
  api_key: process.env.CLOUDINARY_API_KEY || '245594772289984',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

export const isCloudinaryConfigured = () => {
  const secret = process.env.CLOUDINARY_API_SECRET;
  return Boolean(secret && secret !== '<your_api_secret>' && secret.trim() !== '');
};

/**
 * Upload a local file (or remote URL / base64) to Cloudinary
 * @param {string} filePath - Absolute or relative local path or URL
 * @param {string} [folder='mhira_crm'] - Cloudinary folder path
 * @returns {Promise<{ url: string, public_id: string }>}
 */
export const uploadToCloudinary = async (filePath, folder = 'mhira_crm') => {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_API_SECRET in your .env file.');
  }

  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: 'auto', // supports image & video
    transformation: [
      { quality: 'auto', fetch_format: 'auto' }
    ]
  });

  return {
    url: result.secure_url,
    public_id: result.public_id,
  };
};

/**
 * Delete an asset from Cloudinary
 * @param {string} publicId
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!isCloudinaryConfigured()) return;
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};

export default cloudinary;
