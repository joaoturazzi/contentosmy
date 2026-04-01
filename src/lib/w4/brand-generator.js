// ─────────────────────────────────────────────────────
// WS4 — BRAND GENERATOR (2 chamadas em paralelo)
// Resolve: JSON truncado, tipografia "Sem informações"
// ─────────────────────────────────────────────────────

function safeJSON(raw) {
  if (!raw) throw new Error('Resposta vazia');
  try { return JSON.parse(raw); } catch {}
  try { return JSON.parse(raw.replace(/^```(?:json)?\n?/gm, '').replace(/\n?```$/gm, '').trim()); } catch {}
  try { const m = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/); if (m) return JSON.parse(m[0]); } catch {}
  try {
    let p = raw.replace(/^```(?:json)?\n?/gm, '').trim().replace(/,\s*$/, '');
    let o = (p.match(/[\{\[]/g) || []).length, c = (p.match(/[\}\]]/g) || []).length;
    while (c < o) { p += p.lastIndexOf('[') > p.lastIndexOf('{') ? ']' : '}'; c++; }
    return JSON.parse(p);
  } catch {}
  throw new Error('JSON invalido: ' + raw.slice(0, 300));
}

function fontForSector(sector = '') {
  const s = sector.toLowerCase();
  if (/saas|tech|software|tms|frete|logist/i.test(s)) return 'Cabinet Grotesk';
  if (/restaurant|food|ramen|cafe|pizza/i.test(s)) return 'Fraunces';
  if (/saude|clinic|wellness|medic/i.test(s)) return 'Instrument Serif';
  if (/moda|lifestyle|luxury|fashion/i.test(s)) return 'Clash Display';
  if (/imovel|real estate|construtor/i.test(s)) return 'Plus Jakarta Sans';
  return 'Cabinet Grotesk';
}

async function callOR(key, model, messages, maxTokens) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://contentos.app', 'X-Title': 'WS4 Brand' },
      body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0.3, messages }),
      signal: ctrl.signal,
    });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error('OpenRouter: ' + JSON.stringify(d.error || r.status));
    return d.choices?.[0]?.message?.content || '';
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Brand generator timeout 45s');
    throw e;
  } finally { clearTimeout(timer); }
}

async function generateCore(scraped, vibe, key, model) {
  const raw = await callOR(key, model, [
    { role: 'system', content: 'Responda APENAS com JSON valido e COMPLETO. Feche TODOS os colchetes. Sem markdown, sem backticks. NUNCA usar "Sem informacoes" ou null em campos de texto.' },
    { role: 'user', content: `Analise e retorne JSON completo:

DADOS: Titulo: ${scraped.metadata.title}
Desc: ${scraped.metadata.description}
H1s: ${scraped.headings.h1.join(' | ')}
H2s: ${scraped.headings.h2.slice(0, 6).join(' | ')}
Cores: ${scraped.colors.join(', ') || 'nao detectadas'}
Logo: ${scraped.logoUrl || 'nao encontrada'}
Tel: ${scraped.contact.phones.join(', ') || 'nenhum'}
Email: ${scraped.contact.emails.join(', ') || 'nenhum'}
Vibe: ${vibe}
Markdown: ${scraped.markdown.slice(0, 5000)}

JSON: {"business":{"name":"nome real","sector":"setor","location":"cidade ou null","main_product":"produto real","tone_of_voice":"3 adjetivos","target_audience":"publico"},"brand":{"colors":{"primary":"${scraped.colors[0] || '#333333'}","secondary":"${scraped.colors[1] || '#555555'}","accent":"${scraped.colors[2] || scraped.colors[0] || '#0066ff'}"},"typography":{"display":"ESCOLHER: Cabinet Grotesk, Fraunces, Instrument Serif, Outfit, Plus Jakarta Sans, Geist, Clash Display — NUNCA Inter/Roboto/Arial","body":"Outfit","mono":"JetBrains Mono"},"logo_url":"${scraped.logoUrl || 'null'}"},"copy":{"hero_headline":"6-8 palavras sem cliches","hero_sub":"15-20 palavras proposta de valor","hero_cta":"3-4 palavras","sections":[{"id":"features","items":[{"title":"feat1","desc":"desc"},{"title":"feat2","desc":"desc"},{"title":"feat3","desc":"desc"},{"title":"feat4","desc":"desc"}]},{"id":"about","title":"Sobre","content":"paragrafo real"},{"id":"contact","address":"endereco ou null","phone":"${scraped.contact.phones[0] || 'null'}","email":"${scraped.contact.emails[0] || 'null'}","hours":"null"}]},"problems_fixed":["prob1 → fix","prob2 → fix","prob3 → fix"]}` }
  ], 2000);

  const core = safeJSON(raw);
  // Font fallback
  if (!core.brand?.typography?.display || /Sem|null|Inter|Roboto|Arial/i.test(core.brand.typography.display)) {
    if (!core.brand) core.brand = {};
    if (!core.brand.typography) core.brand.typography = {};
    core.brand.typography.display = fontForSector(core.business?.sector);
    core.brand.typography.body = 'Outfit';
  }
  return core;
}

async function generateConcepts(businessName, sector, mainProduct, primaryColor, key, model) {
  try {
    const raw = await callOR(key, model, [
      { role: 'system', content: 'Responda APENAS com array JSON valido. Feche todos os colchetes. Sem markdown.' },
      { role: 'user', content: `Empresa: ${businessName} (${sector}). Produto: ${mainProduct}. Cor: ${primaryColor}.
Retorne array com 3 conceitos de video:
[{"id":"A","name":"nome","scene":"cena com produto real","camera":"movimento","lighting":"iluminacao","mood":"mood","image_prompt":"en: [product real], cinematic 8K, dramatic lighting, ${primaryColor} color grading, commercial photography, no text, no logos","video_prompt":"en: slow cinematic [move], smooth camera, professional commercial"},{"id":"B",...},{"id":"C",...}]` }
    ], 1500);
    const parsed = safeJSON(raw);
    if (Array.isArray(parsed) && parsed.length === 3) return parsed;
    if (parsed.video_concepts) return parsed.video_concepts;
  } catch {}

  // Fallback
  return [
    { id: 'A', name: 'Foco no Produto', scene: `${mainProduct} em uso`, camera: 'zoom lento', lighting: 'dramatica lateral', mood: 'profissional, confiante', image_prompt: `${mainProduct}, professional use, cinematic 8K, ${primaryColor} color grading, no text`, video_prompt: 'slow cinematic zoom, smooth camera, professional commercial' },
    { id: 'B', name: 'Resultado em Dados', scene: 'Dashboard com metricas', camera: 'pan horizontal', lighting: 'tela em ambiente escuro', mood: 'inovador, eficiente', image_prompt: `data dashboard, ${sector} metrics, cinematic, ${primaryColor} accent, dark bg, no text`, video_prompt: 'smooth horizontal pan, data visualization, cinematic' },
    { id: 'C', name: 'Equipe em Acao', scene: 'Profissionais usando o produto', camera: 'tilt de baixo para cima', lighting: 'natural, escritorio', mood: 'colaborativo, confiavel', image_prompt: `professionals using ${mainProduct}, office, cinematic 8K, natural light, no text`, video_prompt: 'slow tilt up, professionals at work, cinematic commercial' },
  ];
}

export async function generateBrandBlueprint(scraped, vibe, key, model, onProgress) {
  onProgress?.('Analisando identidade da marca...');

  const [coreResult, conceptsResult] = await Promise.allSettled([
    generateCore(scraped, vibe, key, model),
    generateConcepts(scraped.businessName || scraped.metadata.title, '', scraped.headings.h1[0] || scraped.metadata.title, scraped.colors[0] || '#333', key, model),
  ]);

  if (coreResult.status === 'rejected') throw new Error('Brand core: ' + coreResult.reason?.message);
  const core = coreResult.value;
  let concepts = conceptsResult.status === 'fulfilled' ? conceptsResult.value : [];

  if (!concepts || concepts.length < 3) {
    onProgress?.('Re-gerando conceitos com dados da marca...');
    concepts = await generateConcepts(core.business?.name, core.business?.sector, core.business?.main_product, core.brand?.colors?.primary || '#333', key, model);
  }

  const blueprint = { ...core, video_concepts: concepts };
  onProgress?.(`Blueprint: ${blueprint.business?.name} — font: ${blueprint.brand?.typography?.display}`);
  return blueprint;
}
