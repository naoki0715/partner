// Notion のブロック → 静的HTML への変換。
// 方針: 文字はすべてエスケープする。リンクは http/https/mailto/tel/#（ページ内）だけ許可する。
import { esc } from './util.mjs';

const MAX_DEPTH = 8;

export function plainText(richText = []) {
  return richText.map((t) => t.plain_text ?? '').join('');
}

/** 記事内リンクとして許可するURLだけ返す（Notion内部リンク "/xxxx" や javascript: は除外） */
export function linkHref(raw) {
  const url = String(raw ?? '').trim();
  if (!url) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) return url;
  if (url.startsWith('#')) return url;
  return '';
}

function anchor(href, innerHtml) {
  const external = /^https?:\/\//i.test(href);
  const attrs = external ? ' rel="noopener noreferrer" target="_blank"' : '';
  return `<a href="${esc(href)}"${attrs}>${innerHtml}</a>`;
}

export function renderRichText(richText = []) {
  return richText
    .map((rt) => {
      let text;
      if (rt.type === 'equation') {
        text = `<code>${esc(rt.equation?.expression ?? rt.plain_text ?? '')}</code>`;
      } else {
        text = esc(rt.plain_text ?? '').replace(/\n/g, '<br>');
      }
      const a = rt.annotations || {};
      if (a.code) text = `<code>${text}</code>`;
      if (a.bold) text = `<strong>${text}</strong>`;
      if (a.italic) text = `<em>${text}</em>`;
      if (a.strikethrough) text = `<s>${text}</s>`;
      if (a.underline) text = `<u>${text}</u>`;
      const href = linkHref(rt.href ?? rt.text?.link?.url);
      if (href) text = anchor(href, text);
      return text;
    })
    .join('');
}

const LIST_TYPES = new Set(['bulleted_list_item', 'numbered_list_item', 'to_do']);

/**
 * @param blocks Notion のブロック配列
 * @param ctx { source, assets, warn, headings, depth }
 *   source.listBlocks(id) / assets.save(url) → { file, width, height } / warn(msg)
 */
export async function renderBlocks(blocks, ctx) {
  const depth = ctx.depth ?? 0;
  if (depth > MAX_DEPTH) {
    ctx.warn('ブロックの入れ子が深すぎるため、以降を省略しました');
    return '';
  }
  const inner = { ...ctx, depth: depth + 1 };
  const out = [];
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    if (LIST_TYPES.has(block.type)) {
      const type = block.type;
      const items = [];
      while (i < blocks.length && blocks[i].type === type) {
        items.push(await renderListItem(blocks[i], inner));
        i++;
      }
      const tag = type === 'numbered_list_item' ? 'ol' : 'ul';
      const cls = type === 'to_do' ? ' class="todo"' : '';
      out.push(`<${tag}${cls}>\n${items.join('\n')}\n</${tag}>`);
      continue;
    }
    const html = await renderBlock(block, inner);
    if (html) out.push(html);
    i++;
  }
  return out.join('\n');
}

async function childBlocks(block, ctx) {
  if (!block.has_children) return [];
  if (block.type === 'child_page' || block.type === 'child_database') return [];
  // 同期ブロック（コピー）は元のブロックの中身を取得する
  const id = block.type === 'synced_block' && block.synced_block?.synced_from?.block_id ? block.synced_block.synced_from.block_id : block.id;
  return ctx.source.listBlocks(id);
}

async function renderChildren(block, ctx) {
  const kids = await childBlocks(block, ctx);
  return kids.length ? renderBlocks(kids, ctx) : '';
}

async function renderListItem(block, ctx) {
  const data = block[block.type];
  let inner = renderRichText(data.rich_text);
  if (block.type === 'to_do') inner = `<span class="todo-mark" aria-hidden="true">${data.checked ? '☑' : '☐'}</span> ${inner}`;
  const kids = await renderChildren(block, ctx);
  return `<li>${inner}${kids ? `\n${kids}\n` : ''}</li>`;
}

