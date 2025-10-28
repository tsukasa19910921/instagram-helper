# 🚀 Express.js → サーバーレス移行完全ガイド

**Express.jsとサーバーレス（Vercel/AWS Lambda）の実装パターンとベストプラクティス**

このドキュメントは、Express.jsを使った従来型WEBアプリケーションと、Vercel Functions等のサーバーレスアーキテクチャの知見をまとめた汎用ガイドです。

---

## 📋 目次

1. [Express.js基礎実装パターン](#1-expressjs基礎実装パターン)
2. [ファイルアップロード実装（Multer）](#2-ファイルアップロード実装multer)
3. [共通ロジックの分離パターン](#3-共通ロジックの分離パターン)
4. [Express vs サーバーレスの比較](#4-express-vs-サーバーレスの比較)
5. [ハイブリッド構成（Express + Vercel）](#5-ハイブリッド構成express--vercel)
6. [サーバーレスへの移行手順](#6-サーバーレスへの移行手順)
7. [メモリストレージパターン](#7-メモリストレージパターン)
8. [エラーハンドリングのベストプラクティス](#8-エラーハンドリングのベストプラクティス)
9. [環境変数管理](#9-環境変数管理)
10. [実装チェックリスト](#10-実装チェックリスト)

---

## 1. Express.js基礎実装パターン

### 最小構成のExpressサーバー

```javascript
// server.js - 基本形
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア設定
app.use(cors());                    // CORS許可
app.use(express.json());            // JSONパース
app.use(express.urlencoded({ extended: true })); // URLエンコード
app.use(express.static('public'));  // 静的ファイル配信

// ルートエンドポイント
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// APIエンドポイント
app.post('/api/process', (req, res) => {
  try {
    const { data } = req.body;
    // 処理ロジック
    res.json({ success: true, result: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
```

### フォルダ構成（Express）

```
project/
├── server.js              # Expressサーバー
├── routes/                # ルート定義
│   ├── api.js
│   └── index.js
├── middleware/            # カスタムミドルウェア
│   ├── auth.js
│   └── errorHandler.js
├── controllers/           # ビジネスロジック
│   └── processController.js
├── public/                # 静的ファイル
│   ├── index.html
│   └── app.js
└── package.json
```

---

## 2. ファイルアップロード実装（Multer）

### 基本パターン: ディスクストレージ

```javascript
// middleware/upload.js
const multer = require('multer');
const path = require('path');

// ディスクストレージ設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // 保存先ディレクトリ
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// ファイルフィルター（画像のみ許可）
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('画像ファイルのみアップロード可能です'));
  }
};

// Multer設定
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: fileFilter
});

module.exports = { upload };
```

### 使用例（ディスクストレージ）

```javascript
// server.js
const { upload } = require('./middleware/upload');

app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'ファイルがアップロードされていません' });
    }

    // ファイル情報
    const fileInfo = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    };

    res.json({ success: true, file: fileInfo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 応用パターン: メモリストレージ（サーバーレス対応）

```javascript
// middleware/upload.js - メモリストレージ版
const multer = require('multer');

// メモリストレージ設定（ファイルをBufferとして保持）
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('画像ファイルのみアップロード可能です'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: fileFilter
}).single('image'); // 単一ファイル

module.exports = { upload };
```

### 使用例（メモリストレージ + Sharp）

```javascript
// server.js
const sharp = require('sharp');
const { upload } = require('./middleware/upload');

app.post('/api/process', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'ファイルサイズが大きすぎます'
        });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'ファイルがありません' });
    }

    try {
      // メモリ内の画像を処理（req.file.buffer）
      const processedImage = await sharp(req.file.buffer)
        .resize(800, 800, { fit: 'cover' })
        .jpeg({ quality: 90 })
        .toBuffer();

      // Base64エンコード（Data URL形式）
      const base64Image = `data:image/jpeg;base64,${processedImage.toString('base64')}`;

      res.json({
        success: true,
        image: base64Image,
        originalSize: req.file.size,
        processedSize: processedImage.length
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});
```

---

## 3. 共通ロジックの分離パターン

### アーキテクチャ設計

**関心の分離（Separation of Concerns）**を徹底する。

```
project/
├── lib/ または core/        # 環境非依存の共通ロジック
│   ├── processor.js         # ビジネスロジック
│   └── utils.js             # ユーティリティ
├── api/                     # サーバーレス専用
│   └── process.js
├── server.js                # Express専用
└── public/
```

### パターン1: 共通ハンドラー

```javascript
// lib/processor.js - 環境非依存
const sharp = require('sharp');

/**
 * 統合処理ハンドラー
 * Express / Vercel Functions / AWS Lambda で共通使用
 */
async function unifiedProcessHandler(req, res) {
  try {
    // 1. ファイル検証
    if (!req.file) {
      return res.status(400).json({ error: 'ファイルがありません' });
    }

    // 2. 画像処理
    const processedImage = await sharp(req.file.buffer)
      .resize(800, 800, { fit: 'cover' })
      .jpeg({ quality: 90 })
      .toBuffer();

    // 3. レスポンス
    const base64Image = `data:image/jpeg;base64,${processedImage.toString('base64')}`;

    res.json({
      success: true,
      image: base64Image
    });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { unifiedProcessHandler };
```

### パターン2: Express で使用

```javascript
// server.js - Express専用ラッパー
const express = require('express');
const { upload } = require('./lib/upload');
const { unifiedProcessHandler } = require('./lib/processor');

const app = express();

app.post('/api/process', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    // 共通ハンドラーを呼び出し
    unifiedProcessHandler(req, res);
  });
});

app.listen(3000);
```

### パターン3: Vercel Functions で使用

```javascript
// api/process.js - Vercel Functions専用ラッパー
const { upload } = require('../lib/upload');
const { unifiedProcessHandler } = require('../lib/processor');

module.exports = (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    // 共通ハンドラーを呼び出し（Expressと同じ）
    unifiedProcessHandler(req, res);
  });
};
```

**ポイント**: ビジネスロジック（`lib/processor.js`）は環境に依存しない。

---

## 4. Express vs サーバーレスの比較

### 技術比較表

| 項目 | Express.js | Vercel Functions | AWS Lambda |
|------|-----------|-----------------|------------|
| **起動方式** | 常時起動サーバー | リクエストごとに起動 | リクエストごとに起動 |
| **スケーリング** | 手動（PM2/クラスター） | 自動（無制限） | 自動（同時実行数制限あり） |
| **コールドスタート** | なし | あり（初回遅延） | あり（初回遅延） |
| **コスト** | サーバー維持費（固定） | 実行時間課金（従量） | 実行時間課金（従量） |
| **ファイルストレージ** | ディスク可能 | `/tmp`のみ（制限あり） | `/tmp`のみ（512MB） |
| **実行時間制限** | なし | 10秒（Hobby）/60秒（Pro） | 15分（最大） |
| **環境変数** | `.env` / プロセス | Vercel Dashboard | AWS Console / CDK |
| **WebSocket** | 可能 | 不可 | 不可（API Gateway必要） |
| **デプロイ** | サーバー管理必要 | Git push で自動 | AWS CLI / CDK |

### ユースケース別推奨

| ユースケース | 推奨 | 理由 |
|-------------|------|------|
| **静的サイト + API** | Vercel | 簡単・安い・スケーラブル |
| **リアルタイム通信** | Express | WebSocket対応 |
| **大容量ファイル処理** | Express or Lambda | `/tmp`制限を回避 |
| **長時間バッチ処理** | Lambda or ECS | 15分以上ならECS/Batch |
| **スタートアップMVP** | Vercel | 最速デプロイ・無料枠大 |
| **エンタープライズ** | 要件次第 | コスト・セキュリティ要件で判断 |

---

## 5. ハイブリッド構成（Express + Vercel）

### アーキテクチャパターン

このプロジェクトで採用していた構成。

```
開発環境（ローカル）:
  ├── Express サーバー（server.js）
  │   ├── 静的ファイル配信
  │   ├── CORS設定
  │   └── APIルート → lib/processor.js
  └── http://localhost:3000

本番環境（Vercel）:
  ├── Vercel CDN（静的ファイル配信）
  ├── Vercel Functions（api/process.js）
  │   └── APIルート → lib/processor.js
  └── https://your-app.vercel.app
```

### メリット

✅ **開発の柔軟性**
- ローカルはExpressで高速開発
- 本番はVercelで自動スケーリング

✅ **共通コード**
- `lib/` ディレクトリで重複排除

✅ **段階的移行**
- Expressから徐々にサーバーレス化可能

### デメリット

❌ **環境の不一致**
- ローカルと本番で動作が異なる可能性
- デバッグが困難

❌ **二重管理**
- `server.js` と `api/process.js` の両方を保守

❌ **無駄な依存関係**
- Express が本番で使われない

---

## 6. サーバーレスへの移行手順

### Step 1: Vercel CLI のインストール

```bash
# グローバルインストール
npm install -g vercel

# またはプロジェクト内
npm install --save-dev vercel
```

### Step 2: package.json の更新

```json
{
  "scripts": {
    "dev": "vercel dev",           // ← Express の代わりに Vercel CLI
    "build": "echo 'No build needed'",
    "start": "vercel dev"
  },
  "devDependencies": {
    "vercel": "^33.0.0"
  }
}
```

### Step 3: server.js の削除

```bash
# Expressサーバーを削除
git rm server.js

# Express関連の依存関係を削除
npm uninstall express cors
```

### Step 4: vercel.json の確認

```json
{
  "version": 2,
  "functions": {
    "api/*.js": {
      "maxDuration": 10
    }
  },
  "rewrites": [
    {
      "source": "/",
      "destination": "/public/index.html"
    }
  ]
}
```

### Step 5: 動作確認

```bash
# ローカルでVercel環境を起動
npm run dev

# または
vercel dev
```

ブラウザで `http://localhost:3000` にアクセスして確認。

### Step 6: デプロイ

```bash
# Vercel にデプロイ
vercel --prod
```

---

## 7. メモリストレージパターン

### なぜメモリストレージが必要か

**サーバーレス環境の制約:**
- ディスクへの書き込みは `/tmp` のみ（容量制限あり）
- 実行完了後にファイルが消える
- 複数インスタンス間でファイル共有不可

**解決策: メモリストレージ**
- ファイルを `Buffer` としてメモリに保持
- ディスク不要
- Data URL（Base64）でクライアントに返却

### 実装パターン

```javascript
// lib/upload.js - メモリストレージ設定
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage(); // ← ディスクではなくメモリ

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('画像ファイルのみアップロード可能です'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: fileFilter
}).single('image');

module.exports = { upload };
```

### Data URL形式での返却

```javascript
// lib/processor.js
const sharp = require('sharp');

async function processImage(buffer) {
  // 1. 画像処理
  const processedBuffer = await sharp(buffer)
    .resize(800, 800, { fit: 'cover' })
    .jpeg({ quality: 90 })
    .toBuffer();

  // 2. Base64エンコード
  const base64 = processedBuffer.toString('base64');

  // 3. Data URL形式
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  return dataUrl;
}
```

### クライアント側での受け取り

```javascript
// public/app.js
async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('/api/process', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();

  // Data URLを画像として表示
  const img = document.createElement('img');
  img.src = result.image; // ← data:image/jpeg;base64,...
  document.body.appendChild(img);
}
```

---

## 8. エラーハンドリングのベストプラクティス

### パターン1: Express グローバルエラーハンドラー

```javascript
// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error('Error:', err.stack);

  // Multerエラー
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'ファイルサイズが大きすぎます'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: '予期しないフィールド名です'
    });
  }

  // その他のエラー
  res.status(err.status || 500).json({
    error: err.message || 'サーバーエラーが発生しました'
  });
}

module.exports = { errorHandler };
```

```javascript
// server.js
const { errorHandler } = require('./middleware/errorHandler');

// ... ルート定義 ...

// 最後にエラーハンドラーを追加
app.use(errorHandler);
```

### パターン2: 統一エラーレスポンス

```javascript
// lib/errors.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // プログラムエラーと区別
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Not Found') {
    super(message, 404);
  }
}

class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error') {
    super(message, 500);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  NotFoundError,
  InternalServerError
};
```

### パターン3: try-catch の統一

```javascript
// lib/asyncHandler.js - Express用
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { asyncHandler };
```

```javascript
// 使用例
const { asyncHandler } = require('./lib/asyncHandler');

app.post('/api/process', asyncHandler(async (req, res) => {
  // try-catch 不要
  const result = await someAsyncOperation();
  res.json({ result });
}));
```

---

## 9. 環境変数管理

### .env ファイルの構成

```bash
# .env
NODE_ENV=development
PORT=3000

# API Keys
GEMINI_API_KEY=your_api_key_here
STABILITY_API_KEY=your_api_key_here

# File Upload
MAX_FILE_SIZE=10485760  # 10MB in bytes

# Database (if needed)
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com
```

### .env.example の作成

```bash
# .env.example - Gitにコミット
NODE_ENV=development
PORT=3000

# API Keys (実際の値は .env に記載)
GEMINI_API_KEY=your_api_key_here
STABILITY_API_KEY=

# File Upload
MAX_FILE_SIZE=10485760

# Database
DATABASE_URL=

# CORS
ALLOWED_ORIGINS=http://localhost:3000
```

### .gitignore に追加

```bash
# .gitignore
.env
.env.local
.env.*.local
```

### 環境変数の読み込み（Express）

```javascript
// server.js
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10485760;

console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', PORT);
```

### 環境変数の読み込み（Vercel Functions）

```javascript
// api/process.js
// Vercelは自動的に環境変数を読み込む
const apiKey = process.env.GEMINI_API_KEY;
```

**Vercel Dashboardでの設定:**
1. Project Settings → Environment Variables
2. `GEMINI_API_KEY` を追加
3. Production / Preview / Development を選択
4. Redeploy

### 環境別設定パターン

```javascript
// config/index.js
const config = {
  development: {
    port: 3000,
    apiUrl: 'http://localhost:3000',
    cors: {
      origin: '*'
    }
  },
  production: {
    port: process.env.PORT,
    apiUrl: process.env.API_URL,
    cors: {
      origin: process.env.ALLOWED_ORIGINS.split(',')
    }
  }
};

const env = process.env.NODE_ENV || 'development';
module.exports = config[env];
```

---

## 10. 実装チェックリスト

### ✅ Express.js 基本実装

- [ ] `express` パッケージをインストール
- [ ] `server.js` を作成
- [ ] ミドルウェア設定（CORS、JSON、静的ファイル）
- [ ] ルート定義（GET、POST等）
- [ ] エラーハンドリング実装
- [ ] 環境変数設定（`.env`）
- [ ] `npm start` で起動確認

### ✅ ファイルアップロード（Multer）

- [ ] `multer` パッケージをインストール
- [ ] ストレージ設定（disk or memory）
- [ ] ファイルフィルター実装
- [ ] ファイルサイズ制限設定
- [ ] アップロードエンドポイント作成
- [ ] エラーハンドリング（LIMIT_FILE_SIZE等）
- [ ] 動作テスト（Postman/curl）

### ✅ 画像処理（Sharp）

- [ ] `sharp` パッケージをインストール
- [ ] リサイズ処理実装
- [ ] フォーマット変換実装（JPEG/PNG）
- [ ] Data URL変換実装
- [ ] メモリ使用量確認
- [ ] パフォーマンステスト

### ✅ 共通ロジック分離

- [ ] `lib/` または `core/` ディレクトリ作成
- [ ] ビジネスロジックを分離
- [ ] 環境非依存コードを確認
- [ ] Express / Vercel両方で動作確認
- [ ] ユニットテスト作成（オプション）

### ✅ Vercel Functions 実装

- [ ] `api/` ディレクトリ作成
- [ ] エンドポイントファイル作成（`api/process.js`）
- [ ] `vercel.json` 設定
- [ ] 環境変数設定（Vercel Dashboard）
- [ ] ローカルテスト（`vercel dev`）
- [ ] デプロイテスト（`vercel --prod`）

### ✅ サーバーレス移行

- [ ] Vercel CLI インストール
- [ ] `package.json` の `scripts` 更新
- [ ] `server.js` 削除（バックアップ推奨）
- [ ] Express依存関係削除
- [ ] `vercel dev` で動作確認
- [ ] 本番デプロイ確認

### ✅ セキュリティ

- [ ] `.env` を `.gitignore` に追加
- [ ] CORS設定を適切に制限
- [ ] ファイルタイプ検証実装
- [ ] ファイルサイズ制限設定
- [ ] レート制限実装（オプション）
- [ ] 入力値バリデーション

### ✅ ドキュメント

- [ ] `README.md` 作成
- [ ] 環境変数一覧（`.env.example`）
- [ ] API仕様書作成
- [ ] デプロイ手順記載
- [ ] トラブルシューティング記載

---

## 📚 参考リソース

### 公式ドキュメント

- **Express.js**: https://expressjs.com/
- **Multer**: https://github.com/expressjs/multer
- **Sharp**: https://sharp.pixelplumbing.com/
- **Vercel Functions**: https://vercel.com/docs/functions
- **AWS Lambda**: https://docs.aws.amazon.com/lambda/

### ベストプラクティス

- **Node.js Best Practices**: https://github.com/goldbergyoni/nodebestpractices
- **Express Security**: https://expressjs.com/en/advanced/best-practice-security.html
- **Serverless Patterns**: https://serverlessland.com/patterns

### 比較記事

- **Express vs Serverless**: https://blog.logrocket.com/express-vs-serverless/
- **When to use Serverless**: https://martinfowler.com/articles/serverless.html

---

## 💡 実装パターン集

### パターン1: Express + MySQL

```javascript
// lib/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = { pool };
```

```javascript
// server.js
const { pool } = require('./lib/db');

app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### パターン2: Express + MongoDB

```javascript
// lib/db.js
const { MongoClient } = require('mongodb');

let client;

async function connectDB() {
  if (client) return client;

  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  console.log('MongoDB connected');
  return client;
}

module.exports = { connectDB };
```

### パターン3: Express + Redis（キャッシュ）

```javascript
// lib/cache.js
const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL
});

client.on('error', (err) => console.log('Redis Error', err));

async function getCache(key) {
  return await client.get(key);
}

async function setCache(key, value, expiry = 3600) {
  await client.setEx(key, expiry, JSON.stringify(value));
}

module.exports = { getCache, setCache };
```

```javascript
// server.js
const { getCache, setCache } = require('./lib/cache');

app.get('/api/data', async (req, res) => {
  const cacheKey = 'api:data';

  // キャッシュ確認
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // データ取得
  const data = await fetchDataFromDB();

  // キャッシュ保存
  await setCache(cacheKey, data, 300); // 5分間

  res.json(data);
});
```

### パターン4: WebSocket（Express専用）

```javascript
// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('message', (data) => {
    console.log('Message:', data);
    io.emit('message', data); // 全員に送信
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Server with WebSocket running on port 3000');
});
```

**注意**: WebSocketはサーバーレスでは使えない（長時間接続が必要）

---

## 🎯 ケーススタディ: Express → Vercel移行

### Before: Express構成

```javascript
// server.js
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static('public'));

