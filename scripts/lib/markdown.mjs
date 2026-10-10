// Markdown 本文 → 記事HTML。
//   ・本文中の生HTMLはそのまま出さず、文字として表示する（html:false）。危険なリンク（javascript: 等）も markdown-it が除外する。
//   ・画像はリポジトリ内のファイル（相対パス）か https の外部URL。ビルド時に記事フォルダへ取り込み、寸法を付ける。
//   ・見出しは h2〜h4 に揃える（h1 はページの題名に使うため）。目次用の id（h-N）を付けて ctx.headings に記録する。
import MarkdownIt from 'markdown-it';
import cjkFriendly from 'markdown-it-cjk-friendly';
import { esc } from './util.mjs';

function makeParser() {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false, breaks: false });
  md.use(cjkFriendly); // 日本語の文中でも **強調** が効くようにする
  const defaultLinkOpen = md.renderer.rules.link_open || ((t, i, o, e, s) => s.renderToken(t, i, o));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet('href') || '';
    if (/^https?:\/\//i.test(href)) {
      tokens[idx].attrSet('rel', 'noopener noreferrer');
      tokens[idx].attrSet('target', '_blank');
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };
  md.renderer.rules.table_open = () => '<div class="table-wrap"><table>\n';
  md.renderer.rules.table_close = () => '</table></div>\n';
  return md;
}
const md = makeParser();

/** 画像の参照先を assets.save に渡す形へ。使えない参照は null */
function imageRef(src) {
  const s = String(src || '').trim();
  if (/^https:\/\//i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) || s.startsWith('//') || s.startsWith('/')) return null; // http:, data:, javascript: など
  return 'local:' + s.replace(/^\.\//, '');
}

/**
 * @param body   Markdown 本文
 * @param ctx    { assets, warn, headings }
 * @returns      HTML 文字列
 */
export async function renderMarkdown(body, ctx) {
  const env = {};
  const tokens = md.parse(body, env);
  let headingCount = 0;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'heading_open') {
      const level = Math.min(4, Math.max(2, Number(t.tag.slice(1))));
      t.tag = `h${level}`;
      const close = tokens.slice(i + 1).find((x) => x.type === 'heading_close');
      if (close) close.tag = t.tag;
      headingCount += 1;
      const id = `h-${headingCount}`;
      t.attrSet('id', id);
      if (level === 2) ctx.headings.push({ level, id, text: tokens[i + 1]?.content?.trim() || '' });
    }
    if (t.type !== 'inline' || !t.children) continue;
    for (const child of t.children) {
      if (child.type !== 'image') continue;
      const alt = child.content || '';
      const srcText = child.attrGet('src');
      const ref = imageRef(srcText);
      const fail = (why) => {
        ctx.warn(`画像「${srcText}」を取り込めませんでした（${why}）`);
        child.type = 'text';
        child.content = alt;
        child.children = null;
      };
      if (!ref) {
        fail('相対パスか https のURLを指定してください');
        continue;
      }
      try {
        const img = await ctx.assets.save(ref);
        child.attrSet('src', img.file);
        if (img.width && img.height) {
          child.attrSet('width', String(img.width));
          child.attrSet('height', String(img.height));
        }
        child.attrSet('loading', 'lazy');
        child.attrSet('decoding', 'async');
        if (!alt.trim()) ctx.warn(`画像「${srcText}」に代替テキスト（![ここ](…)）がありません。SEO・読み上げのため入力してください`);
      } catch (e) {
        fail(e.message);
      }
    }
  }
  return md.renderer.render(tokens, md.options, env);
}

/** 本文HTMLの最初の段落から説明文の素を取る（summary が未入力のとき用） */
export function firstParagraphText(html) {
  const m = /<p>([\s\S]*?)<\/p>/.exec(html);
  if (!m) return '';
  return m[1]
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export { esc };
