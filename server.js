// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { upload } = require('./lib/upload');
const { unifiedProcessHandler } = require('./lib/processor');

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア設定
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ルートエンドポイント
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 画像処理エンドポイント（共通ハンドラ使用）
app.post('/api/process', (req, res) => {
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
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 サーバーが起動しました: http://localhost:${PORT}`);
  console.log(`📸 Instagram Helper アプリケーション`);

  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  警告: GEMINI_API_KEY が設定されていません。');
    console.warn('   文章生成機能が制限されます。');
  }
});