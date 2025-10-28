# 📋 Instagram Helper API - JSON形式対応 修正指示書

## 🎯 修正の目的

Instagram Helper WEBアプリのAPIを、現在の **FormData形式** から **JSON形式** にも対応させます。

### なぜJSON形式が必要なのか？

現在開発中の **React Nativeアプリ（iOS/Android対応）** では、以下の理由からJSON形式での通信が推奨されています：

1. **信頼性の向上**：FormDataはReact Nativeでファイルパスの扱いが複雑で、送信失敗のリスクがあります
2. **保守性の向上**：WEB/Native/将来の他プラットフォームで同一のAPI仕様を使用できます
3. **デバッグの容易さ**：JSON形式の方がリクエスト内容の確認が簡単です
4. **Modern Practice**：現代的なAPI設計では、画像をBase64エンコードしてJSONで送信するのが一般的です

### 後方互換性について

**⚠️ 重要**: 既存のWEBアプリは修正後も動作し続けます。

- ✅ FormData形式とJSON形式の**両方に対応**します
- ✅ 既存のWEBアプリを段階的に移行できます
- ✅ 先にNativeアプリをリリースし、後でWEBアプリも移行可能です

---

## 📁 修正対象ファイル

修正が必要なファイルは以下の3つです：

```
instagram投稿自動生成/
├── api/
│   └── process.js          ← ✏️ 修正（JSON形式を受け付ける）
├── lib/
│   └── processor.js        ← ✏️ 修正（引数の形式を変更）
└── public/
    └── app.js              ← ✏️ 修正（JSON形式で送信）
```

---

## 🔧 詳細な修正手順

### 1️⃣ `api/process.js` の修正

**修正内容**: FormDataとJSON両方の形式を受け付けるように変更します。

#### 📝 修正前（現在のコード）

```javascript
// api/process.js
const { upload } = require('../lib/upload');
const { unifiedProcessHandler } = require('../lib/processor');

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
```

#### ✅ 修正後（新しいコード）

```javascript
// api/process.js
const { upload } = require('../lib/upload');
const { unifiedProcessHandler } = require('../lib/processor');

module.exports = async (req, res) => {
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
      const { imageBase64, textStyle, hashtagAmount, language, characterStyle, imageStyle, requiredKeyword } = req.body;

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
      params = { textStyle, hashtagAmount, language, characterStyle, imageStyle, requiredKeyword };

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
};
```

#### 💡 変更点の説明

1. **非同期関数に変更**: `module.exports = async (req, res) => {`
   - Promise処理のため`async/await`を使用

2. **CORS設定を追加**: ブラウザからのクロスオリジンリクエストを許可
   - ※React Nativeアプリは基本的にCORSの影響を受けません

3. **POSTメソッド以外を拒否**: セキュリティ向上のため、POST以外は405エラーを返す

4. **Content-Typeで分岐**:
   - `application/json` → JSON形式として処理（新規）
   - `multipart/form-data` → FormData形式として処理（既存）
   - それ以外 → 415エラー（Unsupported Media Type）

5. **Base64サイズチェック**: JSON形式の場合、約10MB（Base64で14MB）以上は413エラー

6. **統一されたインターフェース**: どちらの形式でも`{ imageBuffer, params }`の形式で次の処理に渡す

---

### 2️⃣ `lib/processor.js` の修正

**修正内容**: `unifiedProcessHandler` 関数の引数を変更します。

#### 📝 修正前（現在のコード）

```javascript
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
    const { textStyle, hashtagAmount, language, characterStyle, imageStyle, requiredKeyword } = req.body || {};

    // 画像処理
    let processedImageResult;

    // ... (画像処理のコードは省略)

    processedImageResult = await processImageToSquare(req.file.buffer);

    const { dataUrl, base64 } = processedImageResult;

    // AI文章生成
    const { generatedText, hashtags } = await generateCaption({
      base64Image: base64,
      textStyle,
      hashtagAmount,
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
```

#### ✅ 修正後（新しいコード）

