// 記事の画像を取得して dist に保存する。
// 記事に書かれた画像（リポジトリ内のファイル、または https の外部URL）を取得し、記事ごとのフォルダに保存する。
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_BYTES = 15 * 1024 * 1024; // 1ファイル15MBまで
const EXT_BY_TYPE = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/avif': '.avif',
};

/** 画像バイト列から種類と寸法を読む（PNG / JPEG / GIF / WebP）。読めなければ null */
export function sniffImage(buf) {
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { type: 'image/png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length >= 10 && buf.toString('latin1', 0, 3) === 'GIF') {
    return { type: 'image/gif', width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }
  if (buf.length >= 30 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    const kind = buf.toString('latin1', 12, 16);
    if (kind === 'VP8X') return { type: 'image/webp', width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    if (kind === 'VP8 ') return { type: 'image/webp', width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { type: 'image/webp', width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    return { type: 'image/webp' };
  }
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { type: 'image/jpeg', height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
    return { type: 'image/jpeg' };
  }
  const head = buf.toString('utf8', 0, Math.min(buf.length, 512)).trimStart();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return { type: 'image/svg+xml' };
  return null;
}

/**
 * 画像ストアを作る。
 * @param outDir     保存先ディレクトリ（絶対パス）
 * @param localDir   local:相対パス 形式の参照を読む基準ディレクトリ（記事の画像。省略可）
 * @param fetchImpl  テスト用に差し替え可能な fetch
 */
export function createAssetStore({ outDir, localDir, fetchImpl = fetch }) {
  const cache = new Map();

  async function loadBytes(rawUrl) {
    if (rawUrl.startsWith('local:')) {
      if (!localDir) throw new Error('リポジトリ内の画像を読む設定がありません');
      const root = path.resolve(localDir);
      const file = path.resolve(root, rawUrl.slice('local:'.length));
      if (!file.startsWith(root + path.sep)) throw new Error('記事フォルダの外にある画像は使えません');
      const st = await fs.stat(file);
      if (st.size > MAX_BYTES) throw new Error(`画像が大きすぎます (${st.size} bytes)`);
      return fs.readFile(file);
    }
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:') throw new Error(`https 以外の画像URLは取得しません: ${url.protocol}`);
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`画像の取得に失敗 (${res.status}): ${url.origin}${url.pathname}`);
    const declared = Number(res.headers.get('content-length') || 0);
    if (declared > MAX_BYTES) throw new Error(`画像が大きすぎます (${declared} bytes)`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new Error(`画像が大きすぎます (${buf.length} bytes)`);
    return buf;
  }

  /** 画像を保存し、{ file, width, height } を返す。file は outDir からの相対パス */
  async function save(rawUrl) {
    // 外部URLはクエリを除いたパスまでを同一性の鍵にする
    let key = rawUrl;
    try {
      if (!rawUrl.startsWith('local:')) {
        const u = new URL(rawUrl);
        key = u.origin + u.pathname;
      }
    } catch {
      throw new Error('画像URLが不正です');
    }
    if (cache.has(key)) return cache.get(key);

    const job = (async () => {
      const buf = await loadBytes(rawUrl);
      const info = sniffImage(buf);
      if (!info) throw new Error('画像として認識できないファイルです');
      // SVGは内部にスクリプトを書けるため、記事画像としては受け付けない（PNG/JPEG/WebP/GIFを使う）
      if (info.type === 'image/svg+xml') throw new Error('SVG画像は非対応です（PNG/JPEG/WebPを使ってください）');
      const ext = EXT_BY_TYPE[info.type] || '.img';
      const name = crypto.createHash('sha1').update(key).digest('hex').slice(0, 16) + ext;
      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(path.join(outDir, name), buf);
      return { file: name, width: info.width || 0, height: info.height || 0, type: info.type };
    })();
    cache.set(key, job);
    return job;
  }

  return { save };
}
