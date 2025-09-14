// Vercel Functions用のAPIエンドポイント
const multer = require('multer');
const sharp = require('sharp');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// メモリストレージを使用（Vercelではディスク書き込み不可）
const storage = multer.memoryStorage();

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
        fileSize: 10 * 1024 * 1024 // 10MB
    }
}).single('image');

// Gemini APIの初期化
let genAI = null;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

module.exports = async (req, res) => {
    // CORSヘッダーの設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // OPTIONSリクエストの処理
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // POSTリクエストのみ受け付ける
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    // Multerでファイルアップロードを処理
    upload(req, res, async (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'ファイルサイズが大きすぎます。10MB以下の画像をアップロードしてください。' });
            }
            return res.status(400).json({ error: err.message });
        }

        try {
            if (!req.file) {
                return res.status(400).json({ error: '画像ファイルがアップロードされていません。' });
            }

            // リクエストボディから設定を取得
            const { textStyle, hashtagAmount, language } = req.body;

            // 画像を1:1にトリミング（メモリ上で処理）
            const image = sharp(req.file.buffer).rotate();
            const metadata = await image.metadata();

            // 正方形にトリミング（中央から切り取り）
            const size = Math.min(metadata.width, metadata.height);
            const left = Math.floor((metadata.width - size) / 2);
            const top = Math.floor((metadata.height - size) / 2);

            // 処理済み画像をバッファとして取得
            const processedImageBuffer = await sharp(req.file.buffer)
                .rotate() // EXIF情報に基づいて自動回転
                .extract({ left, top, width: size, height: size })
                .resize(1080, 1080) // Instagramの推奨サイズ
                .jpeg({ quality: 90 })
                .toBuffer();

            // Base64エンコード（クライアントに返すため）
            const processedImageBase64 = processedImageBuffer.toString('base64');
            const processedImageDataUrl = `data:image/jpeg;base64,${processedImageBase64}`;

            // Gemini APIで画像を解析して文章を生成
            let generatedText = '';
            let hashtags = '';

            if (genAI) {
                try {
                    // Gemini 1.5 Flashモデルを使用
                    const model = genAI.getGenerativeModel({
                        model: 'gemini-1.5-flash',
                        generationConfig: {
                            maxOutputTokens: 500,  // 処理時間短縮のため制限
                            temperature: 0.7
                        }
                    });

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

                    // API呼び出し（タイムアウト対策のため最小限のリトライ）
                    const result = await model.generateContent([
                        prompt,
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: processedImageBase64
                            }
                        }
                    ]);

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

            // レスポンスを返す
            res.status(200).json({
                success: true,
                processedImage: processedImageDataUrl,  // Data URLとして返す
                generatedText: generatedText,
                hashtags: hashtags
            });

        } catch (error) {
            console.error('画像処理エラー:', error);
            res.status(500).json({
                error: 'サーバーエラーが発生しました。',
                details: error.message
            });
        }
    });
};