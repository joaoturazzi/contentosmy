// W4 API helpers — handles timeout, retries, and error extraction

export async function callLLM({ apiKey, model, messages, maxTokens }) {
  const res = await fetch('/api/w4/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: apiKey || '', model, messages, maxTokens: maxTokens || 4096 }),
  });
  const data = await res.json();
  if (data.error) {
    const msg = typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error);
    throw new Error(msg);
  }
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Resposta vazia do modelo. Tente novamente.');
  return content;
}

export async function callScrape({ url, apiKey }) {
  const res = await fetch('/api/w4/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, apiKey: apiKey || '' }),
  });
  const data = await res.json();
  if (data.error) {
    const msg = typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error);
    throw new Error(msg);
  }
  const markdown = data.scrape?.data?.markdown || data.scrape?.markdown || '';
  if (!markdown) throw new Error('Nenhum conteudo extraido. Verifique se a URL esta acessivel.');
  return { markdown, data };
}

export function parseJSON(raw) {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return { parsed: JSON.parse(match[0]), error: false };
  } catch {}
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) return { parsed: JSON.parse(match[0]), error: false };
  } catch {}
  return { parsed: null, error: true, raw };
}

export function ensureUrl(raw) {
  let u = raw.trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

export function safeHostname(url) {
  try { return new URL(url).hostname; } catch { return url.replace(/^https?:\/\//, '').split('/')[0] || url; }
}
