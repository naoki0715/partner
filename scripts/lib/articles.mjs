// Notion のページ（記事）→ 記事のメタ情報。公開してよいかの判定もここで行う。
//
// Notion データベースのプロパティ（名前は固定）:
//   タイトル : タイトル列（名前は何でも可）
//   スラッグ : テキスト。URLの一部になる（半角英数とハイフン。例 construction-dx-guide）
//   ステータス: 選択 または ステータス。「公開」のときだけ公開される
//   公開日   : 日付。未来の日付は、その日時になるまで公開されない（予約公開）
//   概要     : テキスト。検索結果・SNSに出る説明文（120文字程度）
//   カテゴリ  : 選択（任意）
//   タグ     : マルチ選択（任意）
// ページのカバー画像があれば、記事のOGP画像と一覧のサムネイルに使います。
import { plainText } from './blocks.mjs';
import { toSlug } from './util.mjs';

export const PROP = {
  slug: 'スラッグ',
  status: 'ステータス',
  date: '公開日',
  description: '概要',
  category: 'カテゴリ',
  tags: 'タグ',
};
export const PUBLISHED_LABEL = '公開';

function statusName(prop) {
  if (!prop) return '';
  if (prop.type === 'status') return prop.status?.name ?? '';
  if (prop.type === 'select') return prop.select?.name ?? '';
  return '';
}

/** Notionのページ1件 → 記事メタ。公開対象でなければ { skip: '理由' } を返す */
export function pageToMeta(page, { now = new Date() } = {}) {
  const props = page.properties || {};
  const titleProp = Object.values(props).find((p) => p.type === 'title');
  const title = plainText(titleProp?.title).trim();
  const label = title || page.id;

  if (page.archived || page.in_trash) return { skip: `「${label}」: ゴミ箱/アーカイブ済み` };
  const status = statusName(props[PROP.status]);
  if (status !== PUBLISHED_LABEL) return { skip: `「${label}」: ステータスが「${status || '未設定'}」` };
  if (!title) return { skip: `ページ ${page.id}: タイトルが空です` };

  const dateIso = props[PROP.date]?.date?.start || page.created_time;
  const published = new Date(dateIso);
  if (Number.isNaN(published.getTime())) return { skip: `「${title}」: 公開日が不正です` };
  if (published > now) return { skip: `「${title}」: 公開日（${dateIso}）がまだ先です（予約公開）` };

  const rawSlug = plainText(props[PROP.slug]?.rich_text).trim();
  const slug = toSlug(rawSlug);
  const cover = page.cover ? (page.cover.type === 'external' ? page.cover.external?.url : page.cover.file?.url) : '';

  return {
    meta: {
      id: page.id,
      title,
      slug: slug || `post-${page.id.replace(/-/g, '').slice(0, 8)}`,
      slugWasInvalid: !!rawSlug && !slug,
      slugWasMissing: !rawSlug,
      published,
      modified: new Date(page.last_edited_time || dateIso),
      description: plainText(props[PROP.description]?.rich_text).trim(),
      category: props[PROP.category]?.select?.name || '',
      tags: (props[PROP.tags]?.multi_select || []).map((t) => t.name).filter(Boolean),
      coverUrl: cover || '',
    },
  };
}

/** 公開対象の記事メタを新しい順に並べ、スラッグの重複を解消する */
export function selectArticles(pages, { now = new Date(), warn = () => {} } = {}) {
  const metas = [];
  for (const page of pages) {
    const r = pageToMeta(page, { now });
    if (r.skip) {
      warn(`公開しません: ${r.skip}`);
      continue;
    }
    if (r.meta.slugWasMissing) warn(`「${r.meta.title}」: スラッグが未入力のため ${r.meta.slug} を使います（URLを固定したい場合はスラッグを入力）`);
    else if (r.meta.slugWasInvalid) warn(`「${r.meta.title}」: スラッグに使える文字がないため ${r.meta.slug} を使います（半角英数とハイフンで入力してください）`);
    metas.push(r.meta);
  }
  metas.sort((a, b) => b.published - a.published || a.title.localeCompare(b.title, 'ja'));
  const used = new Set();
  for (const m of metas) {
    let s = m.slug;
    let n = 2;
    while (used.has(s)) s = `${m.slug}-${n++}`;
    if (s !== m.slug) warn(`「${m.title}」: スラッグ ${m.slug} が重複しているため ${s} にしました`);
    m.slug = s;
    used.add(s);
  }
  return metas;
}
