// content/blog/*.md → 記事のメタ情報。公開してよいかの判定もここで行う。
//
// 記事ファイルの先頭（フロントマター）:
//   ---
//   title: 記事タイトル            必須
//   date: 2026-10-15              必須。公開日。未来の日付は、その日になるまで公開されない（予約公開）
//   summary: 検索結果に出る説明文    推奨（120文字程度）
//   seo_title: 検索結果のタイトル   任意。省略すると「title｜サイト名」
//   slug: construction-dx-guide   任意。URLの一部（半角英数とハイフン）。省略するとファイル名
//   category: 建設DX               任意
//   tags: [建設DX, 中小企業]        任意
//   cover: images/cover.png       任意。一覧のサムネイルとOGP画像
//   updated: 2026-10-20           任意。更新日
//   draft: true                   true の間は公開されない
//   ---
// 「_」で始まるファイルと README.md は記事として扱いません。
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { toSlug } from './util.mjs';

/** ファイルの内容を { data, body } に分ける。フロントマターが無ければ data は空 */
export function parseFrontMatter(text) {
  const src = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const m = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(src);
  if (!m) return { data: {}, body: src, error: 'ファイルの先頭に --- で囲んだ設定（title, date など）がありません' };
  let data;
  try {
    data = parseYaml(m[1]) ?? {};
  } catch (e) {
    return { data: {}, body: src.slice(m[0].length), error: `フロントマターを読めません（${e.message.split('\n')[0]}）` };
  }
  if (typeof data !== 'object' || Array.isArray(data)) return { data: {}, body: src.slice(m[0].length), error: 'フロントマターの形式が不正です' };
  return { data, body: src.slice(m[0].length) };
}

/** 日付のみ（YYYY-MM-DD）は日本時間の0時として扱う。時刻付きでタイムゾーンが無い場合も日本時間 */
export function parseDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const s = String(value ?? '').trim();
  if (!s) return null;
  let iso = s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) iso = `${s}T00:00:00+09:00`;
  else if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(s)) iso = `${s.replace(' ', 'T')}+09:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const str = (v) => (v === undefined || v === null ? '' : String(v).trim());
const list = (v) => (Array.isArray(v) ? v : v ? String(v).split(/[,、]/) : []).map((x) => str(x)).filter(Boolean);

/** 記事ファイル1件 → 記事メタ。公開対象でなければ { skip: '理由' } を返す */
export function fileToMeta({ file, text }, { now = new Date() } = {}) {
  const { data, body, error } = parseFrontMatter(text);
  if (error) return { skip: `${file}: ${error}`, problem: true };
  const title = str(data.title);
  if (!title) return { skip: `${file}: title（記事タイトル）が空です`, problem: true };
  if (data.draft === true || /^(draft|下書き)$/i.test(str(data.status))) return { skip: `「${title}」: 下書き（draft: true）` };

  if (data.date === undefined || data.date === null || data.date === '') return { skip: `「${title}」(${file}): date（公開日）が未入力です`, problem: true };
  const published = parseDate(data.date);
  if (!published) return { skip: `「${title}」(${file}): date「${data.date}」を日付として読めません（例 2026-10-15）`, problem: true };
  if (published > now) return { skip: `「${title}」: 公開日（${str(data.date)}）がまだ先です（予約公開）` };

  const modified = parseDate(data.updated) || published;
  const base = path.basename(file, path.extname(file));
  const rawSlug = str(data.slug) || base;
  const slug = toSlug(rawSlug);
  return {
    meta: {
      id: file,
      title,
      slug: slug || `post-${toSlug(base) || 'x'}`,
      slugWasInvalid: !slug,
      published,
      modified: modified < published ? published : modified,
      seoTitle: str(data.seo_title),
      description: str(data.summary ?? data.description),
      category: str(data.category),
      tags: list(data.tags),
      coverRef: str(data.cover),
      body,
    },
  };
}

/** 公開対象の記事メタを新しい順に並べ、スラッグの重複を解消する */
export function selectArticles(entries, { now = new Date(), warn = () => {} } = {}) {
  const metas = [];
  for (const entry of entries) {
    const r = fileToMeta(entry, { now });
    if (r.skip) {
      warn(r.problem ? `公開されません（要修正）: ${r.skip}` : `公開しません: ${r.skip}`);
      continue;
    }
    if (r.meta.slugWasInvalid) warn(`「${r.meta.title}」: スラッグに使える文字がないため ${r.meta.slug} にしました（半角英数とハイフンで slug を指定してください）`);
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

/** 記事ディレクトリの .md を読む */
export async function readArticleFiles(dir) {
  const out = [];
  for (const entry of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.md') continue;
    if (entry.name.startsWith('_') || entry.name.toLowerCase() === 'readme.md') continue;
    out.push({ file: entry.name, text: await fs.readFile(path.join(dir, entry.name), 'utf8') });
  }
  return out;
}
