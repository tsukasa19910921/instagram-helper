// src/shared/processor.js
const sharp = require('sharp');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Buffer } = require('node:buffer');

// Stability AI APIで画像を加工する関数
async function processImageWithStability(imageBuffer, style) {
    const apiKey = process.env.STABILITY_API_KEY;

    if (!apiKey) {
        console.warn('Stability AI APIキーが設定されていません');
        return null;
    }

    // スタイルに応じたプロンプト
    const stylePrompts = {
        'anime': 'anime style, illustration, 2d animation, japanese anime, cartoon',
        'vintage': 'vintage photo, retro, film grain, nostalgic, old photograph, sepia',
        'sparkle': 'sparkly, glittery, magical, shimmering effects, glamorous, dreamy'
    };

    try {
        // ネイティブのFormDataとBlobを使用
        const form = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
        form.append('init_image', blob, 'image.jpg');

        // テキストプロンプト
        form.append('text_prompts[0][text]', stylePrompts[style] || 'enhance the image');
        form.append('text_prompts[0][weight]', '1');

        // 画像変換パラメータ
        form.append('init_image_mode', 'IMAGE_STRENGTH');
        form.append('image_strength', '0.35');  // 0.35 = 元画像を65%保持
        form.append('samples', '1');
        form.append('steps', '30');
        form.append('cfg_scale', '7');
        // width/heightは指定しない（v1 APIでは入力画像のサイズがそのまま使用される）

        const response = await fetch(
            'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image',
            {
                method: 'POST',
                // Content-Typeを自分で設定しない（fetchが自動的にboundaryを設定）
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                },
                body: form
            }
        );

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            console.error(`Stability API エラー: ${response.status} ${response.statusText}`, errorText);
            return null;
        }

        const json = await response.json();

        // レスポンスから画像を取得（複数の可能性に対応）
        const artifact = json.artifacts && json.artifacts[0];
        const base64Image = artifact?.base64 ||
                           artifact?.b64 ||
                           json.image_base64 ||
                           json.image;

        if (!base64Image) {
            console.error('Stability APIから画像を取得できませんでした');
            return null;
        }

        // BufferとDataURLの両方を返す
        const buffer = Buffer.from(base64Image, 'base64');
        return {
            buffer: buffer,
            dataUrl: `data:image/jpeg;base64,${base64Image}`,
            base64: base64Image
        };

    } catch (error) {
        console.error('Stability AI処理エラー:', error);
        return null;
    }
}

