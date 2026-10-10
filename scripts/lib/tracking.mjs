// 計測タグ（全ページ共通）。LPにはすでに Juicer が直接書かれているため、ブログ側とGAはここから入れる。

/** Juicer（index.html に書かれているものと同一） */
export const JUICER_TAG = '<script src="//kitchen.juicer.cc/?color=kjhwScsDgFI=" async></script>';

/** GA4 の測定ID（G- で始まる）として正しい形か */
export function isValidGaId(id) {
  return /^G-[A-Z0-9]{6,14}$/.test(String(id ?? ''));
}

/** GA4 のタグ。測定IDが未設定・不正なら空文字 */
export function gaTag(id) {
  if (!isValidGaId(id)) return '';
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');</script>`;
}

/** <head> の末尾に計測タグを差し込む（すでに入っているものは重複させない） */
export function injectGa(html, id) {
  const tag = gaTag(id);
  if (!tag) return html;
  if (html.includes('googletagmanager.com/gtag/js')) return html;
  return html.replace('</head>', `<!-- Google Analytics -->\n${tag}\n</head>`);
}
