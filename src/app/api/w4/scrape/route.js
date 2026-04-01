import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 60;

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { url, apiKey: clientKey } = await request.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const apiKey = process.env.FIRECRAWL_API_KEY || clientKey;
    if (!apiKey) return NextResponse.json({ error: 'FIRECRAWL_API_KEY not configured' }, { status: 400 });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      // Scrape
      const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ url, formats: ['markdown'] }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!scrapeRes.ok) {
        const errBody = await scrapeRes.text();
        return NextResponse.json({ error: `Firecrawl (${scrapeRes.status}): ${errBody.slice(0, 300)}` }, { status: scrapeRes.status });
      }
      const scrapeData = await scrapeRes.json();

      // Map (non-blocking, timeout 10s)
      let mapData = { links: [] };
      try {
        const mapController = new AbortController();
        const mapTimeout = setTimeout(() => mapController.abort(), 10000);
        const mapRes = await fetch('https://api.firecrawl.dev/v1/map', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ url }),
          signal: mapController.signal,
        });
        clearTimeout(mapTimeout);
        if (mapRes.ok) mapData = await mapRes.json();
      } catch {}

      return NextResponse.json({ scrape: scrapeData, map: mapData });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        return NextResponse.json({ error: 'Timeout: Firecrawl demorou mais de 25s. Verifique se a URL esta acessivel.' }, { status: 504 });
      }
      throw fetchErr;
    }
  } catch (err) {
    console.error('[API] Firecrawl scrape error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
