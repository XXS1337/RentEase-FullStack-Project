const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

// * Configure Cloudinary with credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Cloudinary account name
  api_key: process.env.CLOUDINARY_API_KEY, // API key for Cloudinary
  api_secret: process.env.CLOUDINARY_API_SECRET, // API secret for secure access
});

// * Create a CloudinaryStorage instance for use with Multer
const storage = new CloudinaryStorage({
  cloudinary, // The cloudinary instance to use
  allowed_formats: ['jpg', 'png', 'jpeg'], // Allowed image file types
  params: {
    folder: 'flatImages', // Folder name in Cloudinary where files will be uploaded
    format: 'jpg', // Force format to jpg (can be overridden by actual upload type)
    transformation: [{ width: 800, height: 800, crop: 'limit' }], // Resize images to max 800x800, keeping aspect ratio
  },
});

// Export the storage configuration for use in routes/controllers
module.exports = { storage };