app.post('/api/process', upload.single('image'), async (req, res) => {
  try {
    const processed = await sharp(req.file.buffer)
      .resize(800, 800)
      .jpeg()
      .toBuffer();

    const base64 = processed.toString('base64');
    res.json({ image: `data:image/jpeg;base64,${base64}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

### After: Vercel Functions構成

**共通ロジック分離:**

```javascript
// lib/upload.js
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
}).single('image');

module.exports = { upload };
```

```javascript
// lib/processor.js
const sharp = require('sharp');

async function processImage(req, res) {
  try {
    const processed = await sharp(req.file.buffer)
      .resize(800, 800)
      .jpeg()
      .toBuffer();

    const base64 = processed.toString('base64');
    res.json({ image: `data:image/jpeg;base64,${base64}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { processImage };
```

**Vercel Functions:**

```javascript
// api/process.js
const { upload } = require('../lib/upload');
const { processImage } = require('../lib/processor');

module.exports = (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    processImage(req, res);
  });
};
```

**メリット:**
- ✅ `server.js` 不要
- ✅ Express不要（依存関係削減）
- ✅ 自動スケーリング
- ✅ デプロイ自動化（Git push）

---

## 📊 コスト比較

### Express on VPS

| 項目 | 月額 |
|------|------|
| VPS（2GB RAM） | $10-20 |
| ドメイン | $1-2 |
| SSL証明書 | 無料（Let's Encrypt） |
| **合計** | **$11-22/月** |

- 固定費
- トラフィック増加時はスケールアップ必要
- サーバー管理が必要

### Vercel Functions

| 項目 | 無料枠 | 超過時 |
|------|--------|--------|
| 実行時間 | 100GB-時間/月 | $0.40/GB-時間 |
| リクエスト | 無制限 | 無料 |
| 帯域幅 | 100GB/月 | $0.15/GB |

- 従量課金
- 小規模なら**完全無料**
- トラフィック増加時も自動対応

**結論**: 月間100万リクエスト以下なら**Vercelが圧倒的に安い**

---

## 🔧 トラブルシューティング

### Express関連

#### Q: ポート3000が使用中

```bash
# プロセスを確認
lsof -i :3000

# プロセスをキル
kill -9 <PID>

# または別のポートを使う
PORT=3001 npm start
```

#### Q: CORS エラー

```javascript
// より詳細なCORS設定
const cors = require('cors');

app.use(cors({
  origin: ['http://localhost:3000', 'https://your-domain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
```

#### Q: ファイルアップロードが失敗

```javascript
// Content-Typeを確認
console.log('Content-Type:', req.headers['content-type']);

// multipart/form-data であることを確認
// フロントエンドでFormDataを使用
const formData = new FormData();
formData.append('image', file);
```

### Vercel Functions関連

#### Q: 413 Payload Too Large

- Vercelは本文サイズ制限: **4.5MB**
- 解決策: クライアント側で画像圧縮

```javascript
// public/app.js - クライアント側圧縮
async function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1920;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
```

#### Q: タイムアウト（10秒）

- Vercel無料プランは**10秒**制限
- 解決策:
  1. 処理の最適化
  2. Proプラン（60秒）にアップグレード
  3. 非同期処理（Queue）に移行

#### Q: メモリ不足

- デフォルト: **1024MB**
- 解決策: `vercel.json` で調整

```json
{
  "functions": {
    "api/process.js": {
      "memory": 3008
    }
  }
}
```

---

## 🎓 まとめ

### Express.js を使うべき場合

✅ **リアルタイム通信が必要**（WebSocket）
✅ **長時間処理がある**（15分以上）
✅ **大容量ファイル処理**（4.5MB以上）
✅ **既存Expressアプリの移植**
✅ **完全なコントロールが必要**

### サーバーレス（Vercel/Lambda）を使うべき場合

✅ **スタートアップ・MVP開発**
✅ **トラフィックが不規則**
✅ **運用コストを下げたい**
✅ **自動スケーリングが必要**
✅ **静的サイト + API**

### ハイブリッド構成を使うべき場合

⚠️ **基本的に非推奨**（環境不一致リスク）

ただし、以下の場合は検討可：
- Express → サーバーレスへの段階的移行中
- 特定機能だけサーバーレス化したい

---

**このガイドがExpress.jsとサーバーレスの実装・移行に役立つことを願っています！**

作成日: 2025-10-28
バージョン: 1.0.0
対象: Express.js、Vercel Functions、AWS Lambda等のサーバーレス環境
