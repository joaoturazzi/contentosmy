import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { url, apiKey: clientKey } = await request.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    // Priority: env var > client-provided key
    const apiKey = process.env.FIRECRAWL_API_KEY || clientKey;
    if (!apiKey) return NextResponse.json({ error: 'FIRECRAWL_API_KEY not configured' }, { status: 400 });

    // Scrape
    const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ url, formats: ['markdown', 'html'] }),
    });
    if (!scrapeRes.ok) {
      const errBody = await scrapeRes.text();
      return NextResponse.json({ error: `Firecrawl scrape error (${scrapeRes.status}): ${errBody}` }, { status: scrapeRes.status });
    }
    const scrapeData = await scrapeRes.json();

    // Map
    const mapRes = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ url }),
    });
    const mapData = mapRes.ok ? await mapRes.json() : { links: [] };

    return NextResponse.json({ scrape: scrapeData, map: mapData });
  } catch (err) {
    console.error('[API] Firecrawl scrape error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
