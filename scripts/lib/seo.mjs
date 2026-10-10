// sitemap.xml / feed.xml / robots.txt の生成。どれも絶対URLが必要なので、SITE_URL が設定されたときだけ作る。
import { ymdJst } from './util.mjs';

const xml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export function buildSitemap({ siteUrl, articles, buildDate = new Date() }) {
  const latest = articles.reduce((m, a) => (a.modified > m ? a.modified : m), new Date(0));
  const urls = [{ loc: `${siteUrl}/`, lastmod: ymdJst(buildDate) }];
  if (articles.length) {
    urls.push({ loc: `${siteUrl}/blog/`, lastmod: ymdJst(latest) });
    for (const a of articles) urls.push({ loc: `${siteUrl}/blog/${a.slug}/`, lastmod: ymdJst(a.modified) });
  }
  const items = urls.map((u) => `  <url>\n    <loc>${xml(u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

export function buildFeed({ siteUrl, articles, title, description, buildDate = new Date() }) {
  const items = articles
    .slice(0, 30)
    .map((a) => {
      const link = `${siteUrl}/blog/${a.slug}/`;
      return `    <item>\n      <title>${xml(a.title)}</title>\n      <link>${xml(link)}</link>\n      <guid isPermaLink="true">${xml(link)}</guid>\n      <pubDate>${a.published.toUTCString()}</pubDate>\n      <description>${xml(a.description || a.fallbackDescription || '')}</description>\n    </item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>${xml(title)}</title>\n    <link>${xml(`${siteUrl}/blog/`)}</link>\n    <description>${xml(description)}</description>\n    <language>ja</language>\n    <lastBuildDate>${buildDate.toUTCString()}</lastBuildDate>\n${items}\n  </channel>\n</rss>\n`;
}

export function buildRobots({ siteUrl }) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}
