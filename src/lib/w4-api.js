// W4 API helpers — direct browser calls with timeout + validation + split LLM calls

const SCRAPE_TIMEOUT = 30000;
const LLM_TIMEOUT = 90000;

export async function callLLM({ apiKey, model, messages, maxTokens }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT);
  try {
    if (apiKey) {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://contentos.app', 'X-Title': 'Contentos Visual OS' },
        body: JSON.stringify({ model: model || 'deepseek/deepseek-chat', messages, max_tokens: maxTokens || 4096 }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.error) {
        const code = data.error?.code || res.status;
        if (code === 402 || code === '402') throw new Error('Creditos OpenRouter insuficientes. Adicione em openrouter.ai/credits');
        if (code === 401 || code === '401') throw new Error('API Key OpenRouter invalida.');
        throw new Error(typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error));
      }
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Resposta vazia do modelo.');
      return content;
    }
    const res = await fetch('/api/w4/llm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: '', model, messages, maxTokens }), signal: controller.signal });
    const data = await res.json();
    if (data.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message || 'Erro');
    return data.choices?.[0]?.message?.content || '';
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`Timeout: modelo demorou mais de ${LLM_TIMEOUT / 1000}s.`);
    throw e;
  } finally { clearTimeout(timeout); }
}

export async function callScrape({ url, apiKey }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT);
  try {
    const res = await fetch('/api/w4/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, apiKey: apiKey || '' }), signal: controller.signal });
    const data = await res.json();
    if (data.error) {
      const msg = typeof data.error === 'string' ? data.error : data.error.message || '';
      if (msg.includes('401')) throw new Error('API Key Firecrawl invalida');
      if (msg.includes('402')) throw new Error('Creditos Firecrawl esgotados');
      throw new Error(msg);
    }
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Timeout: scraping demorou mais de 30s.');
    throw e;
  } finally { clearTimeout(timeout); }
}

export async function testConnections(firecrawlKey, openrouterKey) {
  const results = { firecrawl: false, openrouter: false, errors: [] };
  try {
    const r = await fetch('/api/w4/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://example.com', apiKey: firecrawlKey || '' }) });
    const d = await r.json(); results.firecrawl = !d.error;
    if (d.error) results.errors.push('Firecrawl: ' + (typeof d.error === 'string' ? d.error : d.error.message || 'erro'));
  } catch (e) { results.errors.push('Firecrawl: ' + e.message); }
  if (openrouterKey) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openrouterKey}`, 'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '' }, body: JSON.stringify({ model: 'deepseek/deepseek-chat', max_tokens: 10, messages: [{ role: 'user', content: 'ok' }] }) });
      const d = await r.json(); results.openrouter = !!d.choices?.[0];
      if (!results.openrouter) results.errors.push('OpenRouter: ' + JSON.stringify(d.error || 'sem resposta'));
    } catch (e) { results.errors.push('OpenRouter: ' + e.message); }
  } else results.errors.push('OpenRouter: key nao configurada');
  return results;
}

// ═══ ROBUST JSON PARSER (4 fallback levels) ═══
export function safeParseJSON(raw) {
  if (!raw) throw new Error('Resposta vazia do modelo');
  // 1. Direct parse
  try { return JSON.parse(raw); } catch {}
  // 2. Remove markdown
  try { return JSON.parse(raw.replace(/^```(?:json)?\n?/gm, '').replace(/\n?```$/gm, '').trim()); } catch {}
  // 3. Extract JSON object or array
  try { const m = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/); if (m) return JSON.parse(m[1]); } catch {}
  // 4. Try closing truncated JSON
  try {
    let p = raw.replace(/^```(?:json)?\n?/gm, '').trim();
    p = p.replace(/,\s*$/, '');
    let opens = (p.match(/[\{\[]/g) || []).length;
    let closes = (p.match(/[\}\]]/g) || []).length;
    while (closes < opens) { p += p.lastIndexOf('[') > p.lastIndexOf('{') ? ']' : '}'; closes++; }
    return JSON.parse(p);
  } catch {}
  throw new Error('JSON invalido. Raw: ' + raw.slice(0, 300));
}

// Aliases for backward compatibility
export function parseJSON(raw) {
  try { return { parsed: safeParseJSON(raw), error: false }; } catch { return { parsed: null, error: true, raw }; }
}

