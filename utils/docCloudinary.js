const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Secure configuration with validation
const configureCloudinary = () => {
  const requiredConfig = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ];

  const missingConfig = requiredConfig.filter(key => !process.env[key]);
  if (missingConfig.length > 0) {
    throw new Error(`Missing Cloudinary config: ${missingConfig.join(', ')}`);
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
    timeout: 60000 // 1 minute timeout
  });
};

configureCloudinary();

/**
 * Enhanced Cloudinary upload with validation and transformations
 * @param {string|Buffer} fileData - Base64 string, data URI, or Buffer
 * @param {Object} options - Upload options
 * @param {string} options.folder - Target folder
 * @param {string} [options.public_id] - Custom public ID
 * @param {Array} [options.transformations] - Transformation options
 * @param {string} [options.resource_type='image'] - Resource type
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadToCloudinary = async (fileData, options = {}) => {
  try {
    // Validate input
    if (!fileData) {
      throw new Error('No file data provided');
    }

    // Process different input types
    let uploadStream;
    if (Buffer.isBuffer(fileData)) {
      uploadStream = streamifier.createReadStream(fileData);
    } else if (typeof fileData === 'string') {
      const base64Data = fileData.includes(',') 
        ? fileData.split(',')[1] 
        : fileData;
      
      if (!base64Data.match(/^[A-Za-z0-9+/]+={0,2}$/)) {
        throw new Error('Invalid base64 data');
      }
      
      uploadStream = streamifier.createReadStream(Buffer.from(base64Data, 'base64'));
    } else {
      throw new Error('Unsupported file data type');
    }

    // Default options with enhancements
    const uploadOptions = {
      folder: options.folder || 'uploads',
      resource_type: options.resource_type || 'image',
      quality: 'auto:good',
      format: 'webp', // Modern format by default
      transformation: [
        { width: 800, height: 800, crop: 'limit' }, // Responsive sizing
        ...(options.transformations || [])
      ],
      ...(options.public_id && { public_id: options.public_id }),
      overwrite: false, // Prevent accidental overwrites
      invalidate: true // CDN cache invalidation
    };

    return new Promise((resolve, reject) => {
      const cloudinaryStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(new Error(`Upload failed: ${error.message}`));
          } else if (!result || !result.secure_url) {
            reject(new Error('Invalid response from Cloudinary'));
          } else {
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
              width: result.width,
              height: result.height,
              format: result.format,
              bytes: result.bytes,
              ...result
            });
          }
        }
      );

      uploadStream
        .on('error', (err) => {
          console.error('Stream error:', err);
          reject(new Error('Failed to process file stream'));
        })
        .pipe(cloudinaryStream);
    });
  } catch (error) {
    console.error('Upload processing error:', error);
    throw new Error(`Image upload failed: ${error.message}`);
  }
};

/**
 * Delete assets from Cloudinary
 * @param {string|Array} publicIds - Public ID(s) to delete
 * @returns {Promise<Object>} Deletion result
 */
const deleteFromCloudinary = async (publicIds) => {
  try {
    if (!publicIds || (Array.isArray(publicIds) && publicIds.length === 0)) {
      throw new Error('No public IDs provided');
    }

    const result = await cloudinary.api.delete_resources(
      Array.isArray(publicIds) ? publicIds : [publicIds],
      { resource_type: 'image' }
    );

    if (result.deleted && Object.keys(result.deleted).length > 0) {
      return { success: true, deleted: result.deleted };
    }
    throw new Error('No assets were deleted');
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    throw new Error(`Failed to delete assets: ${error.message}`);
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  cloudinary // Export configured instance for direct use if needed
};