function slugCode(lang) {
  return String(lang || '').toLowerCase().replace(/[^a-z0-9+#-]/g, '');
}

async function renderImage(block, ctx) {
  const data = block.image;
  const url = data.type === 'external' ? data.external?.url : data.file?.url;
  const caption = plainText(data.caption);
  if (!url) return '';
  try {
    const saved = await ctx.assets.save(url);
    const size = saved.width && saved.height ? ` width="${saved.width}" height="${saved.height}"` : '';
    const img = `<img src="${esc(saved.file)}" alt="${esc(caption)}"${size} loading="lazy" decoding="async">`;
    const cap = caption ? `<figcaption>${renderRichText(data.caption)}</figcaption>` : '';
    return `<figure>${img}${cap}</figure>`;
  } catch (e) {
    ctx.warn(`画像を取り込めませんでした（${e.message}）。この画像は表示されません`);
    return '';
  }
}

function linkCard(url, label) {
  const href = linkHref(url);
  if (!href) return '';
  return `<p class="link-card">${anchor(href, esc(label || href))}</p>`;
}

async function renderBlock(block, ctx) {
  const type = block.type;
  const data = block[type];

  switch (type) {
    case 'paragraph': {
      const text = renderRichText(data.rich_text);
      const kids = await renderChildren(block, ctx);
      if (!text && !kids) return '';
      return `${text ? `<p>${text}</p>` : ''}${kids ? `\n<div class="indent">\n${kids}\n</div>` : ''}`;
    }
    case 'heading_1':
    case 'heading_2':
    case 'heading_3': {
      const level = { heading_1: 2, heading_2: 3, heading_3: 4 }[type]; // 記事タイトルがh1のため1つずらす
      const text = renderRichText(data.rich_text);
      if (!text) return '';
      const id = `h-${ctx.headings.length + 1}`;
      ctx.headings.push({ level, id, text: plainText(data.rich_text) });
      const kids = await renderChildren(block, ctx);
      return `<h${level} id="${id}">${text}</h${level}>${kids ? `\n${kids}` : ''}`;
    }
    case 'quote': {
      const kids = await renderChildren(block, ctx);
      return `<blockquote><p>${renderRichText(data.rich_text)}</p>${kids ? `\n${kids}\n` : ''}</blockquote>`;
    }
    case 'callout': {
      const icon = data.icon?.type === 'emoji' ? `<span class="callout-icon" aria-hidden="true">${esc(data.icon.emoji)}</span>` : '';
      const kids = await renderChildren(block, ctx);
      return `<aside class="callout">${icon}<div><p>${renderRichText(data.rich_text)}</p>${kids ? `\n${kids}\n` : ''}</div></aside>`;
    }
    case 'code': {
      const lang = slugCode(data.language);
      const cls = lang && lang !== 'plain-text' ? ` class="language-${lang}"` : '';
      return `<pre><code${cls}>${esc(plainText(data.rich_text))}</code></pre>`;
    }
    case 'equation':
      return `<pre class="equation">${esc(data.expression)}</pre>`;
    case 'divider':
      return '<hr>';
    case 'image':
      return renderImage(block, ctx);
    case 'bookmark':
    case 'link_preview':
      return linkCard(data.url, plainText(data.caption));
    case 'embed':
      return linkCard(data.url, plainText(data.caption));
    case 'video': {
      if (data.type === 'external') return linkCard(data.external?.url, plainText(data.caption));
      ctx.warn('Notionにアップロードした動画は取り込めません（YouTube等のURLを貼ってください）');
      return '';
    }
    case 'file':
    case 'pdf':
      ctx.warn('Notionにアップロードしたファイル/PDFは取り込めません（外部のURLを貼ってください）');
      return '';
    case 'toggle': {
      const kids = await renderChildren(block, ctx);
      return `<details><summary>${renderRichText(data.rich_text)}</summary>${kids ? `\n${kids}\n` : ''}</details>`;
    }
    case 'table': {
      const rows = await childBlocks(block, ctx);
      const colHeader = !!data.has_column_header;
      const rowHeader = !!data.has_row_header;
      const cellHtml = (cells, r) =>
        cells
          .map((c, ci) => {
            const th = (colHeader && r === 0) || (rowHeader && ci === 0);
            const scope = th ? (colHeader && r === 0 ? ' scope="col"' : ' scope="row"') : '';
            return `<${th ? 'th' : 'td'}${scope}>${renderRichText(c)}</${th ? 'th' : 'td'}>`;
          })
          .join('');
      const trs = rows.filter((x) => x.type === 'table_row').map((row, r) => `<tr>${cellHtml(row.table_row.cells, r)}</tr>`);
      if (!trs.length) return '';
      const head = colHeader ? `<thead>${trs[0]}</thead>` : '';
      const body = `<tbody>${(colHeader ? trs.slice(1) : trs).join('')}</tbody>`;
      return `<div class="table-wrap"><table>${head}${body}</table></div>`;
    }
    case 'column_list': {
      const columns = await childBlocks(block, ctx);
      const cols = [];
      for (const col of columns) cols.push(`<div class="col">${await renderChildren(col, ctx)}</div>`);
      return `<div class="columns">${cols.join('')}</div>`;
    }
    case 'synced_block':
      return renderChildren(block, ctx);
    case 'table_of_contents':
    case 'breadcrumb':
    case 'child_page':
    case 'child_database':
    case 'unsupported':
      return '';
    default:
      ctx.warn(`未対応のブロック「${type}」は表示されません`);
      return '';
  }
}

/** 記事の冒頭の段落から説明文の素を取る（概要が未入力のとき用） */
export function firstParagraphText(blocks) {
  for (const b of blocks) {
    if (b.type === 'paragraph') {
      const t = plainText(b.paragraph.rich_text).trim();
      if (t) return t;
    }
  }
  return '';
}
