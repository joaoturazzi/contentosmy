// W4 Preview Builder — generates standalone HTML from LLM output
// Creates blob URLs for instant iframe preview (no DB dependency)

export function cleanCode(raw) {
  let code = raw || '';
  // Remove markdown code blocks
  const blockMatch = code.match(/```(?:tsx?|jsx?|html|javascript)?\s*\n([\s\S]*?)```/);
  if (blockMatch) code = blockMatch[1];
  // Remove stray backticks at start/end
  code = code.replace(/^```\w*\s*\n?/, '').replace(/\n?```\s*$/, '');
  // Remove import statements
  code = code.replace(/import\s+.*?from\s+['"].*?['"];?\s*\n?/g, '');
  // Remove export default
  code = code.replace(/export\s+default\s+/g, 'const __Export__ = ');
  // Remove "use client" directive
  code = code.replace(/['"]use client['"];?\s*\n?/g, '');
  return code.trim();
}

export function buildPreviewHTML(rawCode, title) {
  const code = cleanCode(rawCode);
  const isReact = code.includes('useState') || code.includes('function App') || code.includes('const App') || code.includes('className=');

  if (isReact) {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Preview'}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone@7/babel.min.js"><\/script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Cabinet+Grotesk:wght@400;500;700;800;900&family=Satoshi:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  </style>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Outfit', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
            display: ['Cabinet Grotesk', 'Outfit', 'system-ui', 'sans-serif'],
          }
        }
      }
    }
  <\/script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-type="module">
    const { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } = React;

    ${code}

    // Find and render the main component
    const Root = typeof App !== 'undefined' ? App
      : typeof __Export__ !== 'undefined' ? __Export__
      : typeof Page !== 'undefined' ? Page
      : typeof Home !== 'undefined' ? Home
      : typeof Main !== 'undefined' ? Main
      : () => React.createElement('div', {style:{padding:'40px',textAlign:'center',color:'#888'}}, 'No App component found in generated code');

    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Root));
  <\/script>
</body>
</html>`;
  }

  // Plain HTML
  if (code.includes('<html') || code.includes('<!DOCTYPE')) {
    return code;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Preview'}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>body { font-family: 'Outfit', system-ui, sans-serif; }</style>
</head>
<body>${code}</body>
</html>`;
}

export function createBlobUrl(html) {
  const blob = new Blob([html], { type: 'text/html' });
  return URL.createObjectURL(blob);
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
