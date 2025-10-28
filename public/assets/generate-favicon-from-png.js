/**
 * public/favicon.png から各サイズのfaviconを自動生成するスクリプト
 *
 * 使い方:
 * node generate-favicon-from-png.js
 *
 * 入力: public/favicon.png（ユーザーが配置済み）
 * 出力: public/ディレクトリに各サイズのfavicon
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFaviconsFromPng() {
    try {
        console.log('🎨 favicon.pngから各サイズを生成中...\n');

        // 入力ファイルのパス
        const inputPath = path.join(__dirname, 'public', 'favicon.png');

        // ファイルの存在確認
        if (!fs.existsSync(inputPath)) {
            console.error('❌ エラー: public/favicon.png が見つかりません');
            console.error('💡 public/favicon.png を配置してから再実行してください');
            process.exit(1);
        }

        // 入力ファイルの情報を表示
        const inputStats = fs.statSync(inputPath);
        console.log(`📂 入力ファイル: public/favicon.png`);
        console.log(`📊 ファイルサイズ: ${(inputStats.size / 1024).toFixed(2)} KB\n`);

        // 入力画像のメタデータを取得
        const metadata = await sharp(inputPath).metadata();
        console.log(`🖼️  元画像サイズ: ${metadata.width}×${metadata.height}px\n`);

        // publicディレクトリのパス
        const publicDir = path.join(__dirname, 'public');

        // 生成するサイズとファイル名の定義
        const sizes = [
            { size: 16, name: 'favicon-16x16.png', desc: 'Small favicon (ブラウザタブ小)', priority: '⭐⭐⭐' },
            { size: 32, name: 'favicon-32x32.png', desc: 'Standard favicon (ブラウザタブ標準)', priority: '⭐⭐⭐' },
            { size: 180, name: 'apple-touch-icon.png', desc: 'Apple Touch Icon (iOSホーム画面)', priority: '⭐⭐⭐' },
            { size: 192, name: 'android-chrome-192x192.png', desc: 'Android Chrome', priority: '⭐⭐' },
            { size: 512, name: 'android-chrome-512x512.png', desc: 'Android Chrome (高解像度)', priority: '⭐' }
        ];

        console.log('🔄 各サイズを生成中...\n');

        // 各サイズのfaviconを生成
        for (const { size, name, desc, priority } of sizes) {
            const outputPath = path.join(publicDir, name);

            await sharp(inputPath)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 } // 透過背景を維持
                })
                .png({
                    compressionLevel: 9, // 最大圧縮
                    palette: true // パレット化で容量削減
                })
                .toFile(outputPath);

            const fileSize = fs.statSync(outputPath).size;
            console.log(`${priority} ${name}`);
            console.log(`   ${size}×${size}px - ${(fileSize / 1024).toFixed(2)} KB`);
            console.log(`   ${desc}\n`);
        }

        console.log('📋 生成されたファイル一覧:');
        console.log('   public/favicon-16x16.png');
        console.log('   public/favicon-32x32.png');
        console.log('   public/apple-touch-icon.png');
        console.log('   public/android-chrome-192x192.png');
        console.log('   public/android-chrome-512x512.png');

        console.log('\n✅ HTMLへの設定:');
        console.log('   public/index.html に既に設定済み');

        console.log('\n💡 今後favicon.pngを更新した場合:');
        console.log('   1. public/favicon.png を新しい画像で上書き');
        console.log('   2. node generate-favicon-from-png.js を実行');
        console.log('   3. 全サイズが自動で再生成されます');

        console.log('\n✨ Faviconの生成が完了しました！');

    } catch (error) {
        console.error('❌ エラーが発生しました:', error.message);
        console.error('\n💡 トラブルシューティング:');
        console.error('1. public/favicon.png が正しいPNG形式か確認');
        console.error('2. sharp パッケージがインストールされているか確認');
        console.error('3. 画像が破損していないか確認');
        process.exit(1);
    }
}

// 実行
generateFaviconsFromPng();
