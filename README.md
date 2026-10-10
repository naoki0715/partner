# CAREECON+ パートナー募集LP

静的LP（index.html）＋ Markdown で書くブログを、ビルドして GitHub Pages に公開します。

## 構成
- index.html / support.js / image-slot.js / assets 一式 … LP本体（編集は index.html）
- form-submit.js … Googleフォーム連携・プライバシー同意チェック
- content/blog/ … **ブログ記事（Markdown）と画像**
- blog.css … ブログのスタイル
- scripts/ … ビルド（記事→HTML、LPのプリレンダリング、sitemap/robots/RSS生成）とテスト
- .github/workflows/deploy.yml … ビルド＆公開（push・毎時・手動）

## ブログ記事の書き方
1. `content/blog/_template.md` をコピーして、`content/blog/好きな名前.md` を作る（ファイル名は半角英数とハイフン推奨。`slug` を省略するとこの名前が記事URLになる）
2. 先頭の設定と本文を書く。画像は `content/blog/images/` に置き、`![説明文](images/ファイル名.png)` で挿入（説明文は必ず入力）
3. `draft: true` を消し、`date` を公開したい日にして、GitHub上で保存（コミット）する
4. 数分で自動的にサイトへ反映される

| 設定 | 必須 | 内容 |
|---|---|---|
| title | ○ | 記事タイトル |
| date | ○ | 公開日（例 2026-10-15）。未来の日付にすると、その日から公開（予約公開。最大1時間の誤差） |
| summary | 推奨 | 検索結果やSNSに出る説明文（120文字程度） |
| seo_title | | 検索結果に出るタイトル。省略すると「title｜サイト名」 |
| slug | | URLの一部（半角英数とハイフン）。公開後は変更しない |
| category / tags | | 分類。tags は `[建設DX, 中小企業]` の形式 |
| cover | | 一覧のサムネイルとSNS用画像（例 `images/cover.png`。横長 1200×630 推奨） |
| updated | | 更新日 |
| draft | | `true` の間は公開されない |

- 本文は Markdown（見出し `##`、箇条書き、表、リンク、画像、引用、コードに対応）。本文中のHTMLはそのまま表示されず、文字として出ます
- `#` の見出しは記事タイトルと重複するため、本文は `##` から始めてください
- `_` で始まるファイルと README.md は記事として扱いません
- 設定の書き間違い（date が無い等）の記事は公開されません。Actions のログの「要修正」を確認してください
- GitHub の画面で Markdown を編集・画像をアップロードすれば、パソコンにツールは不要です（Add file → Create new file / Upload files）

## 公開までの設定（初回のみ）
1. Settings > Pages > Source を「GitHub Actions」に変更
2. Settings > Secrets and variables > Actions > Variables に以下を追加
   - `SITE_URL` … 公開URL（例 https://partner.careecon-plus.com）。canonical・sitemap・RSS に使う
   - `GA_MEASUREMENT_ID` … 公開後に取得したGA4の測定ID（G-XXXXXXXXXX）
   - `ACTIONS_DEPLOY` = `true` … これで Actions からの公開が有効になる

## ローカルでの確認
```
npm ci
npm test
npx playwright install chromium
SITE_URL=https://example.com node scripts/build.mjs   # dist/ に出力
```
`SKIP_PRERENDER=1` でLPのプリレンダリングを省略、`CONTENT_DIR=…` で記事フォルダを変更できます。

## 注意
- 毎時の定期実行は、リポジトリに60日間動きがないと GitHub に自動停止されます（記事を更新していれば止まりません）。止まったら Actions タブから再有効化してください
- 今すぐ反映したいとき: Actions > Build & Deploy > Run workflow
- Actions の初回実行は、本番での確認が必要です
