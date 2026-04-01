import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { model, messages, apiKey: clientKey, maxTokens } = await request.json();

    // Priority: env var > client-provided key
    const apiKey = process.env.OPENROUTER_API_KEY || clientKey;
    if (!apiKey) return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 400 });
    if (!messages?.length) return NextResponse.json({ error: 'Messages are required' }, { status: 400 });

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://contentos.app',
        'X-Title': 'Contentos Visual OS',
      },
      body: JSON.stringify({
        model: model || 'deepseek/deepseek-chat',
        messages,
        max_tokens: maxTokens || 4096,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json({ error: `OpenRouter error (${res.status}): ${errBody}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[API] OpenRouter LLM error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
