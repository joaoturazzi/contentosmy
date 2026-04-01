import { NextResponse } from 'next/server';
import { getSQL } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Serves a generated site as a viewable HTML page (no auth — public preview)
export async function GET(request, { params }) {
  const { id } = await params;
  if (!id) return new NextResponse('Not found', { status: 404 });

  try {
    const sql = getSQL();
    const rows = await sql`SELECT content, metadata, title FROM w4_outputs WHERE id = ${id} LIMIT 1`;
    if (!rows.length) return new NextResponse('Preview not found', { status: 404 });

    const { content, title } = rows[0];
    if (!content) return new NextResponse('No content', { status: 404 });

    // Extract code from markdown code blocks if present
    let code = content;
    const codeBlockMatch = content.match(/```(?:tsx?|jsx?|html)?\s*\n([\s\S]*?)```/);
    if (codeBlockMatch) code = codeBlockMatch[1];

    // Determine if it's React/JSX or plain HTML
    const isReact = code.includes('import React') || code.includes('useState') || code.includes('export default') || code.includes('const App');

    let html;
    if (isReact) {
      // Wrap React code in a full HTML page with CDN dependencies
      html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Preview'} — Visual OS</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  </style>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Outfit', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
            display: ['Outfit', 'system-ui', 'sans-serif'],
          }
        }
      }
    }
  <\/script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useCallback } = React;

    ${code.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '').replace(/export\s+default\s+/g, 'const __DefaultExport__ = ')}

    // Find the main component
    const AppComponent = typeof App !== 'undefined' ? App : typeof __DefaultExport__ !== 'undefined' ? __DefaultExport__ : () => React.createElement('div', null, 'No component found');
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(AppComponent));
  <\/script>
</body>
</html>`;
    } else {
      // Plain HTML — serve as-is with Tailwind CDN
      if (code.includes('<html')) {
        html = code;
      } else {
        html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Preview'} — Visual OS</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>body { font-family: 'Outfit', system-ui, sans-serif; }</style>
</head>
<body>
${code}
</body>
</html>`;
      }
    }

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[API] Preview error:', err);
    return new NextResponse('Error: ' + err.message, { status: 500 });
  }
}
