import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { prompt, apiKey: clientKey, model } = await request.json();

    // Priority: env var > client-provided key
    const apiKey = process.env.OPENROUTER_API_KEY || clientKey;
    if (!apiKey) return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 400 });
    if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

    const res = await fetch('https://openrouter.ai/api/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://contentos.app',
        'X-Title': 'Contentos Visual OS',
      },
      body: JSON.stringify({
        model: model || 'black-forest-labs/flux-schnell',
        prompt,
        n: 1,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json({ error: `OpenRouter image error (${res.status}): ${errBody}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[API] OpenRouter Image error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
