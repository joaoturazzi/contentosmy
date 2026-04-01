import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Returns which API keys are available via environment variables
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    firecrawl: !!process.env.FIRECRAWL_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
