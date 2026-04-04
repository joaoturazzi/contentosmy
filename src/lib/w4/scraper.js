// ─────────────────────────────────────────────────────
// WS4 — SCRAPER ROBUSTO
// 3 fontes em paralelo: Firecrawl + Jina AI + Raw HTML
// ─────────────────────────────────────────────────────

function normalizeURL(input) {
  let url = input.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
  try { new URL(url); return url; } catch { throw new Error('URL invalida: ' + url); }
}

async function fetchFirecrawl(url, apiKey) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const [scrapeRes, mapRes] = await Promise.all([
      fetch('https://api.firecrawl.dev/v1/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ url, formats: ['markdown', 'html'], includeTags: ['img', 'meta', 'title', 'h1', 'h2', 'h3', 'p', 'a', 'nav', 'header', 'footer', 'style', 'link'], excludeTags: ['script', 'noscript', 'iframe'], waitFor: 2000 }), signal: ctrl.signal }),
      fetch('https://api.firecrawl.dev/v1/map', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ url, limit: 20 }), signal: ctrl.signal }),
    ]);
    const scrape = await scrapeRes.json();
    const map = await mapRes.json();
    if (!scrape.success && !scrape.data?.markdown) {
      const err = scrape.error || '';
      if (String(err).includes('401') || scrapeRes.status === 401) throw new Error('Firecrawl: API key invalida');
      if (String(err).includes('402') || scrapeRes.status === 402) throw new Error('Firecrawl: creditos esgotados');
      throw new Error('Firecrawl: ' + (typeof err === 'string' ? err : JSON.stringify(err)));
    }
    return { scrape, map };
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Firecrawl timeout 30s');
    throw e;
  } finally { clearTimeout(timer); }
}

async function fetchJina(url) {
  try {
    const r = await fetch('https://r.jina.ai/' + url, { headers: { 'Accept': 'text/markdown', 'X-With-Images-Summary': 'true', 'X-With-Links-Summary': 'true', 'X-Timeout': '20' } });
    return r.ok ? await r.text() : '';
  } catch { return ''; }
}

async function fetchRawHTML(url) {
  const proxies = [`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`];
  for (const proxy of proxies) {
    try { const r = await fetch(proxy, { signal: AbortSignal.timeout(10000) }); if (r.ok) return await r.text(); } catch { continue; }
  }
  return '';
}

