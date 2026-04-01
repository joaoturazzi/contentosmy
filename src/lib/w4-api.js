// W4 API helpers — direct browser calls with timeout + validation

const SCRAPE_TIMEOUT = 30000;
const LLM_TIMEOUT = 90000;

export async function callLLM({ apiKey, model, messages, maxTokens }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT);

  try {
    if (apiKey) {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://contentos.app',
          'X-Title': 'Contentos Visual OS',
        },
        body: JSON.stringify({ model: model || 'deepseek/deepseek-chat', messages, max_tokens: maxTokens || 4096 }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.error) {
        const code = data.error?.code || res.status;
        if (code === 402 || code === '402') throw new Error('Creditos OpenRouter insuficientes. Adicione creditos em openrouter.ai/credits');
        if (code === 401 || code === '401') throw new Error('API Key OpenRouter invalida. Verifique na Config.');
        throw new Error(typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error));
      }
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Resposta vazia do modelo. Tente novamente.');
      return content;
    }

    const res = await fetch('/api/w4/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: '', model, messages, maxTokens: maxTokens || 4096 }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (data.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message || 'Erro na API');
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Resposta vazia. Verifique OPENROUTER_API_KEY.');
    return content;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`Timeout: modelo demorou mais de ${LLM_TIMEOUT / 1000}s. Tente novamente.`);
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callScrape({ url, apiKey }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT);

  try {
    const res = await fetch('/api/w4/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, apiKey: apiKey || '' }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (data.error) {
      const msg = typeof data.error === 'string' ? data.error : data.error.message || 'Firecrawl error';
      if (msg.includes('401')) throw new Error('API Key Firecrawl invalida');
      if (msg.includes('402')) throw new Error('Creditos Firecrawl esgotados');
      throw new Error(msg);
    }
    const markdown = data.scrape?.data?.markdown || data.scrape?.markdown || '';
    if (!markdown) throw new Error('Nenhum conteudo extraido. Verifique se a URL esta acessivel.');
    return { markdown, data };
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Timeout: site demorou mais de 30s para responder.');
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export async function testConnections(firecrawlKey, openrouterKey) {
  const results = { firecrawl: false, openrouter: false, errors: [] };

  try {
    const r = await fetch('/api/w4/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com', apiKey: firecrawlKey || '' }),
    });
    const d = await r.json();
    results.firecrawl = !d.error;
    if (d.error) results.errors.push('Firecrawl: ' + (typeof d.error === 'string' ? d.error : d.error.message || 'erro'));
  } catch (e) { results.errors.push('Firecrawl: ' + e.message); }

  if (openrouterKey) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openrouterKey}`, 'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '', 'X-Title': 'Test' },
        body: JSON.stringify({ model: 'deepseek/deepseek-chat', max_tokens: 10, messages: [{ role: 'user', content: 'ok' }] }),
      });
      const d = await r.json();
      results.openrouter = !!d.choices?.[0]?.message?.content;
      if (!results.openrouter) results.errors.push('OpenRouter: ' + JSON.stringify(d.error || 'sem resposta'));
    } catch (e) { results.errors.push('OpenRouter: ' + e.message); }
  } else {
    results.errors.push('OpenRouter: API key nao configurada');
  }

  return results;
}

export function ensureUrl(raw) {
  let u = raw.trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { new URL(u); return u; } catch { throw new Error('URL invalida: ' + u); }
}

export function safeHostname(url) {
  try { return new URL(url).hostname; } catch { return url.replace(/^https?:\/\//, '').split('/')[0] || url; }
}

export function parseJSON(raw) {
  try { return { parsed: JSON.parse(raw), error: false }; } catch {}
  try { const c = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim(); return { parsed: JSON.parse(c), error: false }; } catch {}
  try { const m = raw.match(/\{[\s\S]*\}/); if (m) return { parsed: JSON.parse(m[0]), error: false }; } catch {}
  return { parsed: null, error: true, raw };
}

export function validateBlueprint(bp) {
  const required = [
    ['business.name', bp?.business?.name],
    ['brand.colors.primary', bp?.brand?.colors?.primary],
    ['copy.hero_headline', bp?.copy?.hero_headline],
    ['video_concepts (3)', bp?.video_concepts?.length === 3],
  ];
  const missing = required.filter(([, val]) => !val).map(([key]) => key);
  if (missing.length > 0) throw new Error('Blueprint incompleto. Faltam: ' + missing.join(', '));
  return true;
}

export function auditGeneratedHTML(html, businessName) {
  const nameRegex = businessName ? new RegExp(businessName.split(/\s+/)[0], 'i') : /./;
  return [
    { label: 'Nome da empresa presente', pass: nameRegex.test(html) },
    { label: 'DOCTYPE completo', pass: html.includes('<!DOCTYPE html') || html.includes('<!doctype html') },
    { label: 'Fechamento HTML', pass: html.includes('</html>') },
    { label: 'Tailwind CDN', pass: html.includes('tailwindcss') || html.includes('tailwind') },
    { label: 'min-height 100dvh', pass: /100dvh/.test(html) },
    { label: 'Scroll reveals (data-reveal)', pass: /data-reveal/i.test(html) },
    { label: 'IntersectionObserver', pass: /IntersectionObserver/i.test(html) },
    { label: 'Grain overlay', pass: /::after|grain|noise|feTurbulence/i.test(html) },
    { label: 'Navbar presente', pass: /<nav/i.test(html) },
    { label: 'Footer presente', pass: /<footer/i.test(html) },
    { label: 'Zero picsum', pass: !html.includes('picsum.photos') },
    { label: 'Zero TODO', pass: !/\/\/\s*TODO|\/\*\s*TODO/i.test(html) },
    { label: 'Zero font Inter', pass: !/'Inter'|"Inter"/i.test(html) },
  ];
}