```javascript
// 統一リクエストハンドラ（Express/Vercel両対応）
async function unifiedProcessHandler({ imageBuffer, params }, res) {
  try {
    // パラメータ取得
    const { textStyle, hashtagAmount, language, characterStyle, imageStyle, requiredKeyword } = params;

    // 画像処理
    let processedImageResult;

    // 画像加工機能の有効/無効フラグ（将来的に有効化する際はtrueに変更）
    const ENABLE_IMAGE_STYLING = false;

    if (ENABLE_IMAGE_STYLING && imageStyle && imageStyle !== 'none') {
        // Stability AIでの加工処理（省略）
        console.log('画像加工機能は現在無効です');
        processedImageResult = await processImageToSquare(imageBuffer);
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
      hashtagAmount,
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
```

#### 💡 変更点の説明

1. **引数の変更**:
   - 修正前: `(req, res)`
   - 修正後: `({ imageBuffer, params }, res)`
   - → `req.file.buffer` の代わりに `imageBuffer` を直接受け取る

2. **CORS処理の削除**: `api/process.js`で処理するため削除

3. **パラメータ取得の簡素化**: `params`オブジェクトから直接取得

4. **画像処理**: `req.file.buffer` → `imageBuffer` に変更

---

### 3️⃣ `public/app.js` の修正

**修正内容**: フロントエンドをJSON形式で送信するように変更します。

#### 📝 修正前（現在のコード）

```javascript
// 処理ボタンクリック
processButton.addEventListener('click', async () => {
    if (!selectedFile) {
        showToast(window.i18n ? i18n.t('toast.selectImage') : '画像を選択してください', 'error');
        return;
    }

    // 必須キーワードの検証
    const requiredKeyword = requiredKeywordInput ? requiredKeywordInput.value.trim() : '';

    // 共通関数で検証
    if (!validateRequiredKeyword(requiredKeyword)) {
        showToast(window.i18n ? i18n.t('toast.keywordError') : '必須キーワードは空白を含まない一単語で入力してください', 'error');
        return;
    }

    // UI状態の更新
    processButton.disabled = true;
    loadingSection.classList.remove('hidden');
    resultSection.classList.add('hidden');

    // FormDataの作成
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('textStyle', textStyle.value);
    formData.append('hashtagAmount', hashtagAmount.value);
    formData.append('language', document.getElementById('language').value);
    formData.append('characterStyle', document.getElementById('characterStyle').value);
    formData.append('imageStyle', document.getElementById('imageStyle').value);
    if (requiredKeyword) {
        formData.append('requiredKeyword', requiredKeyword);
    }

    try {
        // サーバーに送信
        const apiEndpoint = window.location.hostname === 'localhost'
            ? '/api/process'
            : '/api/process';

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            body: formData
        });

        // エラーハンドリング（省略）

        const data = await response.json();
        displayResults(data);

    } catch (error) {
        console.error('処理エラー:', error);
        showToast(error.message || (window.i18n ? i18n.t('toast.processingError') : '処理中にエラーが発生しました'), 'error');
        processButton.disabled = false;
        loadingSection.classList.add('hidden');
    }
});
```

#### ✅ 修正後（新しいコード）

