// LPのプリレンダリング
//
// LPの本文は、ブラウザ上のJavaScript（support.js）が組み立てています。そのままでは、JavaScriptを
// 実行しないクローラー（多くのAI検索のクローラー）に本文が読まれません。
// ここでは、ヘッドレスChromiumで描画した結果を「完成形のHTML」として index.html に埋め込みます。
//
// 重要な制約:
//  - ランタイム（support.js）は起動時に <x-dc>（ひな形）を読み取るため、ひな形は消せません。
//    そのため完成形は <x-dc> の「前」に置き、ひな形側は hidden にします。
//  - ブラウザで描画が終わったら、完成形（#prerender）は自動で取り除きます（二重表示の防止）。
//    React等の読み込みに失敗した場合は、完成形がそのまま残ります（真っ白にならない）。
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { serveDir } from './lib/util.mjs';

const ALLOWED_HOSTS = new Set(['unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com']);

// 描画が終わったら完成形を取り除くスクリプト
const REMOVE_SCRIPT = `<script>(function(){var s=document.getElementById('prerender');if(!s)return;function ready(){var r=document.getElementById('dc-root');return !!(r&&r.querySelector('h1'));}function done(){if(s.parentNode)s.parentNode.removeChild(s);}if(ready()){done();return;}var mo=new MutationObserver(function(){if(ready()){mo.disconnect();done();}});mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(function(){mo.disconnect();},20000);})();</script>`;

/** ブラウザ内で実行：#dc-root から完成形HTMLを取り出す */
function extractSnapshot(origin) {
  const root = document.querySelector('#dc-root');
  const clone = root.cloneNode(true);

  // 実行時の都合で付くもの・不要なものを除く
  clone.querySelectorAll('script, [data-consent], [data-form-msg], img[data-preload]').forEach((n) => n.remove());

  // 画像枠（image-slot）は内部のDOMが隠れているため、通常の <img> に置き換える
  clone.querySelectorAll('image-slot').forEach((slot) => {
    const src = slot.getAttribute('src');
    if (!src) {
      slot.remove();
      return;
    }
    const img = document.createElement('img');
    img.setAttribute('src', src);
    img.setAttribute('alt', slot.getAttribute('alt') || '');
    img.setAttribute('loading', 'lazy');
    const base = slot.getAttribute('style') || '';
    const round = slot.getAttribute('shape') === 'circle' ? 'border-radius:50%;' : '';
    img.setAttribute('style', `${base};display:block;object-fit:cover;${round}`);
    slot.replaceWith(img);
  });

  // 実行用の内部属性を除く（任意）
  clone.querySelectorAll('[data-dc-tpl]').forEach((n) => n.removeAttribute('data-dc-tpl'));

  // 絶対URL（配信サーバーのオリジン）を相対に戻す
  return clone.innerHTML.split(origin + '/').join('').split(origin).join('');
}

/** index.html の <helmet> から、完成形の表示に必要なCSSを取り出す */
function extractHelmetCss(html) {
  const helmet = /<helmet>([\s\S]*?)<\/helmet>/.exec(html)?.[1] ?? '';
  const links = [...helmet.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)].map((m) => m[0]);
  const styles = [...helmet.matchAll(/<style>[\s\S]*?<\/style>/g)].map((m) => m[0]);
  return [...links, ...styles].join('\n');
}

export async function prerenderLanding(distDir) {
  const indexPath = path.join(distDir, 'index.html');
  const source = await fs.readFile(indexPath, 'utf8');
  if (!/<x-dc>/.test(source)) throw new Error('index.html に <x-dc> が見つかりません');

  const server = await serveDir(distDir);
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    // 計測タグ等の外部通信は止める（完成形に混ざらないように）
    await page.route('**/*', (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === '127.0.0.1' || ALLOWED_HOSTS.has(u.hostname)) return route.continue();
      return route.abort();
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(server.url + '/index.html', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('#dc-root h1', { timeout: 30000 });
    await page.waitForTimeout(1500);
    const snapshot = await page.evaluate(extractSnapshot, server.url);
    if (errors.length) console.warn('  ⚠ ページ内エラー:', errors.slice(0, 3).join(' / '));
    if (!snapshot.includes('<h1') || snapshot.includes('{{')) {
      throw new Error('完成形の取得に失敗しました（h1が無い、または未置換の {{ }} が残っています）');
    }

    const css = extractHelmetCss(source);
    let out = source;
    // 1) 完成形のCSSをheadに（ランタイムが追加する分と重複しても問題なし）
    out = out.replace('</head>', `<!-- prerender: 完成形の表示用CSS -->\n${css}\n</head>`);
    // 2) 完成形を <x-dc> の前に置き、ひな形は隠す
    const body = /<body[^>]*>\s*<x-dc>/;
    if (!body.test(out)) throw new Error('<body> 直後の <x-dc> が見つかりません');
    out = out.replace(body, (m) => m.replace(/<x-dc>$/, `<div id="prerender" data-prerendered>${snapshot}</div>\n${REMOVE_SCRIPT}\n<x-dc hidden aria-hidden="true">`));
    await fs.writeFile(indexPath, out);
    return { bytes: snapshot.length, text: await page.evaluate(() => document.querySelector('#dc-root').innerText.length) };
  } finally {
    await browser.close();
    await server.close();
  }
}
