const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const assetDirectory = path.join(process.cwd(), 'storage', 'campaign-assets');
fs.mkdirSync(assetDirectory, { recursive: true });

const mimeExtensions = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif'
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, assetDirectory),
  filename: (_req, file, callback) => callback(null, `asset-${crypto.randomUUID()}${mimeExtensions[file.mimetype]}`)
});

const uploadAsset = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!mimeExtensions[file.mimetype]) {
      const error = new Error('Only PNG, JPEG, WebP, GIF, and AVIF image files are allowed.');
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  }
});

module.exports = { uploadAsset, assetDirectory };
