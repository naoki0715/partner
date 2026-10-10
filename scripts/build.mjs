// サイト全体のビルド。出力先は dist/（GitHub Pages にはこの中身を公開する）
//
//   1. 公開ファイル（HTML/JS/CSS/画像）を dist にコピー
//   2. Notion の記事から、ブログの一覧・記事ページ・画像を生成
//   3. LPに GA・canonical を反映
//   4. LPをプリレンダリング（完成形のHTMLを埋め込む）
//   5. sitemap.xml / feed.xml / robots.txt（SITE_URL がある場合）
//
// 環境変数:
//   SITE_URL             公開URL（例 https://partner.careecon-plus.com）。未設定なら canonical/sitemap等は作らない
//   GA_MEASUREMENT_ID    GA4の測定ID（G-XXXXXXXXXX）。設定すると全ページに計測タグを入れる
//   NOTION_TOKEN         Notion インテグレーションのトークン
//   NOTION_DATABASE_ID   記事データベースのID
//   NOTION_DATA_SOURCE_ID（任意）データソースを直接指定
//   NOTION_VERSION       （任意）Notion-Version ヘッダー。既定 2025-09-03
//   NOTION_FIXTURE       テスト用。Notionの代わりにこのJSONを読む
//   SKIP_PRERENDER=1     プリレンダリングを省略（高速確認用）
//   DIST_DIR             出力先（既定 dist）
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAssetStore } from './lib/assets.mjs';
import { selectArticles } from './lib/articles.mjs';
import { firstParagraphText, renderBlocks } from './lib/blocks.mjs';
import { createFixtureSource, createNotionSource } from './lib/notion.mjs';
import { prerenderLanding } from './prerender.mjs';
import { buildFeed, buildRobots, buildSitemap } from './lib/seo.mjs';
import { articlePage, blogIndexPage, FALLBACK_BASE, SITE_NAME } from './lib/templates.mjs';
import { injectGa, isValidGaId } from './lib/tracking.mjs';
import { copyPublicFiles } from './lib/util.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function parseSiteUrl(value) {
  if (!value) return '';
  let u;
  try {
    u = new URL(value);
  } catch {
    throw new Error(`SITE_URL が不正です: ${value}`);
  }
  if (u.protocol !== 'https:') throw new Error(`SITE_URL は https:// で始めてください: ${value}`);
  return (u.origin + u.pathname).replace(/\/+$/, '');
}