// プロンプト生成
function buildPrompt({ textStyle, hashtagCount, language, characterStyle, requiredKeyword }) {
  const stylePrompt = {
    'serious': 'プロフェッショナルで信頼感のある文章',
    'humor': 'ユーモアがあって親しみやすい文章',
    'sparkle': 'キラキラした感じの楽しい文章',
    'passionate': '情熱的でエネルギッシュな文章',
    'casual': 'カジュアルで気軽な文章',
    'elegant': 'エレガントで洗練された文章'
  }[textStyle] || 'プロフェッショナルで信頼感のある文章';

  const characterPrompt = {
    'masculine': '男性的で力強い言葉遣い',
    'feminine': '女性的で優しい言葉遣い',
    'neutral': '中性的でニュートラルな言葉遣い'
  }[characterStyle] || '中性的でニュートラルな言葉遣い';

  // 数値として処理
  const count = parseInt(hashtagCount) || 10;

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

  const keywordInstruction = requiredKeyword
    ? `重要: 投稿文に「${requiredKeyword}」というキーワードを必ず含めてください。自然な形で文章に組み込んでください。\nハッシュタグにも#${requiredKeyword}を必ず含めてください。\n\n`
    : '';

  return `
この画像を見て、Instagram投稿用の文章を生成してください。

${keywordInstruction}言語設定: ${languageInstructions}
文章のスタイル: ${stylePrompt}
キャラクター: ${characterPrompt}

以下の形式で出力してください：

【投稿文】
（ここに投稿文を書く）

【ハッシュタグ】
（${hashtagLanguage}を#付きで**厳密に${count}個だけ**記載してください。必ず${count}個にしてください。多くても少なくてもいけません）
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
async function generateCaption({ base64Image, textStyle, hashtagCount, language, characterStyle, requiredKeyword }) {
  const apiKey = process.env.GEMINI_API_KEY;

  // APIキーがない場合のデフォルト
  if (!apiKey) {
    return {
      generatedText: '素敵な写真が撮れました！✨',
      hashtags: '#instagram #photo #instagood'
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Gemini 2.5 Flash-Liteを使用（高速・低コスト版）
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      maxOutputTokens: 500,
      temperature: 0.7
    }
  });

  const prompt = buildPrompt({ textStyle, hashtagCount, language, characterStyle, requiredKeyword });

  // リトライ機能付きAPI呼び出し
  async function callWithRetry(func, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await func();
      } catch (error) {
        const msg = String(error?.message || error);
        const retriable = /(?:429|500|502|503|504)/.test(msg);
        const notFound = /404/.test(msg);

        console.log(`API呼び出し失敗 (試行 ${i + 1}/${maxRetries}):`, error.message);

        // 404の場合はモデル名の問題の可能性を示唆
        if (notFound) {
          console.error('モデルが見つかりません。Gemini 2.5 Flashを使用してください。');
          throw error;
        }
        if (!retriable || i === maxRetries - 1) throw error;

        const waitTime = 2000 * (i + 1);
        console.log(`${waitTime}ms 待機してリトライします...`);
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
  }

  try {
    console.log('Gemini APIを呼び出し中...');
    console.log('使用モデル: gemini-2.5-flash-lite');
    console.log('APIキー存在確認:', !!apiKey);

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

    console.log('API呼び出し成功、レスポンス取得中...');
    const response = await result.response;

    // レスポンスの詳細を確認
    console.log('レスポンスオブジェクト:', response);
    console.log('response.text関数存在:', typeof response.text);

    const fullText = response.text() || '';

    console.log('API応答全文:', fullText);
    console.log('API応答長さ:', fullText.length);

    // 投稿文とハッシュタグを分離
    const textMatch = fullText.match(/【投稿文】\s*([\s\S]*?)【ハッシュタグ】/);
    const hashtagMatch = fullText.match(/【ハッシュタグ】\s*([\s\S]*)/);

    console.log('textMatch:', textMatch ? '見つかりました' : '見つかりません');
    console.log('hashtagMatch:', hashtagMatch ? '見つかりました' : '見つかりません');

    let generatedText = textMatch ? textMatch[1].trim() : '素敵な写真が撮れました！✨';
    let hashtags = hashtagMatch ? hashtagMatch[1].trim() : '#instagram #photo #instagood';

    // 必須キーワードがハッシュタグに含まれていない場合、最初に追加
    if (requiredKeyword && !hashtags.includes(`#${requiredKeyword}`)) {
      hashtags = `#${requiredKeyword} ${hashtags}`;
    }

    return { generatedText, hashtags };
  } catch (error) {
    console.error('Gemini API Error:', error);
    console.error('エラーの詳細:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      stack: error.stack
    });
    return {
      generatedText: '素敵な写真が撮れました！✨',
      hashtags: '#instagram #photo #instagood'
    };
  }
}

// 統一リクエストハンドラ（Express/Vercel両対応）
async function unifiedProcessHandler({ imageBuffer, params }, res) {
  try {
    // パラメータ取得
    const { textStyle, hashtagCount, language, characterStyle, imageStyle, requiredKeyword } = params;

    // 画像処理
    let processedImageResult;

    // 画像加工機能の有効/無効フラグ（将来的に有効化する際はtrueに変更）
    const ENABLE_IMAGE_STYLING = false;

    if (ENABLE_IMAGE_STYLING && imageStyle && imageStyle !== 'none') {
        // まず正方形にトリミング（1024x1024）
        console.log('画像を正方形にトリミング中...');
        const squareBuffer = await sharp(imageBuffer)
            .rotate()
            .resize(1024, 1024, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 90 })
            .toBuffer();

        // Stability AIで加工
        console.log(`Stability AIで${imageStyle}スタイルに加工中...`);
        const styledResult = await processImageWithStability(squareBuffer, imageStyle);

        if (styledResult && styledResult.buffer) {
            // 成功：最終リサイズ（1080x1080）
            const finalBuffer = await sharp(styledResult.buffer)
                .resize(1080, 1080)
                .jpeg({ quality: 90 })
                .toBuffer();

            const base64Final = finalBuffer.toString('base64');
            processedImageResult = {
                dataUrl: `data:image/jpeg;base64,${base64Final}`,
                base64: base64Final
            };
            console.log('Stability AI処理成功');
        } else {
            // 失敗：トリミングのみの結果を使用
            console.log('Stability AI処理失敗、通常のトリミングを使用');
            processedImageResult = await processImageToSquare(imageBuffer);
        }
    } else {
        // 通常のトリミングのみ（現在はこちらが常に実行される）
        console.log('画像を処理中...');
        processedImageResult = await processImageToSquare(imageBuffer);
    }

    const { dataUrl, base64 } = processedImageResult;

    // AI文章生成
    const { generatedText, hashtags } = await generateCaption({
      base64Image: base64,
      textStyle,
      hashtagCount,
      language,
      characterStyle,
      requiredKeyword
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