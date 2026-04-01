import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { url, apiKey: bodyKey } = await request.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    const apiKey = bodyKey || process.env.FIRECRAWL_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Firecrawl API key is required' }, { status: 400 });

    // Scrape
    const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ url, formats: ['markdown', 'html'] }),
    });
    const scrapeData = await scrapeRes.json();

    // Map
    const mapRes = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ url }),
    });
    const mapData = await mapRes.json();

    return NextResponse.json({
      scrape: scrapeData,
      map: mapData,
    });
  } catch (err) {
    console.error('[API] Firecrawl scrape error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
