import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 60; // Vercel/Netlify extended timeout

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { model, messages, apiKey: clientKey, maxTokens } = await request.json();

    const apiKey = process.env.OPENROUTER_API_KEY || clientKey;
    if (!apiKey) return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 400 });
    if (!messages?.length) return NextResponse.json({ error: 'Messages are required' }, { status: 400 });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000); // 55s safety margin

    try {
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
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const errBody = await res.text();
        return NextResponse.json({ error: `OpenRouter (${res.status}): ${errBody.slice(0, 500)}` }, { status: res.status });
      }

      const data = await res.json();
      return NextResponse.json(data);
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        return NextResponse.json({ error: 'Timeout: a API do OpenRouter demorou mais de 55s. Tente novamente ou use um prompt menor.' }, { status: 504 });
      }
      throw fetchErr;
    }
  } catch (err) {
    console.error('[API] OpenRouter LLM error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
