# 📸 Instagram Helper - AI投稿支援アプリ

⭐ **このプロジェクトが役に立ったら、スターをお願いします！** ⭐

Instagram投稿を効率化するAI搭載Webアプリケーション。画像を自動で1:1にトリミングし、AIが投稿文章とハッシュタグを自動生成します。

🌐 **デモサイト**: [https://instagram-helper.vercel.app](https://instagram-helper.vercel.app)

## ✨ 主な機能

- 📷 **自動画像加工**: アップロードした画像を自動で1:1（正方形）にトリミング
- 🤖 **AI文章生成**: Gemini 2.5 Flash-Lite APIを使用して画像に適した投稿文を自動生成
- 🎨 **6つの文章スタイル**: 「まじめ」「ユーモア」「キラキラ」「情熱的」「カジュアル」「エレガント」から選択可能
- 👤 **文体キャラクター**: 「男性的」「女性的」「中性的」から選択可能
- ⭐ **必須キーワード機能**: 投稿文とハッシュタグに必ず含めたいキーワードを指定可能
- #️⃣ **ハッシュタグ自動生成**: 「多い（15個以上）」「普通（8-10個）」「少ない（3-5個）」から選択
- 🌍 **投稿言語対応**: 日本語、英語、日英併記に対応
- 🌐 **UIの多言語化**: インターフェースを日本語/英語で切り替え可能（自動言語検出付き）
- 💾 **ダウンロード機能**: 加工済み画像のダウンロード
- 📋 **コピー機能**: 生成された文章・ハッシュタグをワンクリックでコピー
- 📱 **モバイル対応**: スマートフォンからも快適に利用可能
- 📊 **分析機能**: Vercel Analytics、Speed Insights、Google Analytics (GA4) 統合

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
- Node.js（バニラJS）
- Vercel Functions（サーバーレス）
- Vercel CLI（ローカル開発環境）
- Sharp（画像処理）
- Multer（ファイルアップロード）

### AI/API
- Google Gemini 2.5 Flash-Lite API（文章・ハッシュタグ生成 - 最新・高速版）
- Stability AI API（画像スタイル変換 - 準備中）

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
# 開発モード（推奨）
npm run dev

# または本番モード
npm start
```

### 5. アクセス

ブラウザで http://localhost:3000 を開く

**注意**:
- ローカル開発: Express.js サーバー（`server.js`）を使用
- Vercelデプロイ: Vercel Functions（`api/process.js`）を使用
- どちらも同じ処理ロジック（`lib/`フォルダ）を共有

## 📝 使い方

1. **言語を選択（自動検出）**
   - 右上の言語切り替えボタンで日本語/英語を選択
   - ブラウザの言語設定から自動的に適切な言語を検出
   - 選択した言語設定は保存され、次回アクセス時も維持

2. **画像をアップロード**
   - 「クリックして画像を選択」またはドラッグ&ドロップ
   - 対応形式: JPG, PNG, GIF（4MB以上は自動圧縮、最大10MB）

3. **オプションを選択**
   - 必須キーワード（オプション）: 投稿に必ず含めたい単語を入力
   - 文章のテイスト: まじめ/ユーモア/キラキラ/情熱的/カジュアル/エレガント
   - 文体キャラクター: 男性的/女性的/中性的
   - ハッシュタグの量: 多い/普通/少ない
   - 投稿言語: 日本語/英語/日英併記

4. **処理を実行**
   - 「画像を加工して文章を生成」ボタンをクリック
   - 処理には10-30秒程度かかります

5. **結果を保存**
   - 画像: 「画像をダウンロード」ボタン（モバイルでは共有・保存）
   - 文章: 「文章をコピー」ボタン
   - ハッシュタグ: 「ハッシュタグをコピー」ボタン
   - すべて: 「すべてコピー」で文章とハッシュタグを一括コピー

## 🚢 Vercelへのデプロイ

### ワンクリックデプロイ
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tsukasa19910921/instagram-helper)

### 手動デプロイ
1. [Vercel](https://vercel.com)にサインアップ
2. GitHubリポジトリをインポート
3. 環境変数を設定:
   - `GEMINI_API_KEY`: Gemini APIキー
4. デプロイボタンをクリック

## 🔍 SEO設定（デプロイ後）

デプロイが完了したら、以下の手順でGoogle Search Consoleを設定することをおすすめします。

### Google Search Consoleへの登録

1. **Google Search Consoleにアクセス**
   - [Google Search Console](https://search.google.com/search-console)にアクセス
   - Googleアカウントでログイン

2. **プロパティを追加**
   - 「プロパティを追加」をクリック
   - URLプレフィックス方式を選択
   - デプロイしたURL（例: `https://instagram-helper.vercel.app`）を入力

3. **所有権の確認**
   - HTMLタグ方式を選択
   - 提供されたメタタグを`public/index.html`の`<head>`内に追加
   - Vercelに再デプロイ
   - 「確認」ボタンをクリック

4. **サイトマップを送信**
   - 左メニューから「サイトマップ」を選択
   - `sitemap.xml` を入力して送信
   - 数日以内にGoogleがサイトをクロール開始

5. **インデックス登録をリクエスト**
   - 「URL検査」ツールを使用
   - トップページのURLを入力
   - 「インデックス登録をリクエスト」をクリック

### Twitter Card Validatorでの確認

Twitterでリンクを共有する際に画像が正しく表示されるか確認します：

1. [Twitter Card Validator](https://cards-dev.twitter.com/validator)にアクセス
2. デプロイしたURLを入力
3. プレビューを確認（og-image.jpgが表示されているか）

### その他の確認ツール

- **構造化データテスト**: [Rich Results Test](https://search.google.com/test/rich-results)
- **OGP確認**: [OpenGraph.xyz](https://www.opengraph.xyz/)
- **ページ速度**: [PageSpeed Insights](https://pagespeed.web.dev/)

## 📂 プロジェクト構成

```
instagram-helper/
├── lib/
│   ├── processor.js      # 画像処理・AI生成の統合ロジック
│   └── upload.js         # Multer設定（メモリストレージ）
├── api/
│   └── process.js        # Vercel Functions エンドポイント
├── public/
│   ├── index.html        # メインアプリケーション
│   ├── app.js            # フロントエンドロジック
│   ├── i18n.js           # 多言語化システム
│   └── assets/           # 画像・アセット
├── server.js             # ローカル開発サーバー
├── vercel.json           # Vercel設定
├── package.json          # 依存関係
├── CLAUDE.md             # Claude Code用ガイド
└── README.md             # このファイル
```

## ⚙️ 設定オプション

### 文章のテイスト
- **まじめ**: プロフェッショナルで信頼感のある文章
- **ユーモア**: 親しみやすく楽しい文章
- **キラキラ**: 明るくポジティブな文章
- **情熱的**: エネルギッシュで熱意のある文章
- **カジュアル**: リラックスした雰囲気の文章
- **エレガント**: 上品で洗練された文章

### 文体キャラクター
- **男性的**: 力強く簡潔な表現
- **女性的**: 柔らかく親しみやすい表現
- **中性的**: バランスの取れたニュートラルな表現

### 必須キーワード
- 投稿文とハッシュタグに必ず含めたいキーワードを指定
- 空白を含まない一単語のみ対応
- ブランド名、商品名、イベント名などに便利

### ハッシュタグの量
- **多い**: 15個以上（リーチ重視）
- **普通**: 8〜10個（バランス型）
- **少ない**: 3〜5個（シンプル）

### 投稿言語設定
- **日本語**: 日本語のみで生成
- **英語**: 英語のみで生成
- **日英併記**: 両言語で生成（グローバル対応）

### UI言語設定
- **自動検出**: ブラウザの言語設定から自動判定
- **日本語**: インターフェースを日本語で表示
- **英語**: インターフェースを英語で表示
- 右上の切り替えボタンで簡単に変更可能

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