export function ensureUrl(raw) {
  let u = raw.trim(); if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { new URL(u); return u; } catch { throw new Error('URL invalida: ' + u); }
}
export function safeHostname(url) { try { return new URL(url).hostname; } catch { return url.replace(/^https?:\/\//, '').split('/')[0] || url; } }

// ═══ SPLIT BRAND GENERATION (Bug 2 fix) ═══
export async function generateBrandCore(scraped, vibe, apiKey, model) {
  const raw = await callLLM({ apiKey, model, maxTokens: 2500, messages: [
    { role: 'system', content: `Responda APENAS com JSON valido e completo. Feche TODOS os colchetes e chaves. Sem markdown, sem backticks.

TIPOGRAFIA — escolha baseado no setor:
- SaaS/Tech/B2B: display: "Geist", body: "Outfit"
- Restaurante/Food: display: "Fraunces", body: "Outfit"
- Logistica/Industrial: display: "Cabinet Grotesk", body: "Outfit"
- Saude/Bem-estar: display: "Instrument Serif", body: "Outfit"
- Moda/Lifestyle: display: "Clash Display", body: "Outfit"
- Default: display: "Cabinet Grotesk", body: "Outfit"
NUNCA retornar "Sem informacoes". Sempre escolher uma font.` },
    { role: 'user', content: `Analise e retorne JSON completo:
{"business":{"name":"nome real","sector":"setor","location":"cidade ou null","main_product":"produto","tone_of_voice":"3 adjetivos","target_audience":"publico"},"brand":{"colors":{"primary":"${scraped.colors[0] || '#1a1a2e'}","secondary":"${scraped.colors[1] || '#16213e'}","accent":"${scraped.colors[2] || '#0f3460'}"},"typography":{"display":"font adequada ao setor","body":"Outfit"},"logo_url":"${scraped.logoUrl || 'null'}"},"copy":{"hero_headline":"6-8 palavras sem cliches","hero_sub":"15-20 palavras proposta de valor","hero_cta":"3-4 palavras","sections":[{"id":"features","items":[{"title":"feat1","desc":"desc"},{"title":"feat2","desc":"desc"},{"title":"feat3","desc":"desc"},{"title":"feat4","desc":"desc"}]},{"id":"about","title":"Sobre","content":"paragrafo real"},{"id":"contact","address":"${scraped.contact.phones[0] ? 'endereco' : 'null'}","phone":"${scraped.contact.phones[0] || 'null'}","email":"${scraped.contact.emails[0] || 'null'}","hours":"null"}]},"problems_fixed":["prob1","prob2","prob3"]}

DADOS: Titulo: ${scraped.metadata.title}\nH1: ${scraped.headings.h1.join(' | ')}\nH2: ${scraped.headings.h2.slice(0, 5).join(' | ')}\nCores: ${scraped.colors.join(', ')}\nFonts: ${scraped.fonts.join(', ')}\n\n${scraped.markdown.slice(0, 4000)}` }
  ] });
  return safeParseJSON(raw);
}

export async function generateVideoConcepts(businessName, sector, mainProduct, primaryColor, apiKey, model) {
  const raw = await callLLM({ apiKey, model, maxTokens: 1500, messages: [
    { role: 'system', content: 'Responda APENAS com um array JSON valido. Feche todos os colchetes. Sem markdown.' },
    { role: 'user', content: `Empresa: ${businessName} (${sector}). Produto: ${mainProduct}. Cor: ${primaryColor}.
Retorne array com 3 conceitos:
[{"id":"A","name":"nome","scene":"cena com produto real","camera":"movimento","lighting":"iluminacao","mood":"mood","image_prompt":"en: [product], cinematic 8K, dramatic lighting, commercial photography, no text","video_prompt":"en: slow cinematic [move], smooth camera, professional commercial"},{"id":"B",...},{"id":"C",...}]` }
  ] });
  const parsed = safeParseJSON(raw);
  return Array.isArray(parsed) ? parsed : parsed?.video_concepts || [];
}

// ═══ VALIDATION ═══
export function validateBlueprint(bp) {
  const missing = [];
  if (!bp?.business?.name) missing.push('business.name');
  if (!bp?.brand?.colors?.primary) missing.push('brand.colors.primary');
  if (!bp?.copy?.hero_headline) missing.push('copy.hero_headline');
  if (missing.length > 0) throw new Error('Blueprint incompleto. Faltam: ' + missing.join(', '));
  // Font fallback
  if (!bp.brand.typography?.display || bp.brand.typography.display === 'Sem informacoes') bp.brand.typography = { display: 'Cabinet Grotesk', body: 'Outfit' };
  return true;
}

export function auditGeneratedHTML(html, businessName) {
  const n = businessName ? new RegExp(businessName.split(/\s+/)[0], 'i') : /./;
  return [
    { label: 'Nome da empresa', pass: n.test(html) },
    { label: 'DOCTYPE', pass: /<!DOCTYPE html/i.test(html) },
    { label: '</html>', pass: html.includes('</html>') },
    { label: 'Tailwind', pass: /tailwind/i.test(html) },
    { label: '100dvh', pass: /100dvh/.test(html) },
    { label: 'Scroll reveals', pass: /data-reveal/i.test(html) },
    { label: 'IntersectionObserver', pass: /IntersectionObserver/i.test(html) },
    { label: 'Grain overlay', pass: /feTurbulence|grain|noise|::after/i.test(html) },
    { label: 'Navbar', pass: /<nav/i.test(html) },
    { label: 'Footer', pass: /<footer/i.test(html) },
    { label: 'Zero picsum', pass: !html.includes('picsum.photos') },
    { label: 'Zero TODO', pass: !/\/\/\s*TODO/i.test(html) },
    { label: 'Zero Inter', pass: !/'Inter'|"Inter"/i.test(html) },
  ];
}
