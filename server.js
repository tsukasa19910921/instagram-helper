// 必要なモジュールのインポート
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Expressアプリケーションの初期化
const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェアの設定
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// アップロードディレクトリの作成（存在しない場合）
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multerの設定（ファイルアップロード用）
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // ユニークなファイル名を生成
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// ファイルフィルター（画像ファイルのみ許可）
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('許可されていないファイル形式です。JPG、PNG、GIFのみアップロード可能です。'), false);
    }
};

// Multerインスタンスの作成
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
    }
});

// Gemini APIの初期化
let genAI = null;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// ルートエンドポイント
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 画像アップロードと処理のエンドポイント
app.post('/api/process', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '画像ファイルがアップロードされていません。' });
        }

        // リクエストボディから設定を取得
        const { textStyle, hashtagAmount, language } = req.body;

        // アップロードされた画像のパス
        const inputPath = req.file.path;
        const outputFilename = `processed-${req.file.filename}`;
        const outputPath = path.join(uploadDir, outputFilename);

        // 画像を1:1にトリミング（Sharp使用）
        // rotate()でEXIF情報に基づいて自動回転を適用
        const image = sharp(inputPath).rotate();
        const metadata = await image.metadata();

        // 正方形にトリミング（中央から切り取り）
        const size = Math.min(metadata.width, metadata.height);
        const left = Math.floor((metadata.width - size) / 2);
        const top = Math.floor((metadata.height - size) / 2);

        await sharp(inputPath)
            .rotate() // EXIF情報に基づいて自動回転
            .extract({ left, top, width: size, height: size })
            .resize(1080, 1080) // Instagramの推奨サイズ
            .jpeg({ quality: 90 })
            .toFile(outputPath);

        // Gemini APIで画像を解析して文章を生成
        let generatedText = '';
        let hashtags = '';

        if (genAI) {
            try {
                // 画像をBase64エンコード
                const imageBuffer = fs.readFileSync(outputPath);
                const base64Image = imageBuffer.toString('base64');

                // Gemini 1.5 Flashモデルを使用（最新の画像解析対応モデル）
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

                // プロンプトの作成
                const stylePrompt = {
                    'serious': 'プロフェッショナルで信頼感のある文章',
                    'humor': 'ユーモアがあって親しみやすい文章',
                    'sparkle': 'キラキラした感じの楽しい文章'
                }[textStyle] || 'プロフェッショナルで信頼感のある文章';

                const hashtagPrompt = {
                    'many': '15個以上',
                    'normal': '8〜10個',
                    'few': '3〜5個'
                }[hashtagAmount] || '8〜10個';

                // 言語設定の処理
                const languageInstructions = {
                    'japanese': '日本語で書いてください。',
                    'english': '英語で書いてください。',
                    'bilingual': '日本語と英語の併記で書いてください。日本語を先に、その後に英語訳を記載してください。'
                }[language] || '日本語で書いてください。';

                const hashtagLanguage = {
                    'japanese': '日本語のハッシュタグ',
                    'english': '英語のハッシュタグ',
                    'bilingual': '日本語と英語両方のハッシュタグをバランスよく'
                }[language] || '日本語のハッシュタグ';

                const prompt = `
                    この画像を見て、Instagram投稿用の文章を生成してください。

                    言語設定: ${languageInstructions}
                    文章のスタイル: ${stylePrompt}

                    以下の形式で出力してください：

                    【投稿文】
                    （ここに投稿文を書く）

                    【ハッシュタグ】
                    （${hashtagPrompt}の${hashtagLanguage}を#付きで記載）
                `;

                // リトライ機能付きのAPI呼び出し関数
                async function callWithRetry(func, maxRetries = 3) {
                    for (let i = 0; i < maxRetries; i++) {
                        try {
                            return await func();
                        } catch (error) {
                            console.log(`API呼び出し失敗 (試行 ${i + 1}/${maxRetries}):`, error.message);
                            if (error.message.includes('503') && i < maxRetries - 1) {
                                // 503エラーの場合、指数バックオフで待機
                                const waitTime = 2000 * (i + 1);
                                console.log(`${waitTime}ms 待機してリトライします...`);
                                await new Promise(r => setTimeout(r, waitTime));
                                continue;
                            }
                            throw error;
                        }
                    }
                }

                // シンプルな形式でAPIリクエスト（リトライ機能付き）
                const result = await callWithRetry(() =>
                    model.generateContent([
                        prompt,
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: base64Image
                            }
                        }
                    ])
                );

                const response = await result.response;
                const fullText = response.text();

                // 投稿文とハッシュタグを分離
                const textMatch = fullText.match(/【投稿文】\s*([\s\S]*?)【ハッシュタグ】/);
                const hashtagMatch = fullText.match(/【ハッシュタグ】\s*([\s\S]*)/);

                generatedText = textMatch ? textMatch[1].trim() : '';
                hashtags = hashtagMatch ? hashtagMatch[1].trim() : '';

            } catch (apiError) {
                console.error('Gemini API エラー:', apiError);
                // APIエラーの場合はデフォルトのテキストを使用
                generatedText = '素敵な写真が撮れました！✨';
                hashtags = '#instagram #photo #instagood';
            }
        } else {
            // API キーが設定されていない場合のデフォルト
            generatedText = '素敵な写真が撮れました！✨';
            hashtags = '#instagram #photo #instagood';
        }

        // 元の画像を削除（処理済み画像のみ保持）
        fs.unlinkSync(inputPath);

        // レスポンスを返す
        res.json({
            success: true,
            processedImage: `/api/image/${outputFilename}`,
            generatedText: generatedText,
            hashtags: hashtags
        });

    } catch (error) {
        console.error('画像処理エラー:', error);

        // エラー時はアップロードされたファイルを削除
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            error: 'サーバーエラーが発生しました。',
            details: error.message
        });
    }
});

// 処理済み画像を取得するエンドポイント
app.get('/api/image/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(uploadDir, filename);

    // セキュリティチェック（ディレクトリトラバーサル防止）
    if (!filename.match(/^processed-[\d-]+\.(jpg|jpeg|png|gif)$/i)) {
        return res.status(400).json({ error: '不正なファイル名です。' });
    }

    if (fs.existsSync(filepath)) {
        res.sendFile(path.resolve(filepath));
    } else {
        res.status(404).json({ error: 'ファイルが見つかりません。' });
    }
});

// エラーハンドリングミドルウェア
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'ファイルサイズが大きすぎます。10MB以下の画像をアップロードしてください。' });
        }
    }
    res.status(500).json({ error: error.message });
});

// サーバーの起動
app.listen(PORT, () => {
    console.log(`🚀 サーバーが起動しました: http://localhost:${PORT}`);
    console.log(`📸 Instagram Helper アプリケーション`);

    if (!process.env.GEMINI_API_KEY) {
        console.warn('⚠️  警告: GEMINI_API_KEY が設定されていません。');
        console.warn('   文章生成機能が制限されます。');
    }
});