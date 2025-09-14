# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

インスタグラム投稿を効率化するWEBアプリケーションです。写真のAI加工と投稿文章の自動生成を行います。

## 現在の実装状況

### ✅ 実装完了済み機能
- **基本サーバー構成**: Node.js + Express サーバー（server.js）
- **写真アップロード機能**: Multer による画像ファイルアップロード
- **Gemini API連携**: Google Generative AI による画像解析と文章生成
- **画像処理機能**: Sharp による1:1アスペクト比への自動トリミング
- **WEBインターフェース**: Tailwind CSS を使用したレスポンシブUI
- **環境変数管理**: dotenv による設定管理（.env.example提供済み）
- **GitHub Pages**: デモページの公開

### 🔧 現在の技術仕様

#### ファイル構成
```
instagram投稿自動生成/
├── server.js           # Express サーバー（メインAPI）
├── index.html          # ランディングページ
├── public/
│   ├── index.html      # メインアプリケーション
│   └── app.js          # フロントエンドJavaScript
├── uploads/            # アップロードファイル保存
├── package.json        # 依存関係管理
├── .env.example        # 環境変数テンプレート
└── .env                # 実際の環境変数（Git除外）
```

#### 依存関係
- **express**: ^4.18.2 (WEBサーバー)
- **multer**: ^1.4.5-lts.1 (ファイルアップロード)
- **sharp**: ^0.33.0 (画像処理)
- **dotenv**: ^16.3.1 (環境変数)
- **cors**: ^2.8.5 (CORS設定)
- **@google/generative-ai**: ^0.5.0 (Gemini API)
- **nodemon**: ^3.0.2 (開発用)

#### API エンドポイント
- `POST /api/upload`: 画像アップロード
- `POST /api/analyze`: 画像解析と文章生成
- `GET /api/download/:filename`: 処理済み画像のダウンロード

#### 環境変数
- `GEMINI_API_KEY`: Gemini API キー
- `PORT`: サーバーポート（デフォルト: 3000）
- `MAX_FILE_SIZE`: 最大ファイルサイズ（10MB）
- `UPLOAD_DIR`: アップロードディレクトリ（uploads）

## 機能仕様

### 基本機能
- ✅ 写真のアップロード機能
- ✅ Gemini API連携による写真の解析
- ✅ 被写体を中心に配置し、1:1のアスペクト比でトリミング
- ✅ 写真に応じた投稿用文章の自動生成
- ✅ 加工後画像のダウンロード機能
- ✅ 生成された文章のコピー機能

### ユーザー選択オプション
- **文章のテイスト**: 「まじめ」「ユーモア」「キラキラ」から選択
- **ハッシュタグの量**: 「多い」「普通」「少ない」から選択

### 将来実装予定
- WEBアプリから直接インスタグラムへの投稿機能
- 複数画像の一括処理機能
- 生成結果の履歴管理

## 開発・運用コマンド

### 開発環境
```bash
npm run dev    # 開発サーバー起動（nodemon使用）
npm start      # 本番サーバー起動
```

### 初期セットアップ
1. `npm install` でパッケージインストール
2. `.env.example` を `.env` にコピー
3. `.env` にGemini API キーを設定
4. `npm run dev` で開発サーバー起動

## 開発方針

- **段階的実装**: 一気に進めず、ステップバイステップで開発する
- **動作確認**: 各ステップ完了時に動作確認を必須とする
- **コメント**: プログラムには必ず丁寧なコメントを記載する
- **日本語対応**: すべてのやりとりは日本語で行う

## 技術スタック

### フロントエンド
- **HTML/CSS/JavaScript**: バニラJavaScript（React未使用）
- **スタイリング**: Tailwind CSS（CDN）
- **画像処理**: Canvas API（client-side）

### バックエンド
- **サーバー**: Node.js + Express
- **AI API**: Gemini Pro Vision API
- **画像処理**: Sharp（server-side）
- **ファイル管理**: Multer

### インフラ・デプロイ
- **開発**: ローカル環境（port 3000）
- **デモ**: GitHub Pages
- **API制限**: Gemini APIの無料枠利用

## 重要な注意事項

- **セキュリティ**:
  - Gemini APIキーは環境変数で管理、絶対にコミットしない
  - アップロードファイルは適切にフィルタリング済み
- **API制限**: Gemini Pro Vision APIの無料枠制限に注意
- **ファイル管理**: uploads/ ディレクトリは Git 除外設定済み
- **動作テスト**: 各機能実装後は必ず動作テストを行う
- **ユーザビリティ**: 直感的で使いやすい設計を重視

## 既知の課題・改善点

- エラーハンドリングの強化が必要
- レスポンシブデザインの微調整
- 処理中のローディング表示の改善
- ファイルサイズ制限のUI表示
- 生成結果の履歴機能が未実装