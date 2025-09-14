# 📸 Instagram Helper - AI投稿支援アプリ

⭐ **このプロジェクトが役に立ったら、スターをお願いします！** ⭐

Instagram投稿を効率化するAI搭載Webアプリケーション。画像を自動で1:1にトリミングし、AIが投稿文章とハッシュタグを自動生成します。

🌐 **デモサイト**: [https://instagram-helper.vercel.app](https://instagram-helper.vercel.app)

## ✨ 主な機能

- 📷 **自動画像加工**: アップロードした画像を自動で1:1（正方形）にトリミング
- 🤖 **AI文章生成**: Gemini APIを使用して画像に適した投稿文を自動生成
- 🎨 **3つの文章スタイル**: 「まじめ」「ユーモア」「キラキラ」から選択可能
- #️⃣ **ハッシュタグ自動生成**: 「多い（15個以上）」「普通（8-10個）」「少ない（3-5個）」から選択
- 🌍 **多言語対応**: 日本語、英語、日英併記に対応
- 💾 **ダウンロード機能**: 加工済み画像のダウンロード
- 📋 **コピー機能**: 生成された文章・ハッシュタグをワンクリックでコピー
- 📱 **モバイル対応**: スマートフォンからも快適に利用可能

## 🚀 デモを試す

### オンラインデモ（Vercel）
[https://instagram-helper.vercel.app](https://instagram-helper.vercel.app) で実際にお試しいただけます。
- サーバーセットアップ不要
- すぐに利用可能
- Gemini API機能も動作（APIキー設定済み）

## 🛠️ 技術スタック

### アーキテクチャ
- **統合コードベース**: ローカル環境とVercel環境で完全に同じ挙動
- **メモリベース処理**: 高速なData URL形式での画像処理
- **共通モジュール化**: コード重複を約50%削減

### フロントエンド
- HTML/JavaScript（バニラJS）
- Tailwind CSS（レスポンシブUI）
- Canvas API（画像圧縮）

### バックエンド
- Node.js + Express
- Vercel Functions（サーバーレス）
- Sharp（画像処理）
- Multer（ファイルアップロード）

### AI/API
- Google Gemini Pro Vision API（文章・ハッシュタグ生成）

## 📦 セットアップ手順

### 1. 前提条件

- Node.js (v18以上) がインストールされていること
- npm または yarn
- Gemini API キー（[Google AI Studio](https://makersuite.google.com/app/apikey)で取得）

### 2. インストール

```bash
# リポジトリをクローン
git clone https://github.com/tsukasa19910921/instagram-helper.git
cd instagram-helper

# 依存関係をインストール
npm install

# 環境変数ファイルを作成
cp .env.example .env
```

### 3. 環境変数の設定

`.env`ファイルを開いて、Gemini APIキーを設定：

```env
GEMINI_API_KEY=your_actual_api_key_here
PORT=3000
MAX_FILE_SIZE=10485760
```

### 4. 起動

```bash
# 本番モード
npm start

# 開発モード（nodemonが必要）
npm run dev
```

### 5. アクセス

ブラウザで http://localhost:3000 を開く

## 📝 使い方

1. **画像をアップロード**
   - 「クリックして画像を選択」またはドラッグ&ドロップ
   - 対応形式: JPG, PNG, GIF（10MB以下）

2. **オプションを選択**
   - 文章のテイスト（まじめ/ユーモア/キラキラ）
   - ハッシュタグの量（多い/普通/少ない）
   - 言語設定（日本語/英語/日英併記）

3. **処理を実行**
   - 「画像を加工して文章を生成」ボタンをクリック
   - 処理には10-30秒程度かかります

4. **結果を保存**
   - 画像: 「画像をダウンロード」ボタン
   - 文章: 「文章をコピー」ボタン
   - ハッシュタグ: 「ハッシュタグをコピー」ボタン

## 🚢 Vercelへのデプロイ

### ワンクリックデプロイ
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tsukasa19910921/instagram-helper)

### 手動デプロイ
1. [Vercel](https://vercel.com)にサインアップ
2. GitHubリポジトリをインポート
3. 環境変数を設定:
   - `GEMINI_API_KEY`: Gemini APIキー
4. デプロイボタンをクリック

## 📂 プロジェクト構成

```
instagram-helper/
├── src/
│   └── shared/
│       ├── processor.js    # 画像処理・AI生成の統合ロジック
│       └── upload.js       # Multer設定（メモリストレージ）
├── api/
│   └── process.js         # Vercel Functions エンドポイント
├── public/
│   ├── index.html         # メインアプリケーション
│   └── app.js            # フロントエンドロジック
├── server.js             # ローカル開発サーバー
├── index.html            # GitHub Pages用ランディングページ
├── vercel.json           # Vercel設定
├── package.json          # 依存関係
└── README.md            # このファイル
```

## ⚙️ 設定オプション

### 文章のテイスト
- **まじめ**: プロフェッショナルで信頼感のある文章
- **ユーモア**: 親しみやすく楽しい文章
- **キラキラ**: 明るくポジティブな文章

### ハッシュタグの量
- **多い**: 15個以上（リーチ重視）
- **普通**: 8〜10個（バランス型）
- **少ない**: 3〜5個（シンプル）

### 言語設定
- **日本語**: 日本語のみで生成
- **英語**: 英語のみで生成
- **日英併記**: 両言語で生成（グローバル対応）

## 🔧 トラブルシューティング

### APIキーエラーが出る場合
- `.env`ファイルにAPIキーが正しく設定されているか確認
- APIキーの前後に余分なスペースがないか確認
- Gemini APIの利用制限に達していないか確認

### 画像処理でエラーが出る場合
- 画像サイズが10MB以下か確認（Vercelは4MB以下）
- 対応している画像形式か確認（JPG, PNG, GIF）
- ネットワーク接続を確認

### サーバーに接続できない場合
- `npm start`でサーバーが起動しているか確認
- ポート3000が他のアプリで使用されていないか確認
- ファイアウォール設定を確認

## 📈 今後の機能拡張予定

- [ ] Instagram APIと連携して直接投稿
- [ ] 複数画像の一括処理
- [ ] 投稿スケジュール機能
- [ ] 過去の投稿履歴保存
- [ ] AI画像スタイル変換（アニメ風、スケッチ風など）
- [ ] カスタムハッシュタグセット
- [ ] 分析機能（最適な投稿時間の提案など）

## 🤝 コントリビューション

プルリクエストや機能提案は歓迎です！

1. Fork する
2. Feature ブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチをプッシュ (`git push origin feature/AmazingFeature`)
5. プルリクエストを作成

## 📄 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照

## 🙏 謝辞

- [Google Gemini API](https://ai.google.dev/) - AI文章生成
- [Vercel](https://vercel.com) - ホスティング
- [Tailwind CSS](https://tailwindcss.com) - スタイリング
- [Sharp](https://sharp.pixelplumbing.com/) - 画像処理

## 📞 サポート

質問や問題がある場合は、[Issues](https://github.com/tsukasa19910921/instagram-helper/issues) からお知らせください。

---

Made with ❤️ by [tsukasa19910921](https://github.com/tsukasa19910921)