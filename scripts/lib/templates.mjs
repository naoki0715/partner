// ブログのHTMLテンプレート（一覧・記事）。LPと同じロゴ・色・フォント・フッターを使う。
import { esc, jaDate, jsonForScript, truncate, ymdJst } from './util.mjs';
import { gaTag, JUICER_TAG } from './tracking.mjs';

export const SITE_NAME = 'CAREECON+ パートナープログラム';
const ORG = { '@type': 'Organization', name: 'BRANU, Inc.', url: 'https://branu.jp/' };
// 独自ドメイン（SITE_URL）が未設定のときの、画像URL用の仮の基準URL（og:image は絶対URLが必要なため）
export const FALLBACK_BASE = 'https://naoki0715.github.io/partner';

/** 絶対URL（SITE_URL が無ければ空） */
export function absUrl(site, rel) {
  return site.siteUrl ? `${site.siteUrl}/${rel}` : '';
}
/** OGP画像などに使う絶対URL（SITE_URL が無ければ仮の基準URL） */
export function imageUrl(site, rel) {
  return `${site.siteUrl || FALLBACK_BASE}/${rel}`;
}

function layout({ site, rootRel, title, description, canonicalRel, ogImage, ogType = 'website', jsonld = [], noindex = false, body, bodyClass = '' }) {
  const canonical = canonicalRel !== undefined ? absUrl(site, canonicalRel) : '';
  const ld = jsonld.length ? `<script type="application/ld+json">\n${jsonForScript(jsonld.length === 1 ? jsonld[0] : { '@context': 'https://schema.org', '@graph': jsonld.map((j) => { const { '@context': _c, ...rest } = j; return rest; }) })}\n</script>` : '';
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0d39e0">
${noindex ? '<meta name="robots" content="noindex,follow">\n' : ''}${canonical ? `<link rel="canonical" href="${esc(canonical)}">\n<link rel="alternate" type="application/rss+xml" title="${esc(SITE_NAME)} ブログ" href="${esc(absUrl(site, 'feed.xml'))}">\n` : ''}<link rel="icon" href="${rootRel}favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="${rootRel}favicon-32.png">
<link rel="apple-touch-icon" href="${rootRel}apple-touch-icon.png">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:locale" content="ja_JP">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">\n` : ''}<meta property="og:image" content="${esc(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(ogImage)}">
${ld}
<link rel="stylesheet" href="${rootRel}colors.css">
<link rel="stylesheet" href="${rootRel}typography.css">
<link rel="stylesheet" href="${rootRel}spacing.css">
<link rel="stylesheet" href="${rootRel}blog.css">
${JUICER_TAG}
${gaTag(site.gaId)}
</head>
<body class="${bodyClass}">
<header class="site-header">
  <div class="site-header-inner">
    <a class="brand" href="${rootRel}">
      <img src="${rootRel}careeconplus_logo.png" alt="CAREECON+" width="218" height="40">
      <span class="brand-sub">パートナープログラム</span>
    </a>
    <nav class="site-nav" aria-label="メインメニュー">
      <a class="nav-link" href="${rootRel}blog/">ブログ</a>
      <a class="btn btn-primary" href="${rootRel}#download-cta">パートナー資料請求</a>
    </nav>
  </div>
</header>
${body}
<footer class="site-footer">
  <img src="${rootRel}careeconplus_logo.png" alt="CAREECON+" width="164" height="30" loading="lazy">
  <nav class="footer-nav" aria-label="フッター">
    <a href="https://branu.jp/">運営会社</a>
    <a href="https://careecon-plus.com/privacy">プライバシーポリシー</a>
    <a href="https://careecon-plus.com/terms">利用規約</a>
    <a href="https://careecon-plus.com/contact">お問い合わせ</a>
  </nav>
  <p class="copyright">© ${new Date().getUTCFullYear()} BRANU, Inc. All rights reserved.</p>
</footer>
</body>
</html>
`;
}

function ctaBand(rootRel) {
  return `<section class="cta-band" aria-labelledby="cta-title">
  <p class="cta-title" id="cta-title">CAREECON+ の販売パートナーを募集しています</p>
  <p class="cta-lead">建設業界の知識がなくても大丈夫。本部が営業から導入まで伴走します。</p>
  <a class="btn btn-primary btn-lg" href="${rootRel}#download-cta">パートナー資料を請求する</a>
</section>`;
}

function tagList(meta) {
  const items = [...(meta.category ? [`<li class="chip chip-cat">${esc(meta.category)}</li>`] : []), ...meta.tags.filter((t) => t !== meta.category).map((t) => `<li class="chip">${esc(t)}</li>`)];
  return items.length ? `<ul class="chips">${items.join('')}</ul>` : '';
}

function card(meta, rootRel) {
  const href = `${rootRel}blog/${meta.slug}/`;
  const thumb = meta.coverFile ? `<a class="card-thumb" href="${href}" tabindex="-1" aria-hidden="true"><img src="${rootRel}blog/${meta.slug}/${esc(meta.coverFile)}" alt="" loading="lazy" decoding="async"${meta.coverW && meta.coverH ? ` width="${meta.coverW}" height="${meta.coverH}"` : ''}></a>` : '';
  return `<li class="card">
  ${thumb}
  <div class="card-body">
    <p class="meta"><time datetime="${ymdJst(meta.published)}">${jaDate(meta.published)}</time></p>
    <h2 class="card-title"><a href="${href}">${esc(meta.title)}</a></h2>
    <p class="card-desc">${esc(meta.description)}</p>
    ${tagList(meta)}
  </div>
</li>`;
}