```javascript
// ========================================
// ヘルパー関数: ファイルをBase64に変換
// ========================================
/**
 * ファイルオブジェクトをBase64文字列に変換します
 * @param {File} file - 変換するファイル
 * @returns {Promise<string>} Base64文字列（data:プレフィックスなし）
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // data:image/jpeg;base64, の部分を除去して純粋なBase64文字列のみ返す
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ========================================
// 処理ボタンクリック
// ========================================
processButton.addEventListener('click', async () => {
    if (!selectedFile) {
        showToast(window.i18n ? i18n.t('toast.selectImage') : '画像を選択してください', 'error');
        return;
    }

    // 必須キーワードの検証
    const requiredKeyword = requiredKeywordInput ? requiredKeywordInput.value.trim() : '';

    // 共通関数で検証
    if (!validateRequiredKeyword(requiredKeyword)) {
        showToast(window.i18n ? i18n.t('toast.keywordError') : '必須キーワードは空白を含まない一単語で入力してください', 'error');
        return;
    }

    // UI状態の更新
    processButton.disabled = true;
    loadingSection.classList.remove('hidden');
    resultSection.classList.add('hidden');

    try {
        // ========================================
        // 画像をBase64に変換
        // ========================================
        console.log('画像をBase64に変換中...');
        const base64Image = await fileToBase64(selectedFile);
        console.log('Base64変換完了:', base64Image.length, '文字');

        // ========================================
        // JSON形式で送信
        // ========================================
        const requestBody = {
            imageBase64: base64Image,
            textStyle: textStyle.value,
            hashtagAmount: hashtagAmount.value,
            language: document.getElementById('language').value,
            characterStyle: document.getElementById('characterStyle').value,
            imageStyle: document.getElementById('imageStyle').value,
            requiredKeyword: requiredKeyword || ''
        };

        console.log('APIリクエスト送信中...', {
            textStyle: requestBody.textStyle,
            hashtagAmount: requestBody.hashtagAmount,
            language: requestBody.language,
            imageBase64Length: requestBody.imageBase64.length
        });

        const response = await fetch('/api/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        // エラーハンドリングの改善
        if (!response.ok) {
            let errorMessage = window.i18n ? i18n.t('toast.serverError') : 'サーバーエラーが発生しました';

            // ステータスコードに応じたメッセージ
            if (response.status === 413) {
                errorMessage = window.i18n ? i18n.t('toast.fileSizeTooLarge') : 'ファイルサイズが大きすぎます。画像を圧縮してください。';
            } else if (response.status === 504 || response.status === 408) {
                errorMessage = window.i18n ? i18n.t('toast.timeout') : '処理がタイムアウトしました。もう一度試すかより小さい画像をお試しください。';
            } else if (response.status === 500) {
                errorMessage = window.i18n ? i18n.t('toast.serverError') : 'サーバーエラーが発生しました。しばらく待ってから再度お試しください。';
            }

            // JSONレスポンスを試みる
            try {
                const data = await response.json();
                if (data.error) {
                    errorMessage = data.error;
                }
            } catch (e) {
                // JSONパース失敗の場合はデフォルトメッセージを使用
                console.error('Error response parsing failed:', e);
            }

            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('API応答受信:', data);

        // 結果の表示
        displayResults(data);

    } catch (error) {
        console.error('処理エラー:', error);
        showToast(error.message || (window.i18n ? i18n.t('toast.processingError') : '処理中にエラーが発生しました'), 'error');
        processButton.disabled = false;
        loadingSection.classList.add('hidden');
    }
});
```

#### 💡 変更点の説明

1. **ヘルパー関数の追加**: `fileToBase64()` でファイルをBase64に変換

2. **FormData → JSON形式に変更**:
   - 修正前: `const formData = new FormData(); formData.append('image', selectedFile);`
   - 修正後: `const base64Image = await fileToBase64(selectedFile);`

3. **Content-Typeヘッダーの追加**: `'Content-Type': 'application/json'`

4. **リクエストボディをJSON化**: `JSON.stringify(requestBody)`

5. **デバッグログの追加**: 開発時のトラブルシューティングを容易にするため

---

## ✅ テスト方法

修正後、以下の手順で動作確認を行ってください。

### 1. ローカル環境でのテスト

#### ステップ1: サーバーを起動

```bash
cd C:\Users\akats\OneDrive\デスクトップ\webapp\instagram投稿自動生成
npm run dev
```

#### ステップ2: ブラウザで動作確認

1. ブラウザで `http://localhost:3000` を開く
2. 画像をアップロード
3. 各種設定を行う
4. 「画像を加工して文章を生成」ボタンをクリック
5. 正常に結果が表示されることを確認

#### ステップ3: ブラウザコンソールで確認

1. ブラウザのデベロッパーツールを開く（F12）
2. Consoleタブを確認
3. 以下のログが表示されていることを確認：
   ```
   画像をBase64に変換中...
   Base64変換完了: 123456 文字
   APIリクエスト送信中...
   API応答受信: { success: true, ... }
   ```

#### ステップ4: Networkタブで確認

