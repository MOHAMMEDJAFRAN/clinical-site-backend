const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Always use HTTPS
});

/**
 * Uploads an image to Cloudinary
 * @param {string} base64Image - Base64 string or data URI
 * @param {string} folder - Cloudinary folder path
 * @returns {Promise<Object>} Cloudinary upload result
 */
exports.uploadToCloudinary = (base64Image, folder) => {
  return new Promise((resolve, reject) => {
    // Handle both raw base64 and data URIs
    const base64Data = base64Image.includes(',') 
      ? base64Image.split(',')[1] 
      : base64Image;

    // Validate input
    if (!base64Data || typeof base64Data !== 'string') {
      return reject(new Error('Invalid base64 image data'));
    }

    const uploadOptions = {
      folder: folder,
      resource_type: 'image',
      quality: 'auto:good' // Optional: automatic quality adjustment
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(new Error('Failed to upload image to Cloudinary'));
        }
        resolve(result);
      }
    );

    // Create stream from buffer
    const buffer = Buffer.from(base64Data, 'base64');
    streamifier.createReadStream(buffer)
      .on('error', (err) => {
        console.error('Stream error:', err);
        reject(new Error('Failed to process image stream'));
      })
      .pipe(uploadStream);
  });
};