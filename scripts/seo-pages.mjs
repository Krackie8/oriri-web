// After `vite build`: write one HTML file per public page with its own title,
// description, canonical, social tags, structured data and the page's main
// text baked in, so search engines and link previews see real content before
// any JavaScript runs. React replaces the baked text when the app starts.
// Data comes from src/app/wellness/seo.json (also used at runtime).
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const seo = JSON.parse(readFileSync(new URL('src/app/wellness/seo.json', root), 'utf8'));
const shell = readFileSync(new URL('dist/index.html', root), 'utf8');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = (p) => seo.site + p;
const fileFor = (path) => (path === '/' ? 'index.html' : `${path.slice(1).replace(/\//g, '__')}.html`);

const org = {
  '@type': 'Organization',
  '@id': `${seo.site}/#org`,
  name: 'ORIRI',
  url: `${seo.site}/`,
  logo: abs(seo.image),
  sameAs: ['https://www.instagram.com/ren_reset/', 'https://www.youtube.com/@Renreset', 'https://open.spotify.com/show/2dtKfW2MpiAAEbfM18m64r'],
};
const website = { '@type': 'WebSite', '@id': `${seo.site}/#site`, name: 'Wellness Bestie by ORIRI', url: `${seo.site}/`, publisher: { '@id': `${seo.site}/#org` } };
const extra = {
  '/podcast': {
    '@type': 'PodcastSeries',
    name: 'Tea for Two',
    url: abs('/podcast'),
    description: seo.pages['/podcast'].description,
    author: [{ '@type': 'Person', name: 'Renee' }, { '@type': 'Person', name: 'Amanda' }],
    webFeed: 'https://open.spotify.com/show/2dtKfW2MpiAAEbfM18m64r',
    publisher: { '@id': `${seo.site}/#org` },
  },
  '/': {
    '@type': 'WebApplication',
    name: 'Wellness Bestie',
    url: `${seo.site}/`,
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    description: seo.pages['/'].description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'AED', description: 'Free one-day plan' },
    publisher: { '@id': `${seo.site}/#org` },
  },
};

const NAV = [
  ['/', 'Home'],
  ['/plan/inputs', 'Plan my day free'],
  ['/podcast', 'Tea for Two podcast'],
  ['/bestie', 'Bestie community'],
  ['/membership', 'Membership'],
  ['/about', 'About ORIRI'],
];

function setTag(html, pattern, tag) {
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

for (const [path, page] of Object.entries(seo.pages)) {
  const url = abs(path === '/' ? '/' : path);
  let html = shell.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(page.title)}</title>`);
  html = setTag(html, /<meta name="description"[^>]*>/, `<meta name="description" content="${esc(page.description)}">`);
  html = setTag(html, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(page.title)}">`);
  html = setTag(html, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(page.description)}">`);
  html = setTag(html, /<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${abs(seo.image)}">`);
  html = setTag(html, /<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${abs(seo.image)}">`);
  html = setTag(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}">`);
  html = setTag(html, /<meta property="og:type"[^>]*>/, `<meta property="og:type" content="website">`);
  html = setTag(html, /<meta property="og:site_name"[^>]*>/, `<meta property="og:site_name" content="Wellness Bestie by ORIRI">`);
  html = setTag(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}">`);
  html = setTag(html, /<meta name="robots"[^>]*>/, `<meta name="robots" content="${page.index ? 'index, follow' : 'noindex, follow'}">`);
  const graph = [org, website, ...(extra[path] ? [extra[path]] : [])];
  html = html.replace('</head>', `    <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>\n  </head>`);

  const body =
    `<main style="max-width:640px;margin:0 auto;padding:96px 24px 48px;font-family:system-ui,sans-serif;color:#2B2522;background:#FAF8F5;line-height:1.6">` +
    `<p style="letter-spacing:.18em;text-transform:uppercase;font-size:13px;color:#8A7B70">Wellness Bestie by ORIRI</p>` +
    `<h1 style="font-weight:500;font-size:32px;line-height:1.15">${esc(page.h1)}</h1>` +
    page.text.map((t) => `<p>${esc(t)}</p>`).join('') +
    `<nav aria-label="Site"><ul style="padding-left:18px">${NAV.map(([href, label]) => `<li><a href="${href}" style="color:#7A6A5E">${esc(label)}</a></li>`).join('')}</ul></nav>` +
    `</main>`;
  html = html.replace(/<div id="root"><\/div>/, `<div id="root">${body}</div>`);
  writeFileSync(new URL(`dist/${fileFor(path)}`, root), html);
}

// sitemap.xml: every indexable page
const today = new Date().toISOString().slice(0, 10);
const urls = Object.entries(seo.pages)
  .filter(([, p]) => p.index)
  .map(([path]) => `  <url><loc>${abs(path === '/' ? '/' : path)}</loc><lastmod>${today}</lastmod></url>`)
  .join('\n');
writeFileSync(new URL('dist/sitemap.xml', root), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
console.log(`SEO: wrote ${Object.keys(seo.pages).length} pages and sitemap.xml`);
