// src/shared/upload.js
const multer = require('multer');

// メモリストレージに統一（両環境共通）
const storage = multer.memoryStorage();

// ファイルフィルター
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('許可されていないファイル形式です。JPG、PNG、GIFのみアップロード可能です。'), false);
  }
};

// Multer設定
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '', 10) || (10 * 1024 * 1024)
  }
}).single('image');

module.exports = { upload };