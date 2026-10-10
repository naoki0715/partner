import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileToMeta, parseDate, parseFrontMatter, readArticleFiles, selectArticles } from '../lib/articles.mjs';
import { createAssetStore, sniffImage } from '../lib/assets.mjs';
import { firstParagraphText, renderMarkdown } from '../lib/markdown.mjs';
import { buildSitemap } from '../lib/seo.mjs';
import { gaTag, injectGa, isValidGaId } from '../lib/tracking.mjs';
import { esc, safeUrl, toSlug } from '../lib/util.mjs';
import { buildBlog } from '../build.mjs';

const FIX = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../fixtures/content/blog');
const NOW = new Date('2026-10-10T00:00:00+09:00');
const quiet = { log() {}, warn() {} };
const mdCtx = (over = {}) => ({ assets: { save: async (ref) => ({ file: 'a.png', width: 10, height: 20, ref }) }, warn() {}, headings: [], ...over });

test('esc: HTMLの特殊文字をエスケープする', () => {
  assert.equal(esc(`<a href="x">&'`), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
});

test('safeUrl: 危険なURLを除外する', () => {
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeUrl('JaVaScRiPt:alert(1)'), '');
  assert.equal(safeUrl('data:text/html,<script>'), '');
  assert.equal(safeUrl('https://example.com/a'), 'https://example.com/a');
  });

test('toSlug: 半角英数とハイフンだけにする', () => {
  assert.equal(toSlug(' Construction DX_Guide '), 'construction-dx-guide');
  assert.equal(toSlug('建設DX'), 'dx');
  assert.equal(toSlug('建設'), '');
});

test('tracking: GA の形式チェックと差し込み（重複させない）', () => {
  assert.ok(isValidGaId('G-ABC1234567'));
  assert.ok(!isValidGaId('UA-1234-1'));
  assert.ok(!isValidGaId('G-<script>'));
  assert.equal(gaTag('bad'), '');
  const once = injectGa('<head></head>', 'G-ABC1234567');
  assert.match(once, /gtag\/js\?id=G-ABC1234567/);
  assert.equal(injectGa(once, 'G-ABC1234567'), once);
});

test('sniffImage: PNG/JPEG/GIF/WebP の寸法を読む', () => {
  const png = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47]).copy(png);
  png.writeUInt32BE(1200, 16);
  png.writeUInt32BE(630, 20);
  assert.deepEqual(sniffImage(png), { type: 'image/png', width: 1200, height: 630 });
  assert.equal(sniffImage(Buffer.from('hello world, not an image')), null);
  assert.equal(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).type, 'image/svg+xml');
});

