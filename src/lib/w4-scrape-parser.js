// W4 Scrape Parser — multi-source extraction (Firecrawl + Jina + raw HTML)

export async function fetchJina(url) {
  try {
    const r = await fetch(`https://r.jina.ai/${url}`, {
      headers: { 'Accept': 'text/markdown', 'X-With-Images-Summary': 'true', 'X-With-Links-Summary': 'true' },
    });
    if (!r.ok) return '';
    return await r.text();
  } catch { return ''; }
}

export async function fetchRawHTML(url) {
  try {
    const r = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
    if (!r.ok) return '';
    return await r.text();
  } catch { return ''; }
}

export function parseScrapedData(scrapeData, mapData, inputUrl, jinaMarkdown, rawHTML) {
  const fcHtml = scrapeData?.data?.html || '';
  const fcMarkdown = scrapeData?.data?.markdown || '';
  const metadata = scrapeData?.data?.metadata || {};
  const html = rawHTML || fcHtml;
  const markdown = fcMarkdown || jinaMarkdown || '';
  const baseUrl = metadata.url || inputUrl;

  function resolveUrl(src) {
    if (!src || src.startsWith('data:')) return null;
    if (src.startsWith('http')) return src;
    try { return new URL(src, baseUrl).href; } catch { return null; }
  }

  // ═══ LOGO (5 strategies) ═══
  let logoUrl = null;
  // 1. og:image
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
  // 2. apple-touch-icon
  const appleIcon = html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)/i)?.[1];
  // 3. favicon SVG/PNG
  const favicon = html.match(/<link[^>]+rel=["'][^"']*(?:icon|shortcut)[^"']*["'][^>]+href=["']([^"']+\.(?:svg|png))/i)?.[1];
  // 4. img with "logo" in src or alt
  const logoMatch = html.match(/<img[^>]+src=["']([^"']*logo[^"']*)/i)?.[1]
    || html.match(/<img[^>]+alt=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)/i)?.[1];
  // 5. first img in header/nav
  const headerImg = html.match(/<(?:header|nav)[^>]*>[\s\S]{0,2000}?<img[^>]+src=["']([^"']+)/i)?.[1];

  logoUrl = resolveUrl(ogImage) || resolveUrl(appleIcon) || resolveUrl(favicon) || resolveUrl(logoMatch) || resolveUrl(headerImg);

  // ═══ COLORS (4 strategies) ═══
  const colorSet = new Set();
  // 1. CSS variables
  const cssVarMatches = html.matchAll(/--[a-z-]*(?:color|primary|secondary|accent|brand)[^:]*:\s*(#[0-9a-fA-F]{3,6})/gi);
  for (const m of cssVarMatches) colorSet.add(m[1]);
  // 2. meta theme-color
  const themeColor = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)/i)?.[1];
  if (themeColor && themeColor.startsWith('#')) colorSet.add(themeColor);
  // 3. style blocks
  const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  for (const block of styleBlocks) {
    const hexes = block.match(/#[0-9a-fA-F]{3,6}\b/g) || [];
    hexes.forEach(c => colorSet.add(c));
  }
  // 4. inline styles (background-color, color)
  const inlineStyles = html.match(/style=["'][^"']*(?:background|color)[^"']*#([0-9a-fA-F]{3,6})/gi) || [];
  for (const s of inlineStyles) { const m = s.match(/#[0-9a-fA-F]{3,6}/g); if (m) m.forEach(c => colorSet.add(c)); }
  // Fallback: any hex in fcHtml
  if (colorSet.size === 0) {
    const anyHex = fcHtml.match(/#[0-9a-fA-F]{3,6}\b/g) || [];
    anyHex.forEach(c => colorSet.add(c));
  }

  const noise = new Set(['#fff','#ffffff','#000','#000000','#333','#333333','#666','#666666','#999','#999999','#ccc','#cccccc','#eee','#eeeeee','#f5f5f5','#fafafa','#e5e5e5','#d4d4d4']);
  const colors = [...colorSet].filter(c => !noise.has(c.toLowerCase())).slice(0, 12);

  // ═══ IMAGES (3 strategies) ═══
  const imgSet = new Set();
  if (ogImage) { const r = resolveUrl(ogImage); if (r) imgSet.add(r); }
  // HTML img tags
  const imgTags = html.matchAll(/<img[^>]+src=["']([^"']+\.(jpg|jpeg|png|webp|svg|gif)(?:\?[^"']*)?)/gi);
  for (const m of imgTags) { const r = resolveUrl(m[1]); if (r && r.length < 500) imgSet.add(r); }
  // Jina markdown images
  if (jinaMarkdown) {
    const jinaImgs = jinaMarkdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g);
    for (const m of jinaImgs) { if (m[1]?.startsWith('http')) imgSet.add(m[1]); }
  }
  const images = [...imgSet].filter(i => !i.includes('1x1') && !i.includes('pixel') && !i.includes('tracking') && !i.includes('favicon')).slice(0, 20);

  // ═══ FONTS ═══
  const fontSet = new Set();
  const fontMatches = html.matchAll(/font-family\s*:\s*["']?([^;,"']+)/gi);
  for (const m of fontMatches) {
    const f = m[1].trim().split(',')[0].replace(/['"]/g, '').trim();
    if (f && f.length > 1 && !/inherit|initial|system|sans-serif|serif|monospace|cursive/i.test(f)) fontSet.add(f);
  }
  const fonts = [...fontSet].slice(0, 8);

  // ═══ CONTACT ═══
  const phones = [...new Set(markdown.match(/(?:\+?\d[\d\s\(\)\-\.]{7,}\d)/g) || [])].filter(p => p.replace(/\D/g, '').length >= 8).slice(0, 5);
  const emails = [...new Set(markdown.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [])].filter(e => !e.includes('example') && !e.includes('sentry') && !e.includes('wixpress')).slice(0, 5);

  // ═══ HEADINGS (flexible matching) ═══
  const h1Set = new Set();
  for (const m of markdown.matchAll(/(?:^|\n)#\s+(.+)/g)) h1Set.add(m[1].trim());
  const h2Set = new Set();
  for (const m of markdown.matchAll(/(?:^|\n)##\s+(.+)/g)) h2Set.add(m[1].trim());
  const h3Set = new Set();
  for (const m of markdown.matchAll(/(?:^|\n)###\s+(.+)/g)) h3Set.add(m[1].trim());
  // Fallback: bold text as pseudo-headings
  if (h1Set.size === 0) {
    for (const m of markdown.matchAll(/\*\*([^*]{5,60})\*\*/g)) { h1Set.add(m[1].trim()); if (h1Set.size >= 3) break; }
  }

  // ═══ SUBPAGES ═══
  const subpages = (mapData?.links || mapData?.data?.links || []).slice(0, 20);

  // ═══ BUSINESS NAME ═══
  const businessName = metadata.title?.split(/[|\-–—]/)[0]?.trim() || [...h1Set][0] || '';

  return {
    markdown: markdown.slice(0, 15000),
    htmlSnippet: html.slice(0, 5000),
    metadata: { title: metadata.title || [...h1Set][0] || '', description: metadata.description || '', url: baseUrl, language: metadata.language || 'pt' },
    businessName,
    colors,
    images,
    logoUrl,
    fonts,
    contact: { phones, emails },
    headings: { h1: [...h1Set].slice(0, 5), h2: [...h2Set].slice(0, 10), h3: [...h3Set].slice(0, 15) },
    subpages,
  };
}
