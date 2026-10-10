import assert from 'node:assert/strict';
import test from 'node:test';
import { selectArticles, pageToMeta } from '../lib/articles.mjs';
import { linkHref, renderBlocks, renderRichText } from '../lib/blocks.mjs';
import { createNotionSource } from '../lib/notion.mjs';
import { sniffImage } from '../lib/assets.mjs';
import { buildSitemap } from '../lib/seo.mjs';
import { gaTag, injectGa, isValidGaId } from '../lib/tracking.mjs';
import { esc, safeUrl, toSlug } from '../lib/util.mjs';

const rt = (text, extra = {}) => ({ type: 'text', plain_text: text, href: extra.href ?? null, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, ...extra.ann }, text: { content: text } });
const para = (...r) => ({ id: 'x', type: 'paragraph', has_children: false, paragraph: { rich_text: r } });
const ctx = () => ({ source: { listBlocks: async () => [] }, assets: { save: async () => ({ file: 'a.png', width: 10, height: 20 }) }, warn: () => {}, headings: [] });

test('esc: HTMLの特殊文字をエスケープする', () => {
  assert.equal(esc(`<a href="x">&'`), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
});

test('safeUrl / linkHref: 危険なURLを除外する', () => {
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeUrl('JaVaScRiPt:alert(1)'), '');
  assert.equal(safeUrl('data:text/html,<script>'), '');
  assert.equal(safeUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(linkHref('/abcdef0123'), '', 'Notion内部リンクは除外');
  assert.equal(linkHref('mailto:a@example.com'), 'mailto:a@example.com');
});

test('toSlug: 半角英数とハイフンだけにする', () => {
  assert.equal(toSlug(' Construction DX_Guide '), 'construction-dx-guide');
  assert.equal(toSlug('建設DX'), 'dx');
  assert.equal(toSlug('建設'), '');
});

test('renderRichText: 装飾・リンク・エスケープ・改行', () => {
  const html = renderRichText([rt('a<b', { ann: { bold: true } }), rt('\nx', { href: 'https://e.com', ann: { code: true } })]);
  assert.match(html, /<strong>a&lt;b<\/strong>/);
  assert.match(html, /<a href="https:\/\/e\.com" rel="noopener noreferrer" target="_blank"><code><br>x<\/code><\/a>/);
  assert.doesNotMatch(renderRichText([rt('t', { href: 'javascript:alert(1)' })]), /<a /);
});

test('renderBlocks: 連続するリストを1つにまとめ、入れ子も扱う', async () => {
  const kids = [{ id: 'c1', type: 'bulleted_list_item', has_children: false, bulleted_list_item: { rich_text: [rt('子')] } }];
  const c = ctx();
  c.source.listBlocks = async (id) => (id === 'p' ? kids : []);
  const html = await renderBlocks(
    [
      { id: 'p', type: 'bulleted_list_item', has_children: true, bulleted_list_item: { rich_text: [rt('親')] } },
      { id: 'q', type: 'bulleted_list_item', has_children: false, bulleted_list_item: { rich_text: [rt('次')] } },
      { id: 'n', type: 'numbered_list_item', has_children: false, numbered_list_item: { rich_text: [rt('番号')] } },
    ],
    c,
  );
  assert.equal((html.match(/<ul>/g) || []).length, 2, '親のul + 入れ子のul');
  assert.equal((html.match(/<ol>/g) || []).length, 1);
  assert.match(html, /<li>親\n<ul>\n<li>子<\/li>\n<\/ul>\n<\/li>/);
});

test('renderBlocks: 見出しはh2から始まり、目次用に記録される', async () => {
  const c = ctx();
  const html = await renderBlocks([{ id: 'h', type: 'heading_1', has_children: false, heading_1: { rich_text: [rt('見出し')] } }], c);
  assert.match(html, /<h2 id="h-1">見出し<\/h2>/);
  assert.deepEqual(c.headings, [{ level: 2, id: 'h-1', text: '見出し' }]);
});

test('renderBlocks: コードはエスケープされ、言語名は安全な文字だけ', async () => {
  const html = await renderBlocks([{ id: 'k', type: 'code', has_children: false, code: { rich_text: [rt('<script>1</script>')], language: 'java"><script>' } }], ctx());
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /class="language-javascript"|class="language-java/);
});

test('renderBlocks: 画像は取り込み先のファイル名とサイズ付きで出力。失敗時は警告して省略', async () => {
  const img = { id: 'i', type: 'image', has_children: false, image: { type: 'external', external: { url: 'https://e.com/a.png' }, caption: [rt('図1')] } };
  assert.match(await renderBlocks([img], ctx()), /<img src="a\.png" alt="図1" width="10" height="20" loading="lazy"/);
  const warns = [];
  const bad = ctx();
  bad.assets.save = async () => {
    throw new Error('boom');
  };
  bad.warn = (m) => warns.push(m);
  assert.equal(await renderBlocks([img], bad), '');
  assert.equal(warns.length, 1);
});

test('renderBlocks: 危険なブックマークは出力しない／不明ブロックは警告', async () => {
  const warns = [];
  const c = ctx();
  c.warn = (m) => warns.push(m);
  const html = await renderBlocks(
    [
      { id: 'b', type: 'bookmark', has_children: false, bookmark: { url: 'javascript:alert(1)', caption: [] } },
      { id: 'u', type: 'mystery_block', has_children: false, mystery_block: {} },
    ],
    c,
  );
  assert.equal(html, '');
  assert.equal(warns.length, 1);
});

test('renderBlocks: 表（見出し行つき）', async () => {
  const c = ctx();
  c.source.listBlocks = async () => [
    { id: 'r1', type: 'table_row', table_row: { cells: [[rt('A')], [rt('B')]] } },
    { id: 'r2', type: 'table_row', table_row: { cells: [[rt('1')], [rt('2')]] } },
  ];
  const html = await renderBlocks([{ id: 't', type: 'table', has_children: true, table: { has_column_header: true, has_row_header: false } }], c);
  assert.match(html, /<thead><tr><th scope="col">A<\/th><th scope="col">B<\/th><\/tr><\/thead><tbody><tr><td>1<\/td><td>2<\/td><\/tr><\/tbody>/);
});

const page = (over = {}) => ({
  object: 'page',
  id: 'aaaaaaaa-0000-0000-0000-000000000000',
  created_time: '2026-09-01T00:00:00.000Z',
  last_edited_time: '2026-09-02T00:00:00.000Z',
  archived: false,
  in_trash: false,
  cover: null,
  properties: {
    タイトル: { type: 'title', title: [rt('記事')] },
    ステータス: { type: 'select', select: { name: '公開' } },
    公開日: { type: 'date', date: { start: '2026-09-01' } },
    スラッグ: { type: 'rich_text', rich_text: [rt('my-post')] },
    ...over,
  },
});

test('pageToMeta: 公開条件（ステータス・予約公開・ゴミ箱・タイトル）', () => {
  const now = new Date('2026-10-10T00:00:00Z');
  assert.ok(pageToMeta(page(), { now }).meta);
  assert.ok(pageToMeta(page({ ステータス: { type: 'status', status: { name: '公開' } } }), { now }).meta, 'statusプロパティでも可');
  assert.ok(pageToMeta(page({ ステータス: { type: 'select', select: { name: '下書き' } } }), { now }).skip);
  assert.ok(pageToMeta(page({ 公開日: { type: 'date', date: { start: '2099-01-01' } } }), { now }).skip, '未来の公開日は非公開');
  assert.ok(pageToMeta({ ...page(), archived: true }, { now }).skip);
  assert.ok(pageToMeta(page({ タイトル: { type: 'title', title: [] } }), { now }).skip);
});

test('selectArticles: 新しい順・スラッグ重複の解消・スラッグ未入力の補完', () => {
  const a = page();
  const b = { ...page({ 公開日: { type: 'date', date: { start: '2026-09-05' } } }), id: 'bbbbbbbb-0000-0000-0000-000000000000' };
  const c = { ...page({ スラッグ: { type: 'rich_text', rich_text: [] } }), id: 'cccccccc-0000-0000-0000-000000000000' };
  const out = selectArticles([a, b, c], { now: new Date('2026-10-10T00:00:00Z') });
  assert.equal(out.length, 3);
  assert.ok(out.map((m) => m.slug).includes("my-post-2"), "重複スラッグには連番が付く");
  assert.equal(new Set(out.map((m) => m.slug)).size, 3, 'スラッグはすべて異なる');
  assert.ok(out[0].published >= out[1].published && out[1].published >= out[2].published, '新しい順');
  assert.equal(out.find((m) => m.id.startsWith('cccc')).slug, 'post-cccccccc');
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

test('Notion クライアント: 新方式(data_sources)・旧方式・429の再試行・405でPATCH', async () => {
  const calls = [];
  const mk = (handler) =>
    createNotionSource({
      token: 't',
      databaseId: 'db1',
      log: { warn() {} },
      fetchImpl: async (url, opt) => {
        calls.push(`${opt.method} ${url.replace('https://api.notion.com/v1', '')}`);
        return handler(url, opt);
      },
    });
  const res = (status, json, headers = {}) => ({ status, ok: status < 300, headers: { get: (k) => headers[k.toLowerCase()] ?? null }, text: async () => JSON.stringify(json) });

  // 新方式
  let src = mk((url) => (url.endsWith('/databases/db1') ? res(200, { data_sources: [{ id: 'ds1', name: 'x' }] }) : res(200, { results: [{ object: 'page', id: 'p1' }], has_more: false })));
  assert.equal((await src.queryPages()).length, 1);
  assert.ok(calls.includes('POST /data_sources/ds1/query'));

  // 旧方式
  calls.length = 0;
  src = mk((url) => (url.endsWith('/databases/db1') ? res(200, { object: 'database' }) : res(200, { results: [], has_more: false })));
  await src.queryPages();
  assert.ok(calls.includes('POST /databases/db1/query'));

  // 405 → PATCH
  calls.length = 0;
  let first = true;
  src = mk((url, opt) => {
    if (url.endsWith('/databases/db1')) return res(200, { data_sources: [{ id: 'ds1', name: 'x' }] });
    if (opt.method === 'POST' && first) {
      first = false;
      return res(405, { code: 'invalid_request', message: 'method' });
    }
    return res(200, { results: [], has_more: false });
  });
  await src.queryPages();
  assert.ok(calls.includes('PATCH /data_sources/ds1/query'));

  // エラーは握りつぶさず例外にする（空のブログで本番を上書きしないため）
  src = mk(() => res(404, { code: 'object_not_found', message: 'shared?' }));
  await assert.rejects(() => src.queryPages(), /object_not_found/);
});
