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
app.use(express.json({ limit: '15mb' })); // Base64エンコード画像のため上限を上げる
app.use(express.static('public'));

// ルートエンドポイント
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 画像処理エンドポイント（JSON/FormData両対応）
app.post('/api/process', async (req, res) => {
  // CORS設定（ブラウザからのクロスオリジンリクエスト用）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // プリフライトリクエスト対応
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POSTメソッド以外は拒否（セキュリティ向上）
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let imageBuffer;
    let params;

    // Content-Typeで判定
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('application/json')) {
      // ========================================
      // JSON形式の処理（React Nativeアプリ用）
      // ========================================
      const { imageBase64, textStyle, hashtagCount, language, characterStyle, imageStyle, requiredKeyword } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: '画像データがありません' });
      }

      // Base64サイズチェック（約10MB = 13.7MB in Base64）
      const maxBase64Size = 14 * 1024 * 1024; // 14MB（Base64は1.37倍になるため）
      if (imageBase64.length > maxBase64Size) {
        return res.status(413).json({ error: 'ファイルサイズが大きすぎます。10MB以下の画像をアップロードしてください。' });
      }

      // Base64をBufferに変換
      imageBuffer = Buffer.from(imageBase64, 'base64');
      params = { textStyle, hashtagCount, language, characterStyle, imageStyle, requiredKeyword };

      console.log('JSON形式のリクエストを受信しました');

    } else if (contentType.includes('multipart/form-data')) {
      // ========================================
      // FormData形式の処理（既存WEBアプリ用）
      // ========================================
      await new Promise((resolve, reject) => {
        upload(req, res, (err) => {
          if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              reject(new Error('ファイルサイズが大きすぎます。10MB以下の画像をアップロードしてください。'));
            } else {
              reject(err);
            }
          } else {
            resolve();
          }
        });
      });

      if (!req.file) {
        return res.status(400).json({ error: '画像ファイルがありません' });
      }

      imageBuffer = req.file.buffer;
      params = req.body;

      console.log('FormData形式のリクエストを受信しました');

    } else {
      return res.status(415).json({ error: 'Unsupported Media Type. application/json または multipart/form-data を使用してください。' });
    }

    // ========================================
    // 共通処理を呼び出し
    // ========================================
    return await unifiedProcessHandler({ imageBuffer, params }, res);

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'サーバーエラーが発生しました',
      details: error.message
    });
  }
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