1. Networkタブを開く
2. `/api/process` のリクエストを確認
3. **Request Headers** に `Content-Type: application/json` が含まれていることを確認
4. **Request Payload** にJSON形式のデータが送信されていることを確認

### 2. Vercelへのデプロイとテスト

#### デプロイ

```bash
# Vercelにデプロイ
vercel --prod
```

#### 本番環境での確認

1. `https://instagram-helper.vercel.app` にアクセス
2. ローカル環境と同じテストを実行
3. 正常に動作することを確認

---

## 🔄 ロールバック方法

万が一、問題が発生した場合のロールバック手順です。

### 方法1: Gitで元に戻す

```bash
# 現在の変更を確認
git status

# 変更を破棄して元に戻す
git checkout -- api/process.js
git checkout -- lib/processor.js
git checkout -- public/app.js

# または、コミット前なら全て破棄
git reset --hard HEAD
```

### 方法2: バックアップから復元

修正前に以下のコマンドでバックアップを作成しておくことを推奨：

```bash
# バックアップを作成
cp api/process.js api/process.js.backup
cp lib/processor.js lib/processor.js.backup
cp public/app.js public/app.js.backup

# 問題が発生したら復元
cp api/process.js.backup api/process.js
cp lib/processor.js.backup lib/processor.js
cp public/app.js.backup public/app.js
```

---

## ❓ FAQ・トラブルシューティング

### Q1: 既存のWEBアプリが動かなくなった

**A**: `api/process.js` でFormData形式の処理が正しく実装されているか確認してください。

以下のログが表示されているか確認：
```
FormData形式のリクエストを受信しました
```

表示されない場合、Content-Typeの判定処理を確認してください。

---

### Q2: 画像が送信されない・エラーになる

**A**: Base64変換が正しく行われているか確認してください。

ブラウザコンソールで以下を確認：
```javascript
// Base64文字列の長さが表示されているか
Base64変換完了: 123456 文字
```

長さが0または極端に小さい場合、`fileToBase64()` 関数の実装を確認してください。

---

### Q3: サーバーエラー（500）が発生する

**A**: サーバー側のログを確認してください。

```bash
# ローカル環境の場合
npm run dev

# ターミナルに表示されるログを確認
```

よくあるエラー：
- `Buffer is not defined` → Node.jsのバージョンを確認（v14以上推奨）
- `Cannot read property 'buffer' of undefined` → `imageBuffer` が正しく渡されているか確認

---

### Q4: Vercelでデプロイしたら動かない

**A**: Vercel Functionsのタイムアウト設定を確認してください。

`vercel.json` の設定：
```json
{
  "version": 2,
  "functions": {
    "api/process.js": {
      "maxDuration": 10
    }
  }
}
```

必要に応じて `maxDuration` を増やしてください（最大60秒）。

---

### Q5: 画像サイズが大きすぎるエラーが出る

**A**: Vercelの制限（4.5MB）に注意してください。

対策：
1. フロントエンドで画像を圧縮してからBase64変換
2. 既存の `compressImage()` 関数を活用
3. Base64変換前に圧縮処理を実行

修正例（`public/app.js`）：
```javascript
// Base64変換前に圧縮
const compressedFile = await compressImage(selectedFile);
const base64Image = await fileToBase64(compressedFile);
```

---

### Q6: React Nativeアプリから接続できない

**A**: React Nativeアプリの場合、CORSは通常関係ありません。以下を確認してください：

1. **ネットワーク接続の確認**:
   - 実デバイスからサーバーへの疎通を確認
   - ローカルネットワークの場合、同じネットワークに接続しているか確認

2. **HTTPS/TLS証明書の確認**:
   - 本番環境のSSL証明書が有効か確認
   - 自己署名証明書の場合は適切な設定が必要

3. **エンドポイントURLの確認**:
   - `localhost`ではなく、実際のIPアドレスまたはドメインを使用
   - 例: `http://192.168.1.100:3000/api/process`（ローカル）
   - 例: `https://your-domain.vercel.app/api/process`（本番）

