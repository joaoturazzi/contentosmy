// W4 Preview Builder — generates standalone HTML preview

export function cleanCode(raw) {
  let code = raw || '';
  // Remove markdown code blocks (```html, ```jsx, etc.)
  const blockMatch = code.match(/```(?:html|tsx?|jsx?|javascript)?\s*\n([\s\S]*?)```/);
  if (blockMatch) code = blockMatch[1];
  code = code.replace(/^```\w*\s*\n?/, '').replace(/\n?```\s*$/, '');
  return code.trim();
}

export function wrapHTML(code, title) {
  // If already a complete HTML document, return as-is
  if (code.includes('<!DOCTYPE') || code.includes('<html')) {
    return code;
  }

  // Wrap partial HTML in a full document
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Preview'}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script defer src="https://unpkg.com/alpinejs@3/dist/cdn.min.js"><\/script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Cabinet+Grotesk:wght@400;500;700;800;900&family=Satoshi:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .fade-in-delay-1 { animation-delay: 0.1s; opacity: 0; }
    .fade-in-delay-2 { animation-delay: 0.2s; opacity: 0; }
    .fade-in-delay-3 { animation-delay: 0.3s; opacity: 0; }
    .fade-in-delay-4 { animation-delay: 0.4s; opacity: 0; }
  </style>
  <script>
    tailwind.config = {
      theme: { extend: { fontFamily: { sans: ['Outfit','Plus Jakarta Sans','system-ui'], display: ['Cabinet Grotesk','Outfit','system-ui'] } } }
    }
  <\/script>
</head>
<body>
${code}
</body>
</html>`;
}

// Guaranteed scroll reveal + grain script (injected if missing from generated code)
const FALLBACK_MODULES = `
<script>
// Scroll reveal (fallback if not in generated code)
if (!document.querySelector('[data-reveal].visible')) {
  document.querySelectorAll('[data-reveal]').forEach(function(el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(28px)';
    el.style.transition = 'opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)';
    el.style.transitionDelay = 'calc(' + (el.style.getPropertyValue('--stagger') || '0') + ' * 120ms)';
  });
  var ro = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) { if (e.isIntersecting) { e.target.style.opacity='1'; e.target.style.transform='translateY(0)'; ro.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('[data-reveal]').forEach(function(el) { ro.observe(el); });
}
<\/script>`;

export function buildPreviewHTML(rawCode, title) {
  // If already complete HTML from pipeline, use as-is (don't clean)
  if (rawCode && (rawCode.trimStart().startsWith('<!DOCTYPE') || rawCode.trimStart().startsWith('<html'))) {
    let html = rawCode;
    // Safety: inject IntersectionObserver if missing
    if (!html.includes('IntersectionObserver') && html.includes('data-reveal')) {
      html = html.replace('</body>', FALLBACK_MODULES + '\n</body>');
    }
    return html;
  }
  // Fallback: clean and wrap partial code
  const code = cleanCode(rawCode);
  let html = wrapHTML(code, title);
  if (!html.includes('IntersectionObserver') && html.includes('data-reveal')) {
    html = html.replace('</body>', FALLBACK_MODULES + '\n</body>');
  }
  return html;
}

export function isCodeComplete(code) {
  const clean = cleanCode(code);
  // Check if the code seems complete (has closing tags, reasonable length)
  const hasStructure = clean.includes('</') || clean.includes('/>');
  const hasReasonableLength = clean.length > 500;
  const isNotTruncated = !clean.endsWith('/') && !clean.endsWith('"') && !clean.endsWith('=');
  return hasStructure && hasReasonableLength && isNotTruncated;
}

export function downloadHTML(html, filename) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'site.html';
  a.click();
  URL.revokeObjectURL(url);
}
