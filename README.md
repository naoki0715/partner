# CAREECON+ パートナー募集LP

静的LP（index.html）＋ Notion で書くブログを、ビルドして GitHub Pages に公開します。

## 構成
- index.html / support.js / image-slot.js / ds/ / assets/ … LP本体（編集は index.html）
- form-submit.js … Googleフォーム連携・プライバシー同意チェック
- blog.css … ブログのスタイル
- scripts/ … ビルド（Notion→HTML、LPのプリレンダリング、sitemap/robots/RSS生成）とテスト
- .github/workflows/deploy.yml … ビルド＆公開（push・毎時・手動）

## ローカルでの確認
```
npm ci
npm test
NOTION_FIXTURE=scripts/fixtures/notion.json SITE_URL=https://example.com npx playwright install chromium && node scripts/build.mjs
```
`dist/` が公開物です。`SKIP_PRERENDER=1` でプリレンダリングを省略できます。

## ブログの書き方（Notion）
1. Notionに記事用データベースを作り、次のプロパティを用意（名前は完全一致）
   - タイトル（title）/ スラッグ（テキスト、URLになる英数字・ハイフン）/ ステータス（選択：公開・下書き）/ 公開日（日付）/ 概要（テキスト、検索結果の説明文）/ カテゴリ（選択）/ タグ（マルチ選択）
2. ステータスを「公開」にし、公開日が今日以前なら、最大1時間以内に自動反映されます。未来の公開日は予約公開になります。
3. カバー画像はページカバーを使用。本文の画像はビルド時に取り込まれます（Notionの画像URLは期限切れになるため）。

## 初期設定
1. Notion の「インテグレーション」を作成し、トークンを取得 → 記事データベースに「接続」で共有
2. GitHub リポジトリ Settings > Secrets and variables > Actions
   - Secrets: `NOTION_TOKEN`, `NOTION_DATABASE_ID`
   - Variables: `SITE_URL`（例 https://partner.careecon-plus.com）, `GA_MEASUREMENT_ID`（公開後）, 任意 `NOTION_DATA_SOURCE_ID`
3. Settings > Pages > Source を「GitHub Actions」に変更
4. Variables に `ACTIONS_DEPLOY` = `true` を追加（これで公開が有効になる）

## 注意
- 定期実行（毎時）は、リポジトリに60日間動きがないと GitHub に自動停止されます。Actions タブから再有効化、または手動実行してください。
- 手動で今すぐ反映: Actions > Build & Deploy > Run workflow
- Notion連携・Actions実行は本番で初回確認が必要です。