4. **リクエスト形式の確認**:
   - Content-Typeが`application/json`になっているか
   - Base64エンコードが正しく行われているか

5. **サーバーログの確認**:
   - リクエストがサーバーに到達しているか
   - エラーメッセージの詳細を確認

**ブラウザからの接続でCORSエラーが出る場合**:
```javascript
// api/process.js でCORS設定が必要（ブラウザのみ）
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
```

---

## 📊 修正前後の比較

### リクエスト形式の比較

#### 修正前（FormData）
```http
POST /api/process HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="image"; filename="photo.jpg"
Content-Type: image/jpeg

[バイナリデータ]
------WebKitFormBoundary...
Content-Disposition: form-data; name="textStyle"

serious
------WebKitFormBoundary...
```

#### 修正後（JSON）
```http
POST /api/process HTTP/1.1
Content-Type: application/json

{
  "imageBase64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "textStyle": "serious",
  "hashtagAmount": "normal",
  "language": "japanese",
  "characterStyle": "neutral",
  "imageStyle": "none",
  "requiredKeyword": ""
}
```

### レスポンス形式（変更なし）

```json
{
  "success": true,
  "processedImage": "data:image/jpeg;base64,...",
  "generatedText": "素敵な写真が撮れました！✨",
  "hashtags": "#instagram #photo #instagood"
}
```

---

## 📅 修正スケジュール（推奨）

### Day 1: 修正作業
1. バックアップの作成
2. 3ファイルの修正
3. ローカル環境でのテスト

### Day 2: デプロイとテスト
1. Vercelへのデプロイ
2. 本番環境でのテスト
3. 問題があればロールバック

### Day 3以降: React Nativeアプリ開発
1. NativeアプリからAPI接続テスト
2. 既存WEBアプリの段階的移行（任意）

---

## ✉️ サポート

修正中に問題が発生した場合は、以下の情報を共有してください：

1. **エラーメッセージ**: ブラウザコンソールまたはターミナルのログ
2. **再現手順**: エラーが発生する具体的な操作
3. **環境情報**: Node.jsのバージョン、OS、ブラウザ
4. **スクリーンショット**: エラー画面のキャプチャ

---

## 📝 チェックリスト

修正完了前に以下をチェックしてください：

- [ ] `api/process.js` の修正完了
- [ ] `lib/processor.js` の修正完了
- [ ] `public/app.js` の修正完了
- [ ] ローカル環境でのテスト成功
- [ ] ブラウザコンソールでJSON形式のログ確認
- [ ] Vercelへのデプロイ成功
- [ ] 本番環境でのテスト成功
- [ ] エラーハンドリングの確認
- [ ] 画像圧縮機能の動作確認
- [ ] 必須キーワード機能の動作確認

---

## 🎉 まとめ

この修正により、以下が実現されます：

✅ **WEBアプリとNativeアプリで同一のAPIを使用**
✅ **信頼性の高い画像送信（Base64形式）**
✅ **保守性・拡張性の向上**
✅ **後方互換性の維持（既存WEBアプリも動作）**

修正作業、お疲れ様です！
何か不明点があれば、いつでもご質問ください。

---

## 📌 改訂履歴

### v1.1（2025年10月28日）- セキュリティ・安全性強化版
以下の必須項目を反映：

**セキュリティ強化:**
- ✅ POSTメソッド以外を405エラーで拒否するガードを追加
- ✅ Content-Type不正時に415（Unsupported Media Type）を返すよう修正

**安全性向上:**
- ✅ JSON形式のBase64サイズチェックを追加（約10MB制限）
- ✅ CORSの説明を「ブラウザ向け」に修正（RN向けは誤解を招くため）

**コード品質改善:**
- ✅ apiEndpoint分岐の不要な同値分岐を簡略化
- ✅ FAQ Q6を修正（RN接続問題の原因をより正確に記載）

### v1.0（2025年10月28日）- 初版
- FormDataとJSON形式の両対応API設計

---

**最終更新日**: 2025年10月28日（v1.1）
**対象プロジェクト**: Instagram Helper WEBアプリ
**修正理由**: React Nativeアプリ対応のためのAPI形式統一