function parseAllSources(fcData, jinaMarkdown, rawHTML, originalUrl) {
  const markdown = fcData.scrape?.data?.markdown || jinaMarkdown || '';
  const fcHTML = fcData.scrape?.data?.html || '';
  const html = rawHTML || fcHTML;
  const metadata = fcData.scrape?.data?.metadata || {};
  const baseUrl = metadata.url || originalUrl;

  function toAbs(src) {
    if (!src || src.startsWith('data:')) return null;
    if (src.startsWith('http')) return src;
    try { return new URL(src, baseUrl).href; } catch { return null; }
  }

  // ═══ LOGO (8 strategies, smart filtering) ═══
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1] || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
  const appleIcon = html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)/i)?.[1];
  const faviconSvg = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']*\.(?:svg|png)(?:\?[^"']*)?)/i)?.[1];

  // Strategy: Jina first image is almost always the real site logo (in the header)
  const jinaFirstImg = jinaMarkdown?.match(/\[!\[.*?\]\((https?:[^\s)]+\.(?:svg|png|webp|jpg))\)/)?.[1]
    || jinaMarkdown?.match(/!\[.*?\]\((https?:[^\s)]+\.(?:svg|png|webp|jpg)[^\s)]*)\)/)?.[1];

  // Filter partner/client logos from img[src*=logo]
  const isPartnerLogo = (src) => /marcas|brands|partners|clients|clientes|parceiros|integra|allied/i.test(src || '');
  const allLogoImgs = [...html.matchAll(/<img[^>]+src=["']([^"']*logo[^"']*\.(png|svg|jpg|webp)[^"']*)/gi)].map(m => m[1]);
  const logoInSrc = allLogoImgs.find(src => !isPartnerLogo(src)) || null;
  const logoInAlt = html.match(/<img[^>]+alt=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)/i)?.[1];
  const headerImg = html.match(/<(?:header|nav)[^>]*>[\s\S]{0,3000}?<img[^>]+src=["']([^"']+)/i)?.[1];

  // Priority: Jina first (real header logo) > og:image > apple-icon > filtered logo img > header img > favicon
  const logoUrl = (jinaFirstImg && !isPartnerLogo(jinaFirstImg) ? jinaFirstImg : null)
    || toAbs(ogImage) || toAbs(appleIcon) || toAbs(logoInSrc) || toAbs(logoInAlt && !isPartnerLogo(logoInAlt) ? logoInAlt : null) || toAbs(headerImg) || toAbs(faviconSvg);

  // ═══ COLORS (7 strategies — scan ALL HTML sources) ═══
  const colorSet = new Set();
  const allHTML = fcHTML + '\n' + (rawHTML || ''); // Use BOTH sources for max coverage

  // 1. theme-color meta
  const themeColor = allHTML.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)/i)?.[1];
  if (themeColor && themeColor.startsWith('#')) colorSet.add(themeColor);

  // 2. CSS custom properties
  for (const m of allHTML.matchAll(/--[a-z-]*(?:color|primary|secondary|accent|brand|main)[^:]*:\s*(#[0-9a-fA-F]{3,6})/gi)) colorSet.add(m[1]);

  // 3. Colors in <style> blocks
  for (const block of (allHTML.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [])) {
    for (const c of (block.match(/#[0-9a-fA-F]{6}\b/g) || [])) colorSet.add(c);
  }

  // 4. Colors in inline styles
  for (const m of allHTML.matchAll(/style=["'][^"']*["']/gi)) {
    for (const c of (m[0].match(/#[0-9a-fA-F]{6}\b/g) || [])) colorSet.add(c);
  }

  // 5. Colors from background-color and color properties in HTML
  for (const m of allHTML.matchAll(/(?:background-color|background|color|border-color)\s*:\s*(#[0-9a-fA-F]{3,6})/gi)) colorSet.add(m[1]);

  // 6. Colors from Firecrawl HTML classes (often has compiled CSS)
  for (const c of (fcHTML.match(/#[0-9a-fA-F]{6}\b/g) || []).slice(0, 200)) colorSet.add(c);

  // 7. Colors from linked stylesheets referenced in HTML (extract from href)
  // Can't fetch external CSS, but if Firecrawl rendered the page, colors may be in computed styles

  const noise = new Set(['ffffff', '000000', 'f5f5f5', 'eeeeee', 'e5e5e5', 'cccccc', '333333', '666666', '999999', '1a1a1a', 'fafafa', 'f8f8f8', '111111', '222222', 'aaaaaa', 'bbbbbb', 'dddddd', 'f0f0f0', 'e0e0e0', 'd0d0d0', 'c0c0c0', 'b0b0b0', 'a0a0a0']);
  const colors = [...colorSet].filter(c => {
    const h = c.toLowerCase().replace('#', '');
    const f = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
    return !noise.has(f) && f.length === 6;
  }).slice(0, 12);

  // ═══ IMAGES (3 strategies + smart filtering) ═══
  const imgSet = new Set();
  if (ogImage) { const a = toAbs(ogImage); if (a) imgSet.add(a); }
  // Firecrawl HTML images
  for (const m of fcHTML.matchAll(/<img[^>]+src=["']([^"']+)/gi)) {
    const a = toAbs(m[1]);
    if (a && /\.(jpg|jpeg|png|webp|svg)(\?|$)/i.test(a)) imgSet.add(a);
  }
  // Jina images (often has more than Firecrawl)
  for (const m of (jinaMarkdown?.matchAll(/\(?(https?:[^\s)"]+\.(?:jpg|jpeg|png|webp|svg)(?:\?[^\s)"]*)?)/g) || [])) {
    const u = m[1].replace(/\)$/, '');
    if (u.startsWith('http') && u.length < 500) imgSet.add(u);
  }
  // Filter out tiny icons, tracking pixels, and navigation SVGs
  const isUsefulImage = (url) => {
    const lower = url.toLowerCase();
    if (/1x1|pixel|tracking|favicon|\.ico|wpp\.|whatsapp/i.test(lower)) return false;
    // Filter tiny nav/UI icons (menu, close, arrow, chevron)
    if (/icons?\/(menu|close|arrow|chevron|check|play|pause|search)/i.test(lower)) return false;
    // Keep logos (they're useful), product images, and hero images
    return true;
  };
  const images = [...imgSet].filter(Boolean).filter(isUsefulImage).slice(0, 25);

  // ═══ HEADINGS (use both Firecrawl + Jina markdown) ═══
  const allMarkdown = markdown + '\n' + (jinaMarkdown || '');
  const h1Set = new Set(); for (const m of allMarkdown.matchAll(/(?:^|\n)#\s+(.+)/g)) h1Set.add(m[1].replace(/[[\]]/g, '').trim());
  const h2Set = new Set(); for (const m of allMarkdown.matchAll(/(?:^|\n)##\s+(.+)/g)) h2Set.add(m[1].replace(/[[\]]/g, '').trim());
  const h3Set = new Set(); for (const m of allMarkdown.matchAll(/(?:^|\n)###\s+(.+)/g)) h3Set.add(m[1].replace(/[[\]]/g, '').trim());
  // Fallback: extract bold text as pseudo-headings
  if (h1Set.size === 0) { for (const m of allMarkdown.matchAll(/\*\*([^*]{5,80})\*\*/g)) { h1Set.add(m[1].trim()); if (h1Set.size >= 3) break; } }
  // Also try HTML h1 tags directly from Firecrawl
  if (h1Set.size === 0) { for (const m of fcHTML.matchAll(/<h1[^>]*>([^<]+)/gi)) h1Set.add(m[1].trim()); }

  // ═══ CONTACT ═══
  const phones = [...new Set(markdown.match(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[\s\-]?\d{4}/g) || [])].filter(p => p.replace(/\D/g, '').length >= 8).slice(0, 3);
  const emails = [...new Set(markdown.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [])].filter(e => !e.includes('example') && !e.includes('sentry') && !e.includes('wixpress')).slice(0, 3);

  // ═══ FONTS ═══
  const fonts = [...new Set([...html.matchAll(/font-family\s*:\s*["']?([^;,"'}\n]+)/gi)].map(m => m[1].split(',')[0].replace(/['"]/g, '').trim()))].filter(f => f.length > 1 && f.length < 40 && !/inherit|initial|system|sans-serif|serif|monospace/i.test(f)).slice(0, 5);

  const businessName = metadata.title?.split(/[|\-–—]/)[0]?.trim() || [...h1Set][0] || '';

  return {
    metadata: { title: metadata.title || [...h1Set][0] || '', description: metadata.description || '', url: baseUrl, language: metadata.language || 'pt' },
    markdown: markdown.slice(0, 15000), businessName,
    logoUrl, colors, images, fonts,
    contact: { phones, emails },
    headings: { h1: [...h1Set].slice(0, 5), h2: [...h2Set].slice(0, 12), h3: [...h3Set].slice(0, 20) },
    subpages: fcData.map?.links?.slice(0, 20) || fcData.map?.data?.links?.slice(0, 20) || [],
    _sources: {
      firecrawl_ok: !!fcData.scrape?.data?.markdown,
      jina_ok: (jinaMarkdown || '').length > 100,
      raw_html_ok: (rawHTML || '').length > 500,
      logo_strategy: (jinaFirstImg && !isPartnerLogo(jinaFirstImg)) ? 'jina-first' : ogImage ? 'og:image' : appleIcon ? 'apple-icon' : logoInSrc ? 'img-src-filtered' : headerImg ? 'header' : faviconSvg ? 'favicon' : 'not found',
      colors_found: colors.length,
      images_found: images.length,
    },
  };
}

export async function runScrape(rawUrl, firecrawlKey, onProgress) {
  const url = normalizeURL(rawUrl);
  onProgress?.('Scraping 3 fontes em paralelo...');

  const [fcResult, jinaResult, rawResult] = await Promise.allSettled([
    fetchFirecrawl(url, firecrawlKey),
    fetchJina(url),
    fetchRawHTML(url),
  ]);

  if (fcResult.status === 'rejected') throw new Error(fcResult.reason?.message || 'Firecrawl falhou');

  const parsed = parseAllSources(
    fcResult.value,
    jinaResult.status === 'fulfilled' ? jinaResult.value : '',
    rawResult.status === 'fulfilled' ? rawResult.value : '',
    url,
  );

  if (!parsed.markdown || parsed.markdown.length < 50) throw new Error('Conteudo insuficiente extraido.');
  console.log('[scraper]', parsed._sources);
  onProgress?.(`Scraping OK — logo: ${parsed._sources.logo_strategy}, cores: ${parsed._sources.colors_found}, imgs: ${parsed._sources.images_found}`);
  return parsed;
}
