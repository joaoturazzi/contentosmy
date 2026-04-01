import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSQL } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Downloads generated site as a complete HTML file ready to use
export async function GET(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!id) return new NextResponse('Not found', { status: 404 });

  try {
    const sql = getSQL();
    const rows = await sql`SELECT content, metadata, title FROM w4_outputs WHERE id = ${id} LIMIT 1`;
    if (!rows.length) return new NextResponse('Not found', { status: 404 });

    const { content, title, metadata } = rows[0];
    let code = content || '';
    const codeBlockMatch = code.match(/```(?:tsx?|jsx?|html)?\s*\n([\s\S]*?)```/);
    if (codeBlockMatch) code = codeBlockMatch[1];

    const isReact = code.includes('useState') || code.includes('export default') || code.includes('const App');
    const safeName = (title || 'site').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase().slice(0, 40);

    // Generate a complete standalone HTML file
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Generated Site'}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  ${isReact ? `<script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>` : ''}
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Cabinet+Grotesk:wght@400;500;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  </style>
  <script>
    tailwind.config = {
      theme: { extend: { fontFamily: { sans: ['Outfit', 'Plus Jakarta Sans', 'system-ui'], display: ['Cabinet Grotesk', 'Outfit', 'system-ui'] } } }
    }
  <\/script>
</head>
<body>
  ${isReact ? `<div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useCallback, useMemo } = React;
    ${code.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '').replace(/export\s+default\s+/g, 'const __DefaultExport__ = ')}
    const AppComponent = typeof App !== 'undefined' ? App : typeof __DefaultExport__ !== 'undefined' ? __DefaultExport__ : () => React.createElement('div', null, 'Component');
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(AppComponent));
  <\/script>` : code}
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeName}.html"`,
      },
    });
  } catch (err) {
    console.error('[API] Download error:', err);
    return new NextResponse('Error: ' + err.message, { status: 500 });
  }
}
