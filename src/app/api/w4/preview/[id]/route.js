import { NextResponse } from 'next/server';
import { getSQL } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function cleanCode(raw) {
  let code = raw || '';
  const blockMatch = code.match(/```(?:tsx?|jsx?|html|javascript)?\s*\n([\s\S]*?)```/);
  if (blockMatch) code = blockMatch[1];
  code = code.replace(/^```\w*\s*\n?/, '').replace(/\n?```\s*$/, '');
  code = code.replace(/import\s+.*?from\s+['"].*?['"];?\s*\n?/g, '');
  code = code.replace(/export\s+default\s+/g, 'const __Export__ = ');
  code = code.replace(/['"]use client['"];?\s*\n?/g, '');
  return code.trim();
}

export async function GET(request, { params }) {
  const { id } = await params;
  if (!id) return new NextResponse('Not found', { status: 404 });

  try {
    const sql = getSQL();
    const rows = await sql`SELECT content, title FROM w4_outputs WHERE id = ${id} LIMIT 1`;
    if (!rows.length) return new NextResponse('Preview not found', { status: 404 });

    const code = cleanCode(rows[0].content);
    const title = rows[0].title || 'Preview';
    const isReact = code.includes('useState') || code.includes('function App') || code.includes('className=');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  ${isReact ? `<script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone@7/babel.min.js"><\/script>` : ''}
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Outfit', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }</style>
  <script>tailwind.config={theme:{extend:{fontFamily:{sans:['Outfit','Plus Jakarta Sans','system-ui'],display:['Outfit','system-ui']}}}}<\/script>
</head>
<body>
  ${isReact ? `<div id="root"></div>
  <script type="text/babel">
    const{useState,useEffect,useRef,useCallback,useMemo}=React;
    ${code}
    const Root=typeof App!=='undefined'?App:typeof __Export__!=='undefined'?__Export__:typeof Page!=='undefined'?Page:()=>React.createElement('div',null,'No component');
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Root));
  <\/script>` : code}
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (err) {
    return new NextResponse('Error: ' + err.message, { status: 500 });
  }
}
