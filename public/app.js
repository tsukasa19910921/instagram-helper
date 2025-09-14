// DOM要素の取得
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewArea = document.getElementById('previewArea');
const imagePreview = document.getElementById('imagePreview');
const processButton = document.getElementById('processButton');
const loadingSection = document.getElementById('loadingSection');
const resultSection = document.getElementById('resultSection');
const textStyle = document.getElementById('textStyle');
const hashtagAmount = document.getElementById('hashtagAmount');
const processedImage = document.getElementById('processedImage');
const generatedText = document.getElementById('generatedText');
const hashtags = document.getElementById('hashtags');
const downloadImageButton = document.getElementById('downloadImageButton');
const copyTextButton = document.getElementById('copyTextButton');
const copyHashtagsButton = document.getElementById('copyHashtagsButton');
const newImageButton = document.getElementById('newImageButton');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// 現在選択されているファイル
let selectedFile = null;
let processedImageUrl = null;

// ドラッグ&ドロップイベントの設定
dropZone.addEventListener('click', () => {
    fileInput.click();
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

// ファイル選択イベント
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

// ファイル選択処理
function handleFileSelect(file) {
    // ファイルバリデーション
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
        showToast('JPG、PNG、GIFファイルのみアップロード可能です', 'error');
        return;
    }

    // ファイルサイズチェック（10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast('ファイルサイズは10MB以下にしてください', 'error');
        return;
    }

    selectedFile = file;

    // プレビュー表示
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        previewArea.classList.remove('hidden');
        processButton.disabled = false;
        processButton.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');
    };
    reader.readAsDataURL(file);
}

// 処理ボタンクリック
processButton.addEventListener('click', async () => {
    if (!selectedFile) {
        showToast('画像を選択してください', 'error');
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

    try {
        // サーバーに送信
        // Vercel環境とローカル環境の両方に対応
        const apiEndpoint = window.location.hostname === 'localhost'
            ? '/api/process'
            : '/api/process';

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'サーバーエラーが発生しました');
        }

        // 結果の表示
        displayResults(data);

    } catch (error) {
        console.error('処理エラー:', error);
        showToast(error.message || '処理中にエラーが発生しました', 'error');
        processButton.disabled = false;
        loadingSection.classList.add('hidden');
    }
});

// 結果表示
function displayResults(data) {
    // 画像の表示
    processedImageUrl = data.processedImage;
    processedImage.src = processedImageUrl;

    // 文章の表示
    generatedText.textContent = data.generatedText || '素敵な写真が撮れました！✨';

    // ハッシュタグの表示
    hashtags.textContent = data.hashtags || '#instagram #photo #instagood';

    // UI状態の更新
    loadingSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
    processButton.disabled = false;
}

// 画像ダウンロード
downloadImageButton.addEventListener('click', async () => {
    if (!processedImageUrl) return;

    try {
        // 画像を取得
        const response = await fetch(processedImageUrl);
        const blob = await response.blob();

        // ダウンロードリンクを作成
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `instagram-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showToast('画像をダウンロードしました', 'success');
    } catch (error) {
        showToast('ダウンロードに失敗しました', 'error');
    }
});

// テキストコピー
copyTextButton.addEventListener('click', () => {
    copyToClipboard(generatedText.textContent, '文章をコピーしました');
});

// ハッシュタグコピー
copyHashtagsButton.addEventListener('click', () => {
    copyToClipboard(hashtags.textContent, 'ハッシュタグをコピーしました');
});

// すべてコピー（文章＋ハッシュタグ）
const copyAllButton = document.getElementById('copyAllButton');
copyAllButton.addEventListener('click', () => {
    const fullText = `${generatedText.textContent}\n\n${hashtags.textContent}`;
    copyToClipboard(fullText, '文章とハッシュタグをコピーしました');
});

// クリップボードにコピー
async function copyToClipboard(text, message) {
    try {
        // Clipboard APIを使用
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            showToast(message, 'success');
        } else {
            // フォールバック: テキストエリアを使用
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-999999px';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast(message, 'success');
        }
    } catch (error) {
        showToast('コピーに失敗しました', 'error');
    }
}

// 新しい画像ボタン
newImageButton.addEventListener('click', () => {
    // UIリセット
    selectedFile = null;
    processedImageUrl = null;
    fileInput.value = '';
    previewArea.classList.add('hidden');
    resultSection.classList.add('hidden');
    processButton.disabled = true;
    processButton.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');

    // スクロールトップ
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// トースト通知
function showToast(message, type = 'success') {
    toastMessage.textContent = message;

    // 色の設定
    if (type === 'error') {
        toast.classList.remove('bg-green-500');
        toast.classList.add('bg-red-500');
    } else {
        toast.classList.remove('bg-red-500');
        toast.classList.add('bg-green-500');
    }

    // 表示
    toast.classList.remove('hidden', 'translate-y-full');

    // 3秒後に非表示
    setTimeout(() => {
        toast.classList.add('translate-y-full');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);
    }, 3000);
}

// 初期状態の設定
processButton.disabled = true;
processButton.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');