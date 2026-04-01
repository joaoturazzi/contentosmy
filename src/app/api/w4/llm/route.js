import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { model, messages, apiKey: bodyKey, maxTokens } = await request.json();
    const apiKey = bodyKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'OpenRouter API key is required' }, { status: 400 });
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

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[API] OpenRouter LLM error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