export function blogIndexPage({ site, articles }) {
  const rootRel = '../';
  const title = `ブログ｜${SITE_NAME}`;
  const description = '建設DX・現場管理・パートナー営業に役立つ情報をお届けします。CAREECON+ パートナープログラムのブログです。';
  const list = articles.length
    ? `<ul class="cards">\n${articles.map((a) => card(a, rootRel)).join('\n')}\n</ul>`
    : '<p class="empty">記事を準備中です。公開までしばらくお待ちください。</p>';
  const body = `<main class="container">
  <nav class="breadcrumb" aria-label="パンくずリスト"><a href="${rootRel}">ホーム</a><span aria-hidden="true">›</span><span aria-current="page">ブログ</span></nav>
  <h1 class="page-title">ブログ</h1>
  <p class="page-lead">建設DX・現場管理・パートナー営業に役立つ情報をお届けします。</p>
  ${list}
</main>
${ctaBand(rootRel)}`;
  const jsonld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: title,
      description,
      inLanguage: 'ja',
      publisher: ORG,
      ...(site.siteUrl ? { url: absUrl(site, 'blog/') } : {}),
      blogPost: articles.slice(0, 20).map((a) => ({
        '@type': 'BlogPosting',
        headline: a.title,
        datePublished: a.published.toISOString(),
        ...(site.siteUrl ? { url: absUrl(site, `blog/${a.slug}/`) } : {}),
      })),
    },
  ];
  return layout({ site, rootRel, title, description, canonicalRel: 'blog/', ogImage: imageUrl(site, 'og-image.png'), jsonld, noindex: articles.length === 0, body, bodyClass: 'page-blog' });
}

export function articlePage({ site, article, html, headings, related }) {
  const rootRel = '../../';
  const title = article.seoTitle || `${article.title}｜${SITE_NAME}`;
  const description = truncate(article.description || article.fallbackDescription || article.title, 120);
  const rel = `blog/${article.slug}/`;
  const ogImage = article.coverFile ? imageUrl(site, `${rel}${article.coverFile}`) : imageUrl(site, 'og-image.png');

  const toc = headings.filter((h) => h.level === 2);
  const tocHtml = toc.length >= 3
    ? `<nav class="toc" aria-label="目次"><p class="toc-title">目次</p><ol>${toc.map((h) => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`).join('')}</ol></nav>`
    : '';
  const cover = article.coverFile
    ? `<figure class="cover"><img src="${esc(article.coverFile)}" alt=""${article.coverW && article.coverH ? ` width="${article.coverW}" height="${article.coverH}"` : ''} decoding="async" fetchpriority="high"></figure>`
    : '';
  const relatedHtml = related.length
    ? `<section class="related" aria-labelledby="related-title"><h2 id="related-title">新着記事</h2><ul class="cards">\n${related.map((a) => card(a, rootRel)).join('\n')}\n</ul></section>`
    : '';

  const body = `<main class="container">
  <nav class="breadcrumb" aria-label="パンくずリスト"><a href="${rootRel}">ホーム</a><span aria-hidden="true">›</span><a href="../">ブログ</a><span aria-hidden="true">›</span><span aria-current="page">${esc(truncate(article.title, 40))}</span></nav>
  <article class="article">
    <header class="article-header">
      <p class="meta"><time datetime="${ymdJst(article.published)}">${jaDate(article.published)}</time>${ymdJst(article.modified) !== ymdJst(article.published) ? `<span class="meta-sep">・</span>更新 <time datetime="${ymdJst(article.modified)}">${jaDate(article.modified)}</time>` : ''}</p>
      <h1>${esc(article.title)}</h1>
      ${tagList(article)}
    </header>
    ${cover}
    ${tocHtml}
    <div class="prose">
${html}
    </div>
  </article>
  ${relatedHtml}
</main>
${ctaBand(rootRel)}`;

  const posting = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description,
    inLanguage: 'ja',
    datePublished: article.published.toISOString(),
    dateModified: article.modified.toISOString(),
    image: [ogImage],
    author: ORG,
    publisher: ORG,
    ...(article.tags.length ? { keywords: article.tags.join(', ') } : {}),
    ...(article.category ? { articleSection: article.category } : {}),
    ...(site.siteUrl ? { mainEntityOfPage: { '@type': 'WebPage', '@id': absUrl(site, rel) } } : {}),
  };
  const crumbs = site.siteUrl
    ? [{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ホーム', item: `${site.siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'ブログ', item: absUrl(site, 'blog/') },
          { '@type': 'ListItem', position: 3, name: article.title, item: absUrl(site, rel) },
        ],
      }]
    : [];
  return layout({ site, rootRel, title, description, canonicalRel: rel, ogImage, ogType: 'article', jsonld: [posting, ...crumbs], body, bodyClass: 'page-article' });
}