test('buildSitemap: LP・一覧・記事を含み、記事が無ければ一覧を含めない', () => {
  const xml = buildSitemap({ siteUrl: 'https://x.example', articles: [{ slug: 'a', modified: new Date('2026-10-01T00:00:00Z') }] });
  assert.match(xml, /<loc>https:\/\/x\.example\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/x\.example\/blog\/a\/<\/loc>/);
  assert.doesNotMatch(buildSitemap({ siteUrl: 'https://x.example', articles: [] }), /\/blog\//);
});

test('parseFrontMatter: 設定と本文を分け、壊れた設定はエラーにする', () => {
  const ok = parseFrontMatter('---\ntitle: A\ntags: [x, y]\n---\n本文\n');
  assert.equal(ok.data.title, 'A');
  assert.deepEqual(ok.data.tags, ['x', 'y']);
  assert.equal(ok.body, '本文\n');
  assert.ok(parseFrontMatter('本文だけ').error);
  assert.ok(parseFrontMatter('---\ntitle: [壊れた\n---\nx').error);
  assert.equal(parseFrontMatter('\uFEFF---\r\ntitle: A\r\n---\r\nx').data.title, 'A', 'BOM・CRLFも可');
});

test('parseDate: 日付のみ・時刻付きは日本時間、タイムゾーン指定はそのまま', () => {
  assert.equal(parseDate('2026-10-15').toISOString(), '2026-10-14T15:00:00.000Z');
  assert.equal(parseDate('2026-10-15 10:30').toISOString(), '2026-10-15T01:30:00.000Z');
  assert.equal(parseDate('2026-10-15T00:00:00Z').toISOString(), '2026-10-15T00:00:00.000Z');
  assert.equal(parseDate('そのうち'), null);
});

const entry = (fm, body = '本文') => ({ file: 'x.md', text: `---\n${fm}\n---\n${body}` });

test('fileToMeta: 公開条件（draft・予約公開・必須項目）', () => {
  assert.ok(fileToMeta(entry('title: A\ndate: 2026-10-01'), { now: NOW }).meta);
  assert.ok(fileToMeta(entry('title: A\ndate: 2026-10-01\ndraft: true'), { now: NOW }).skip);
  assert.ok(fileToMeta(entry('title: A\ndate: 2099-01-01'), { now: NOW }).skip, '未来の公開日は非公開');
  assert.ok(fileToMeta(entry('title: A'), { now: NOW }).problem, 'dateなしは要修正');
  assert.ok(fileToMeta(entry('date: 2026-10-01'), { now: NOW }).problem, 'titleなしは要修正');
  assert.ok(fileToMeta(entry('title: A\ndate: あした'), { now: NOW }).problem);
  const m = fileToMeta(entry('title: A\ndate: 2026-10-01\nupdated: 2026-09-01\ntags: タグ1、タグ2'), { now: NOW }).meta;
  assert.equal(m.slug, 'x');
  assert.deepEqual(m.tags, ['タグ1', 'タグ2']);
  assert.ok(m.modified >= m.published, '更新日が公開日より前でも公開日に揃える');
});

test('selectArticles: 新しい順・スラッグ重複の解消', () => {
  const mk = (file, fm) => ({ file, text: `---\n${fm}\n---\nb` });
  const out = selectArticles(
    [mk('a.md', 'title: A\ndate: 2026-09-01\nslug: same'), mk('b.md', 'title: B\ndate: 2026-09-05\nslug: same'), mk('c.md', 'title: C\ndate: 2026-09-03')],
    { now: NOW },
  );
  assert.deepEqual(out.map((m) => m.title), ['B', 'C', 'A']);
  assert.deepEqual(out.map((m) => m.slug), ['same', 'c', 'same-2']);
});

test('renderMarkdown: 生HTMLは文字として表示・危険なリンクは除外・外部リンクはnoopener', async () => {
  const html = await renderMarkdown('<script>alert(1)</script>\n\n[x](javascript:alert(1)) [y](https://e.com) <b onclick=1>z</b>', mdCtx());
  assert.doesNotMatch(html, /<script|<b |href="javascript:/i);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<a href="https:\/\/e\.com" rel="noopener noreferrer" target="_blank">y<\/a>/);
});

test('renderMarkdown: 見出しはh2〜h4に揃え、h2を目次用に記録', async () => {
  const c = mdCtx();
  const html = await renderMarkdown('# 大\n\n## 中\n\n### 小\n\n##### 最小', c);
  assert.match(html, /<h2 id="h-1">大<\/h2>/);
  assert.match(html, /<h2 id="h-2">中<\/h2>/);
  assert.match(html, /<h3 id="h-3">小<\/h3>/);
  assert.match(html, /<h4 id="h-4">最小<\/h4>/);
  assert.deepEqual(c.headings.map((h) => h.text), ['大', '中']);
});

test('renderMarkdown: 画像は取り込み先ファイル名とサイズ付き。使えない参照・失敗は文字に置き換えて警告', async () => {
  const refs = [];
  const warns = [];
  const c = mdCtx({ assets: { save: async (r) => (refs.push(r), { file: 'a.png', width: 10, height: 20 }) }, warn: (m) => warns.push(m) });
  const html = await renderMarkdown('![図1](images/a.png) ![外](https://e.com/b.png) ![bad](http://e.com/c.png) ![abs](/etc/passwd) ![d](data:image/png;base64,AAAA)', c);
  assert.deepEqual(refs, ['local:images/a.png', 'https://e.com/b.png']);
  assert.match(html, /<img src="a\.png" alt="図1" width="10" height="20" loading="lazy"/);
  assert.equal(warns.length, 3);
  const failing = mdCtx({ assets: { save: async () => { throw new Error('boom'); } }, warn: (m) => warns.push(m) });
  assert.doesNotMatch(await renderMarkdown('![代替](x.png)', failing), /<img/);
});

test('renderMarkdown: 表はスクロール用のラッパーで包む／firstParagraphText', async () => {
  const html = await renderMarkdown('導入 **文**\n\n| A | B |\n|---|---|\n| 1 | 2 |', mdCtx());
  assert.match(html, /<div class="table-wrap"><table>/);
  assert.equal(firstParagraphText(html), '導入 文');
});

test('assets: 記事フォルダの外の画像・SVG・巨大でない不正ファイルは拒否', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-'));
  await fs.writeFile(path.join(dir, 'ok.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  await fs.writeFile(path.join(dir, 'x.png'), 'not an image');
  const store = createAssetStore({ outDir: path.join(dir, 'out'), localDir: dir });
  await assert.rejects(() => store.save('local:../../etc/passwd'), /外にある/);
  await assert.rejects(() => store.save('local:ok.svg'), /SVG/);
  await assert.rejects(() => store.save('local:x.png'), /画像として認識/);
  await assert.rejects(() => store.save('http://e.com/a.png'), /https 以外/);
});

test('buildBlog: サンプル記事から一覧・記事ページを生成し、画像を取り込む', async () => {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'dist-'));
  const site = { siteUrl: 'https://x.example', gaId: '' };
  const articles = await buildBlog({ site, contentDir: FIX, distDir: dist, log: quiet, now: NOW });
  assert.deepEqual(articles.map((a) => a.slug).sort(), ['construction-dx-3-points', 'construction-dx-3-points-2', 'no-slug-summary'].sort());
  const page = await fs.readFile(path.join(dist, 'blog/construction-dx-3-points/index.html'), 'utf8');
  assert.match(page, /BlogPosting/);
  assert.match(page, /rel="canonical" href="https:\/\/x\.example\/blog\/construction-dx-3-points\/"/);
  assert.doesNotMatch(page, /<script>alert|href="javascript:/);
  const files = await fs.readdir(path.join(dist, 'blog/construction-dx-3-points'));
  assert.ok(files.some((f) => f.endsWith('.png')), '画像が記事フォルダに入る');
  const index = await fs.readFile(path.join(dist, 'blog/index.html'), 'utf8');
  assert.doesNotMatch(index, /下書きの記事|予約公開の記事|公開日がない記事|無視される/);
});

test('readArticleFiles: _ で始まるファイルと README は読まない', async () => {
  const names = (await readArticleFiles(FIX)).map((e) => e.file);
  assert.ok(!names.includes('_ignored.md'));
  assert.ok(names.includes('construction-dx-guide.md'));
});

test('renderMarkdown: 日本語の文中でも **強調** が効く', async () => {
  const html = await renderMarkdown('現場の**“当たり前”**を変える。これは**（注意）**です', mdCtx());
  assert.match(html, /<strong>“当たり前”<\/strong>を/);
  assert.match(html, /<strong>（注意）<\/strong>です/);
});
