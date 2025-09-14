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
const removeImageButton = document.getElementById('removeImageButton');
const removeImageIconButton = document.getElementById('removeImageIconButton');
const changeImageButton = document.getElementById('changeImageButton');

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

// 画像圧縮関数（Canvas使用）
async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target.result;
        };

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // 最大幅・高さを設定（圧縮用）
            const maxWidth = 1920;
            const maxHeight = 1920;
            let width = img.width;
            let height = img.height;

            // アスペクト比を保持してリサイズ
            if (width > height) {
                if (width > maxWidth) {
                    height = height * (maxWidth / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = width * (maxHeight / height);
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;

            // 画像を描画
            ctx.drawImage(img, 0, 0, width, height);

            // CanvasをBlobに変換（品質調整でファイルサイズを減らす）
            canvas.toBlob((blob) => {
                if (blob.size > 4 * 1024 * 1024) {
                    // まだ大きい場合はさらに品質を下げる
                    canvas.toBlob((blob2) => {
                        const compressedFile = new File([blob2], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        resolve(compressedFile);
                    }, 'image/jpeg', 0.7);  // 品質70%
                } else {
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }
            }, 'image/jpeg', 0.85);  // 品質85%
        };

        img.onerror = () => {
            reject(new Error('画像の読み込みに失敗しました'));
        };

        reader.onerror = () => {
            reject(new Error('ファイルの読み込みに失敗しました'));
        };

        reader.readAsDataURL(file);
    });
}

// ファイル選択処理
function handleFileSelect(file) {
    // ファイルバリデーション
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
        showToast('JPG、PNG、GIFファイルのみアップロード可能です', 'error');
        return;
    }

    // ファイルサイズチェック（Vercel無料プラン対応: 4MB）
    const maxSize = 4 * 1024 * 1024;  // 4MBに制限
    if (file.size > maxSize) {
        showToast('画像を圧縮しています...', 'info');

        // 自動圧縮を実行
        compressImage(file).then(compressedFile => {
            const sizeInMB = (compressedFile.size / (1024 * 1024)).toFixed(2);
            showToast(`画像を圧縮しました (${sizeInMB}MB)`, 'success');
            handleCompressedFile(compressedFile);
        }).catch(error => {
            showToast('画像の圧縮に失敗しました: ' + error.message, 'error');
        });
        return;
    }

    // ファイルサイズが問題ない場合も圧縮を実行（品質最適化）
    compressImage(file).then(compressedFile => {
        handleCompressedFile(compressedFile);
    }).catch(error => {
        // 圧縮失敗時は元ファイルを使用
        handleCompressedFile(file);
    });
}

// 圧縮済みファイルの処理
function handleCompressedFile(file) {
    selectedFile = file;

    // ファイルサイズを表示
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    console.log(`圧縮後のファイルサイズ: ${sizeInMB}MB`);

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

        // エラーハンドリングの改善
        if (!response.ok) {
            let errorMessage = 'サーバーエラーが発生しました';

            // ステータスコードに応じたメッセージ
            if (response.status === 413) {
                errorMessage = 'ファイルサイズが大きすぎます。画像を圧縮してください。';
            } else if (response.status === 504 || response.status === 408) {
                errorMessage = '処理がタイムアウトしました。より小さい画像をお試しください。';
            } else if (response.status === 500) {
                errorMessage = 'サーバーエラーが発生しました。しばらく待ってから再度お試しください。';
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
    // 画像の表示（長押し保存対応のためBlob URLも作成）
    processedImageUrl = data.processedImage;

    // Data URLをBlob URLに変換（長押し保存をより確実にするため）
    if (isMobileDevice()) {
        fetch(data.processedImage)
            .then(res => res.blob())
            .then(blob => {
                const blobUrl = URL.createObjectURL(blob);
                processedImage.src = blobUrl;
                // ダウンロード属性を追加（一部ブラウザで長押し保存を改善）
                processedImage.setAttribute('download', `instagram-${Date.now()}.jpg`);
            })
            .catch(() => {
                // エラー時は通常のData URLを使用
                processedImage.src = processedImageUrl;
            });
    } else {
        processedImage.src = processedImageUrl;
    }

    // 文章の表示
    generatedText.textContent = data.generatedText || '素敵な写真が撮れました！✨';

    // ハッシュタグの表示
    hashtags.textContent = data.hashtags || '#instagram #photo #instagood';

    // UI状態の更新
    loadingSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
    processButton.disabled = false;

    // ボタンテキストを更新
    updateDownloadButtonUI();
}

// ダウンロードボタンのUI更新
function updateDownloadButtonUI() {
    if (canUseShareAPI()) {
        downloadImageButton.innerHTML = '<i class="fas fa-share-alt mr-2"></i>画像を共有・保存';
        // ヘルプテキストを追加
        const helpText = document.createElement('p');
        helpText.className = 'text-xs text-gray-500 mt-2';
        helpText.textContent = '※画像を長押しして保存することもできます';
        if (!document.getElementById('shareHelpText')) {
            helpText.id = 'shareHelpText';
            downloadImageButton.parentElement.appendChild(helpText);
        }
    } else {
        downloadImageButton.innerHTML = '<i class="fas fa-download mr-2"></i>画像をダウンロード';
    }
}

// デバイス判定
function isMobileDevice() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// Share APIが使用可能かチェック
function canUseShareAPI() {
    return navigator.share && isMobileDevice();
}

// 画像共有（Share API使用）
async function shareImage() {
    if (!processedImageUrl) return;

    try {
        // Data URLをBlobに変換
        const response = await fetch(processedImageUrl);
        const blob = await response.blob();
        const file = new File([blob], `instagram-${Date.now()}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now()
        });

        // Share APIが画像共有に対応しているか確認
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'Instagram投稿画像',
                text: '加工済みの画像です'
            });
            showToast('画像を共有・保存しました', 'success');
        } else {
            // Share API非対応の場合は従来のダウンロード
            await downloadImageFallback(blob);
        }
    } catch (error) {
        if (error.name !== 'AbortError') {  // ユーザーがキャンセルした場合は無視
            console.error('共有エラー:', error);
            showToast('共有・保存に失敗しました', 'error');
        }
    }
}

// 従来のダウンロード処理（フォールバック）
async function downloadImageFallback(blob) {
    try {
        if (!blob) {
            const response = await fetch(processedImageUrl);
            blob = await response.blob();
        }

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
}

// 画像ダウンロード/共有ボタンのイベントハンドラ
downloadImageButton.addEventListener('click', async () => {
    if (!processedImageUrl) return;

    // デバイスに応じて処理を分岐
    if (canUseShareAPI()) {
        await shareImage();
    } else {
        await downloadImageFallback();
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

// 画像削除機能
function removeImage() {
    selectedFile = null;
    fileInput.value = '';
    imagePreview.src = '';
    previewArea.classList.add('hidden');
    processButton.disabled = true;
    processButton.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');
    showToast('画像を削除しました', 'info');
}

// 削除ボタンのイベントリスナー
if (removeImageButton) {
    removeImageButton.addEventListener('click', removeImage);
}
if (removeImageIconButton) {
    removeImageIconButton.addEventListener('click', removeImage);
}

// 画像変更ボタン
if (changeImageButton) {
    changeImageButton.addEventListener('click', () => {
        fileInput.click();
    });
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

// ページ読み込み時の初期設定
document.addEventListener('DOMContentLoaded', () => {
    // 初期UIを設定（デバイスに応じて）
    updateDownloadButtonUI();
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