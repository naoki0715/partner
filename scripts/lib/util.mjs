// ビルド共通のユーティリティ（依存なし）
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** テキストをHTMLに安全に埋め込むためのエスケープ */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/** JSON-LDを<script>内に埋め込むときの安全化（</script> や <!-- を防ぐ） */
export function jsonForScript(obj) {
  return JSON.stringify(obj, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .split(String.fromCharCode(0x2028)).join('\\u2028')
    .split(String.fromCharCode(0x2029)).join('\\u2029');
}

/**
 * リンク先として許可するURLだけを返す。許可: http / https / mailto / tel / ページ内リンク(#) / 相対パス。
 * javascript: や data: などは空文字にする。
 */
export function safeUrl(raw) {
  const url = String(raw ?? '').trim();
  if (!url) return '';
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
  if (url.startsWith('#') || url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) return url;
  // スキームを持たない相対URL（例: "page.html"）は許可。スキーム付き（"javascript:" 等）は拒否
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return '';
  return url;
}

/** スラッグとして使える文字列に整える。使えなければ空文字 */
export function toSlug(raw) {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s;
}

/** "2026-10-10" 形式（日本時間）の日付文字列 */
export function ymdJst(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

/** "2026年10月10日" 形式 */
export function jaDate(dateLike) {
  const ymd = ymdJst(dateLike);
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}

/** 文字数を丸めた説明文（HTMLを含まないテキスト用） */
export function truncate(text, max) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : t.slice(0, max - 1) + '…';
}

export async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** 公開物としてコピーする拡張子（ビルド用ファイルや README は含めない） */
const PUBLIC_EXT = new Set(['.html', '.js', '.css', '.png', '.webp', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.txt', '.xml', '.json', '.woff2']);
const PUBLIC_NAMES = new Set(['.nojekyll', 'CNAME']);

/** リポジトリ直下の公開ファイルを dist にコピーする */
export async function copyPublicFiles(srcDir, distDir) {
  await fs.mkdir(distDir, { recursive: true });
  const copied = [];
  for (const entry of await fs.readdir(srcDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!PUBLIC_EXT.has(ext) && !PUBLIC_NAMES.has(entry.name)) continue;
    if (entry.name === 'package.json' || entry.name === 'package-lock.json') continue;
    await fs.copyFile(path.join(srcDir, entry.name), path.join(distDir, entry.name));
    copied.push(entry.name);
  }
  return copied;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/** dist を配信する簡易サーバー（プリレンダリングと検証用）。ポートは自動割り当て */
export async function serveDir(dir) {
  const root = path.resolve(dir);
  const server = http.createServer(async (req, res) => {
    try {
      let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = path.resolve(root, '.' + pathname);
      if (file !== root && !file.startsWith(root + path.sep)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      const data = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) };
}
