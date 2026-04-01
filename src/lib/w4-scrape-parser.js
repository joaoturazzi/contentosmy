// W4 Scrape Parser — extracts structured data from Firecrawl response

export function parseScrapedData(scrapeData, mapData, inputUrl) {
  const html = scrapeData?.data?.html || '';
  const markdown = scrapeData?.data?.markdown || '';
  const metadata = scrapeData?.data?.metadata || {};

  // 1. Colors from CSS (hex + rgb + rgba)
  const colorRegex = /#([0-9a-fA-F]{3,6})\b|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\([^)]+\)/g;
  const allColors = [...new Set((html.match(colorRegex) || []))];
  const meaningfulColors = allColors.filter(c => {
    const cl = c.toLowerCase();
    return cl !== '#fff' && cl !== '#ffffff' && cl !== '#000' && cl !== '#000000'
      && cl !== '#333' && cl !== '#666' && cl !== '#999' && cl !== '#ccc' && cl !== '#eee'
      && !cl.startsWith('rgba(0') && !cl.startsWith('rgba(255');
  }).slice(0, 12);

  // 2. Image URLs
  const imgRegex = /(?:src|href)=["']([^"']*\.(?:jpg|jpeg|png|webp|svg|gif)(?:\?[^"']*)?)/gi;
  const allImages = [];
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const src = imgMatch[1];
    if (!src.startsWith('data:') && src.length < 500) {
      try {
        const absolute = new URL(src, metadata.url || inputUrl).href;
        allImages.push(absolute);
      } catch { allImages.push(src); }
    }
  }
  const uniqueImages = [...new Set(allImages)].slice(0, 20);

  // 3. Logo detection
  const logoInName = uniqueImages.find(img =>
    /logo|brand|mark|icon/i.test(img) && !/favicon/i.test(img)
  );
  const logoNavRegex = /(?:header|nav)[^>]*>[\s\S]{0,500}?<img[^>]+src=["']([^"']+)["']/i;
  const logoFromNav = html.match(logoNavRegex)?.[1];
  let logoUrl = logoInName || logoFromNav || null;
  if (logoUrl && !logoUrl.startsWith('http')) {
    try { logoUrl = new URL(logoUrl, metadata.url || inputUrl).href; } catch {}
  }

  // 4. Fonts
  const fontRegex = /font-family\s*:\s*["']?([^;,"']+)/gi;
  const fonts = [];
  let fontMatch;
  while ((fontMatch = fontRegex.exec(html)) !== null) {
    const font = fontMatch[1].trim().split(',')[0].replace(/['"]/g, '').trim();
    if (font && font.length > 1 && !fonts.includes(font) && !/inherit|initial|system/i.test(font)) {
      fonts.push(font);
    }
  }

  // 5. Contact info
  const phoneRegex = /(?:\+?\d[\d\s\(\)\-\.]{7,}\d)/g;
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const phones = [...new Set(markdown.match(phoneRegex) || [])].filter(p => p.replace(/\D/g, '').length >= 8).slice(0, 5);
  const emails = [...new Set(markdown.match(emailRegex) || [])].filter(e =>
    !e.includes('example') && !e.includes('test') && !e.includes('sentry')
  ).slice(0, 5);

  // 6. Headings (flexible: with or without space after #)
  const h1s = [...markdown.matchAll(/^#{1}\s+(.+)$/gm), ...markdown.matchAll(/\n#{1}\s+(.+)/g)].map(m => m[1].trim()).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);
  const h2s = [...markdown.matchAll(/^#{2}\s+(.+)$/gm), ...markdown.matchAll(/\n#{2}\s+(.+)/g)].map(m => m[1].trim()).filter((v, i, a) => a.indexOf(v) === i).slice(0, 10);
  const h3s = [...markdown.matchAll(/^#{3}\s+(.+)$/gm), ...markdown.matchAll(/\n#{3}\s+(.+)/g)].map(m => m[1].trim()).filter((v, i, a) => a.indexOf(v) === i).slice(0, 15);
  // Fallback: if no h1 found, use bold text as pseudo-headings
  if (h1s.length === 0) {
    const bold = [...markdown.matchAll(/\*\*([^*]{5,60})\*\*/g)].map(m => m[1].trim());
    h1s.push(...bold.slice(0, 3));
  }

  // 7. Subpages
  const subpages = (mapData?.links || mapData?.data?.links || []).slice(0, 20);

  // 8. Business name from title/h1
  const businessName = metadata.title?.split(/[|\-–—]/)[0]?.trim() || h1s[0] || '';

  return {
    markdown: markdown.slice(0, 15000),
    htmlSnippet: html.slice(0, 5000),
    metadata: {
      title: metadata.title || h1s[0] || '',
      description: metadata.description || '',
      url: metadata.url || inputUrl,
      language: metadata.language || 'pt',
    },
    businessName,
    colors: meaningfulColors,
    images: uniqueImages,
    logoUrl,
    fonts: fonts.slice(0, 8),
    contact: { phones, emails },
    headings: { h1: h1s, h2: h2s, h3: h3s },
    subpages,
  };
}
