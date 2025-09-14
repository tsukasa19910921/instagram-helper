// src/shared/processor.js
const sharp = require('sharp');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// プロンプト生成
function buildPrompt({ textStyle, hashtagAmount, language }) {
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

  return `
この画像を見て、Instagram投稿用の文章を生成してください。

言語設定: ${languageInstructions}
文章のスタイル: ${stylePrompt}

以下の形式で出力してください：

【投稿文】
（ここに投稿文を書く）

【ハッシュタグ】
（${hashtagPrompt}の${hashtagLanguage}を#付きで記載）
`.trim();
}

// 画像処理（1:1正方形、1080px）
async function processImageToSquare(buffer) {
  const image = sharp(buffer).rotate();
  const metadata = await image.metadata();

  // 正方形にトリミング（中央から）
  const size = Math.min(metadata.width, metadata.height);
  const left = Math.floor((metadata.width - size) / 2);
  const top = Math.floor((metadata.height - size) / 2);

  const processedBuffer = await sharp(buffer)
    .rotate() // EXIF情報に基づく自動回転
    .extract({ left, top, width: size, height: size })
    .resize(1080, 1080) // Instagram推奨サイズ
    .jpeg({ quality: 90 })
    .toBuffer();

  // Data URL形式に変換
  const base64 = processedBuffer.toString('base64');
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  return { processedBuffer, dataUrl, base64 };
}

// Gemini APIでキャプション生成
async function generateCaption({ base64Image, textStyle, hashtagAmount, language }) {
  const apiKey = process.env.GEMINI_API_KEY;

  // APIキーがない場合のデフォルト
  if (!apiKey) {
    return {
      generatedText: '素敵な写真が撮れました！✨',
      hashtags: '#instagram #photo #instagood'
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      maxOutputTokens: 500,
      temperature: 0.7
    }
  });

  const prompt = buildPrompt({ textStyle, hashtagAmount, language });

  // リトライ機能付きAPI呼び出し
  async function callWithRetry(func, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await func();
      } catch (error) {
        console.log(`API呼び出し失敗 (試行 ${i + 1}/${maxRetries}):`, error.message);
        if (error.message.includes('503') && i < maxRetries - 1) {
          const waitTime = 2000 * (i + 1);
          console.log(`${waitTime}ms 待機してリトライします...`);
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }
        throw error;
      }
    }
  }

  try {
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
    const fullText = response.text() || '';

    // 投稿文とハッシュタグを分離
    const textMatch = fullText.match(/【投稿文】\s*([\s\S]*?)【ハッシュタグ】/);
    const hashtagMatch = fullText.match(/【ハッシュタグ】\s*([\s\S]*)/);

    return {
      generatedText: textMatch ? textMatch[1].trim() : '素敵な写真が撮れました！✨',
      hashtags: hashtagMatch ? hashtagMatch[1].trim() : '#instagram #photo #instagood'
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
    return {
      generatedText: '素敵な写真が撮れました！✨',
      hashtags: '#instagram #photo #instagood'
    };
  }
}

// 統一リクエストハンドラ（Express/Vercel両対応）
async function unifiedProcessHandler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONSリクエスト処理
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POSTのみ受付
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ファイル検証
    if (!req.file) {
      return res.status(400).json({ error: '画像ファイルがアップロードされていません。' });
    }

    // パラメータ取得
    const { textStyle, hashtagAmount, language } = req.body || {};

    // 画像処理（メモリ内）
    const { dataUrl, base64 } = await processImageToSquare(req.file.buffer);

    // AI文章生成
    const { generatedText, hashtags } = await generateCaption({
      base64Image: base64,
      textStyle,
      hashtagAmount,
      language
    });

    // 統一レスポンス（Data URL形式）
    return res.status(200).json({
      success: true,
      processedImage: dataUrl,  // Data URL統一
      generatedText,
      hashtags
    });

  } catch (error) {
    console.error('Processing error:', error);
    return res.status(500).json({
      error: 'サーバーエラーが発生しました。',
      details: error.message
    });
  }
}

module.exports = { unifiedProcessHandler };