/** ブログ（一覧・記事）を生成して、公開した記事のメタを返す */
export async function buildBlog({ site, source, distDir, fixtureDir, log = console, now = new Date() }) {
  const metas = selectArticles(await source.queryPages(), { now, warn: (m) => log.warn(`  ・${m}`) });
  const rendered = [];
  for (const meta of metas) {
    const dir = path.join(distDir, 'blog', meta.slug);
    const assets = createAssetStore({ outDir: dir, fixtureDir });
    const warn = (m) => log.warn(`  ・[${meta.title}] ${m}`);
    const blocks = await source.listBlocks(meta.id);
    const ctx = { source, assets, warn, headings: [] };
    const html = await renderBlocks(blocks, ctx);
    if (!html.trim()) warn('本文が空です');
    meta.fallbackDescription = firstParagraphText(blocks);
    if (!meta.description) warn('「概要」が未入力のため、本文の冒頭を説明文に使います');
    if (meta.coverUrl) {
      try {
        const cover = await assets.save(meta.coverUrl);
        meta.coverFile = cover.file;
        meta.coverW = cover.width;
        meta.coverH = cover.height;
      } catch (e) {
        warn(`カバー画像を取り込めませんでした（${e.message}）`);
      }
    }
    rendered.push({ meta, html, headings: ctx.headings });
  }
  for (const { meta, html, headings } of rendered) {
    const related = metas.filter((m) => m.id !== meta.id).slice(0, 3);
    const page = articlePage({ site, article: meta, html, headings, related });
    const dir = path.join(distDir, 'blog', meta.slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.html'), page);
  }
  await fs.mkdir(path.join(distDir, 'blog'), { recursive: true });
  await fs.writeFile(path.join(distDir, 'blog', 'index.html'), blogIndexPage({ site, articles: metas }));
  return metas;
}

/** LPのheadに canonical / og:url / GA を反映する */
export function finalizeLanding(html, site) {
  let out = html;
  if (site.siteUrl) {
    out = out.split(FALLBACK_BASE + '/').join(site.siteUrl + '/');
    if (!out.includes('rel="canonical"')) {
      out = out.replace('<!-- ファビコン -->', `<link rel="canonical" href="${site.siteUrl}/">\n<meta property="og:url" content="${site.siteUrl}/">\n<!-- ファビコン -->`);
    }
  }
  return injectGa(out, site.gaId);
}

export async function main({ env = process.env, log = console } = {}) {
  const t0 = Date.now();
  const distDir = path.resolve(ROOT, env.DIST_DIR || 'dist');
  const siteUrl = parseSiteUrl((env.SITE_URL || '').trim());
  const gaId = (env.GA_MEASUREMENT_ID || '').trim();
  if (gaId && !isValidGaId(gaId)) throw new Error(`GA_MEASUREMENT_ID の形式が不正です（G-XXXXXXXXXX）: ${gaId}`);
  const site = { siteUrl, gaId };

  log.log(`ビルド開始 → ${path.relative(ROOT, distDir) || '.'}`);
  log.log(`  公開URL: ${siteUrl || '(未設定: canonical/sitemap等は作りません)'} / GA: ${gaId || '(未設定)'}`);
  await fs.rm(distDir, { recursive: true, force: true });
  const copied = await copyPublicFiles(ROOT, distDir);
  log.log(`1. 公開ファイルをコピー: ${copied.length}個`);

  // 2. ブログ
  let articles = [];
  let blogOn = false;
  if (env.NOTION_FIXTURE) {
    const fixture = path.resolve(ROOT, env.NOTION_FIXTURE);
    articles = await buildBlog({ site, source: await createFixtureSource(fixture), distDir, fixtureDir: path.join(path.dirname(fixture), 'images'), log });
    blogOn = true;
  } else if (env.NOTION_TOKEN && env.NOTION_DATABASE_ID) {
    // Notionに繋がらないときは例外で止める（空のブログで本番を上書きしないため）
    const source = createNotionSource({ token: env.NOTION_TOKEN, databaseId: env.NOTION_DATABASE_ID, dataSourceId: env.NOTION_DATA_SOURCE_ID || undefined, version: env.NOTION_VERSION || undefined, log });
    articles = await buildBlog({ site, source, distDir, log });
    blogOn = true;
  } else {
    log.warn('2. ブログ: NOTION_TOKEN / NOTION_DATABASE_ID が未設定のため、ブログは生成しません');
  }
  if (blogOn) log.log(`2. ブログ生成: 公開記事 ${articles.length}件`);

  // 3. LP
  const indexPath = path.join(distDir, 'index.html');
  await fs.writeFile(indexPath, finalizeLanding(await fs.readFile(indexPath, 'utf8'), site));
  log.log('3. LPに GA / canonical を反映');

  // 4. プリレンダリング
  if (env.SKIP_PRERENDER === '1') {
    log.warn('4. プリレンダリング: SKIP_PRERENDER=1 のため省略');
  } else {
    const r = await prerenderLanding(distDir);
    log.log(`4. LPをプリレンダリング: 完成形 ${Math.round(r.bytes / 1024)}KB / 本文 ${r.text}文字`);
  }

  // 5. SEOファイル
  if (siteUrl) {
    await fs.writeFile(path.join(distDir, 'sitemap.xml'), buildSitemap({ siteUrl, articles }));
    await fs.writeFile(path.join(distDir, 'robots.txt'), buildRobots({ siteUrl }));
    if (blogOn) await fs.writeFile(path.join(distDir, 'feed.xml'), buildFeed({ siteUrl, articles, title: `ブログ｜${SITE_NAME}`, description: '建設DX・現場管理・パートナー営業に役立つ情報' }));
    log.log('5. sitemap.xml / robots.txt' + (blogOn ? ' / feed.xml' : '') + ' を生成');
  } else {
    log.warn('5. sitemap.xml / robots.txt / feed.xml: SITE_URL が未設定のため省略');
  }
  log.log(`完了 (${((Date.now() - t0) / 1000).toFixed(1)}秒)`);
  return { distDir, articles };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error('\nビルドに失敗しました:', e.message);
    process.exit(1);
  });
}
