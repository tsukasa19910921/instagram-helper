// api/process.js
const { upload } = require('../src/shared/upload');
const { unifiedProcessHandler } = require('../src/shared/processor');

module.exports = (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'ファイルサイズが大きすぎます。10MB以下の画像をアップロードしてください。'
        });
      }
      return res.status(400).json({ error: err.message });
    }
    // 共通ハンドラを呼び出し
    unifiedProcessHandler(req, res);
  });
};