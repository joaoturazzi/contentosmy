// ─────────────────────────────────────────────────────
// WS4 — BRAND GENERATOR (2 chamadas em paralelo)
// System prompt com skills injetadas + markdown limpo
// ─────────────────────────────────────────────────────

import { loadSkills } from './skills-loader.js';

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
  throw new Error('JSON invalido: ' + raw.slice(0, 400));
}

function fontForSector(sector = '') {
  const s = sector.toLowerCase();
  if (/saas|tech|software|tms|frete|logist|plataforma|sistema/i.test(s)) return 'Cabinet Grotesk';
  if (/restaurant|food|ramen|cafe|pizza|gastrono/i.test(s)) return 'Fraunces';
  if (/saude|clinic|wellness|medic|hospital/i.test(s)) return 'Instrument Serif';
  if (/moda|lifestyle|luxury|fashion|joias/i.test(s)) return 'Clash Display';
  if (/imovel|real estate|construtor|arquitet/i.test(s)) return 'Plus Jakarta Sans';
  if (/marketing|agencia|creative|design|midia/i.test(s)) return 'Outfit';
  return 'Cabinet Grotesk';
}

function cleanMarkdownForPrompt(markdown, maxChars = 2500) {
  if (!markdown) return 'nao disponivel';
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]{30,}\)/g, '[imagem]')
    .replace(/^https?:\/\/\S+$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\w\s\u00C0-\u024F\n.,!?:;()\-–—"'%@+/]/g, ' ')
    .slice(0, maxChars)
    .trim();
}

async function callOR(key, model, messages, maxTokens, temperature = 0.3) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50000);
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://contentos.app', 'X-Title': 'WS4 Brand' },
      body: JSON.stringify({ model, max_tokens: maxTokens, temperature, messages }),
      signal: ctrl.signal,
    });
    const d = await r.json();
    if (!r.ok || d.error) {
      const code = d.error?.code || r.status;
      if (code === 401 || code === '401') throw new Error('API key invalida');
      if (code === 402 || code === '402') throw new Error('Creditos insuficientes');
      throw new Error('OpenRouter: ' + JSON.stringify(d.error || r.status));
    }
    return d.choices?.[0]?.message?.content || '';
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Timeout 50s');
    throw e;
  } finally { clearTimeout(timer); }
}

// ═══ CHAMADA 1: generateCore com skills injetadas ═══
async function generateCore(scraped, vibe, key, model) {
  const skills = await loadSkills();

  const systemPrompt = `Voce e um diretor de criacao senior de uma agencia de $150k.
Sua especialidade e analisar sites existentes e criar brand blueprints
que transformam marcas mediocres em marcas premium.

REGRAS DE OUTPUT — CRITICAS:
${skills.output || 'Responda apenas com JSON valido e completo. Zero truncacao.'}

REGRAS DE DESIGN — SEGUIR COM PRECISAO:
${skills.taste ? skills.taste.slice(0, 3000) : 'Usar tipografia premium (nunca Inter/Roboto/Arial). Max 1 cor de acento. Saturacao < 80%.'}

INSTRUCOES ESPECIFICAS:
- Voce recebe dados de scraping de um site existente
- Voce retorna UM JSON de brand_blueprint baseado nos dados reais
- NUNCA retorne os dados de entrada — ANALISE-OS e crie o blueprint
- NUNCA use valores como "Sem informacoes", "null", "nao detectado"
- Se uma informacao nao estiver disponivel, INFERIR baseado no contexto
- O JSON deve ser COMPLETO — feche TODOS os colchetes e chaves
- Responda APENAS com o JSON. Sem markdown, sem backticks, sem texto fora.

TIPOGRAFIA — escolher baseado no setor:
- SaaS/Tech/B2B/Logistica: display = "Cabinet Grotesk"
- Restaurante/Food/Gastronomia: display = "Fraunces"
- Saude/Clinica/Wellness: display = "Instrument Serif"
- Moda/Lifestyle/Luxury: display = "Clash Display"
- Marketing/Agencia/Creative: display = "Outfit"
- Default: display = "Cabinet Grotesk"
NUNCA retornar Inter, Roboto, Arial ou Helvetica.`;

  const userPrompt = `TAREFA: Analisar os dados do site abaixo e retornar um brand_blueprint JSON.
NAO repita os dados abaixo. ANALISE-OS e crie o blueprint.

DADOS DO SITE PARA ANALISE:
Titulo: ${scraped.metadata.title}
Descricao: ${scraped.metadata.description}
H1s encontrados: ${scraped.headings.h1.join(' | ') || 'nenhum'}
H2s encontrados: ${scraped.headings.h2.slice(0, 5).join(' | ') || 'nenhum'}
Cores CSS detectadas: ${scraped.colors.join(', ') || 'nenhuma — inferir da identidade visual'}
Logo URL: ${scraped.logoUrl || 'nao encontrada'}
Telefones: ${scraped.contact.phones.join(', ') || 'nenhum'}
Emails: ${scraped.contact.emails.join(', ') || 'nenhum'}
Vibe escolhido pelo usuario: ${vibe}
Conteudo do site:
${cleanMarkdownForPrompt(scraped.markdown)}

RETORNAR ESTE JSON PREENCHIDO COM ANALISE REAL (fechar todos os brackets):

{
  "business": {
    "name": "nome real identificado no site",
    "sector": "setor especifico (ex: SaaS de gestao de frete B2B)",
    "location": "cidade/pais se encontrado, senao inferir",
    "main_product": "produto ou servico principal identificado",
    "tone_of_voice": "3 adjetivos que descrevem o tom da marca",
    "target_audience": "publico-alvo identificado no conteudo"
  },
  "brand": {
    "colors": {
      "primary": "${scraped.colors[0] || '#1a1a2e'}",
      "secondary": "${scraped.colors[1] || '#16213e'}",
      "accent": "${scraped.colors[2] || scraped.colors[0] || '#0f3460'}"
    },
    "typography": {
      "display": "escolher font adequada ao setor — NUNCA Inter/Roboto/Arial",
      "body": "Outfit",
      "mono": "JetBrains Mono"
    },
    "logo_url": "${scraped.logoUrl || 'null'}"
  },
  "copy": {
    "hero_headline": "headline poderosa 6-8 palavras, especifica para este negocio, sem cliches",
    "hero_sub": "proposta de valor concreta 15-20 palavras",
    "hero_cta": "CTA direto 3-4 palavras",
    "sections": [
      {
        "id": "features",
        "items": [
          { "title": "diferencial 1 real", "desc": "1 frase especifica" },
          { "title": "diferencial 2 real", "desc": "1 frase especifica" },
          { "title": "diferencial 3 real", "desc": "1 frase especifica" },
          { "title": "diferencial 4 real", "desc": "1 frase especifica" }
        ]
      },
      { "id": "about", "title": "titulo da secao sobre", "content": "paragrafo real sobre a empresa baseado no conteudo" },
      {
        "id": "contact",
        "address": "endereco real ou null",
        "phone": "${scraped.contact.phones[0] || 'null'}",
        "email": "${scraped.contact.emails[0] || 'null'}",
        "hours": "horarios reais ou null"
      }
    ]
  },
  "problems_fixed": [
    "problema real 1 identificado no site e solucao",
    "problema real 2 e solucao",
    "problema real 3 e solucao"
  ]
}`;

  const raw = await callOR(key, model, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], 3000);

  // Parse with retry
  let core;
  try {
    core = safeJSON(raw);
  } catch (parseError) {
    console.warn('[brand] Parse falhou, retry com prompt simplificado...', parseError.message);
    const logoVal = scraped.logoUrl ? JSON.stringify(scraped.logoUrl) : 'null';
    const phoneVal = scraped.contact.phones[0] ? JSON.stringify(scraped.contact.phones[0]) : 'null';
    const emailVal = scraped.contact.emails[0] ? JSON.stringify(scraped.contact.emails[0]) : 'null';
    const c0 = scraped.colors[0] || '#333';
    const c1 = scraped.colors[1] || '#555';

    const retryPrompt = [
      'Empresa: ' + scraped.metadata.title,
      'Setor: inferir do conteudo',
      'Produto: ' + (scraped.headings.h1[0] || scraped.headings.h2[0] || (scraped.metadata.description || '').slice(0, 100)),
      'Vibe: ' + vibe,
      'Conteudo resumido: ' + cleanMarkdownForPrompt(scraped.markdown, 1500),
      '',
      'Retornar JSON com esta estrutura:',
      '{"business":{"name":"","sector":"","location":"","main_product":"","tone_of_voice":"","target_audience":""},',
      '"brand":{"colors":{"primary":"' + c0 + '","secondary":"' + c1 + '","accent":"' + c0 + '"},',
      '"typography":{"display":"Cabinet Grotesk","body":"Outfit","mono":"JetBrains Mono"},',
      '"logo_url":' + logoVal + '},',
      '"copy":{"hero_headline":"","hero_sub":"","hero_cta":"",',
      '"sections":[{"id":"features","items":[{"title":"","desc":""},{"title":"","desc":""},{"title":"","desc":""}]},',
      '{"id":"about","title":"","content":""},',
      '{"id":"contact","address":null,"phone":' + phoneVal + ',"email":' + emailVal + ',"hours":null}]},',
      '"problems_fixed":["","",""]}',
    ].join('\n');

    const retryRaw = await callOR(key, model, [
      { role: 'system', content: 'Responda APENAS com JSON valido. Feche todos os colchetes. Sem markdown. Sem texto fora do JSON.' },
      { role: 'user', content: retryPrompt },
    ], 3000, 0.1);
    core = safeJSON(retryRaw);
  }

  // Font fallback
  if (!core.brand?.typography?.display || /Sem|null|Inter|Roboto|Arial|Helvetica|informac/i.test(core.brand.typography.display)) {
    if (!core.brand) core.brand = {};
    if (!core.brand.typography) core.brand.typography = {};
    core.brand.typography.display = fontForSector(core.business?.sector);
    core.brand.typography.body = 'Outfit';
  }
  return core;
}

// ═══ CHAMADA 2: generateConcepts ═══
async function generateConcepts(businessName, sector, mainProduct, primaryColor, key, model) {
  try {
    const raw = await callOR(key, model, [
      { role: 'system', content: 'Responda APENAS com array JSON valido. Feche todos os colchetes. Sem markdown.' },
      { role: 'user', content: `Empresa: ${businessName} (${sector}). Produto: ${mainProduct}. Cor: ${primaryColor}.
Retorne array com 3 conceitos de video cinematografico:
[{"id":"A","name":"nome criativo","scene":"cena especifica com ${mainProduct}","camera":"movimento de camera","lighting":"iluminacao","mood":"mood","image_prompt":"en: ${mainProduct}, cinematic 8K, dramatic lighting, ${primaryColor} color grading, commercial photography, no text, no logos","video_prompt":"en: slow cinematic zoom, ${mainProduct}, smooth camera, professional commercial"},{"id":"B","name":"","scene":"","camera":"","lighting":"","mood":"","image_prompt":"","video_prompt":""},{"id":"C","name":"","scene":"","camera":"","lighting":"","mood":"","image_prompt":"","video_prompt":""}]` }
    ], 1500);
    const parsed = safeJSON(raw);
    if (Array.isArray(parsed) && parsed.length >= 3) return parsed.slice(0, 3);
    if (parsed?.video_concepts) return parsed.video_concepts.slice(0, 3);
  } catch {}

  // Fallback
  return [
    { id: 'A', name: 'Foco no Produto', scene: `${mainProduct} em uso profissional`, camera: 'zoom lento no detalhe', lighting: 'dramatica lateral', mood: 'profissional, confiante', image_prompt: `${mainProduct}, professional use, cinematic 8K, dramatic lighting, ${primaryColor} color grading, no text`, video_prompt: 'slow cinematic zoom, smooth camera, professional commercial' },
    { id: 'B', name: 'Resultado em Dados', scene: 'Dashboard com metricas de resultado', camera: 'pan horizontal suave', lighting: 'tela em ambiente escuro', mood: 'inovador, eficiente', image_prompt: `data dashboard, ${sector} metrics, cinematic 8K, ${primaryColor} accent, dark bg, no text`, video_prompt: 'smooth horizontal pan, data visualization, cinematic' },
    { id: 'C', name: 'Equipe em Acao', scene: 'Profissionais usando o produto', camera: 'tilt de baixo para cima', lighting: 'natural, escritorio moderno', mood: 'colaborativo, confiavel', image_prompt: `professionals using ${mainProduct}, modern office, cinematic 8K, ${primaryColor}, no text`, video_prompt: 'slow tilt up, professionals at work, cinematic commercial' },
  ];
}

// ═══ FUNCAO PRINCIPAL ═══
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
    concepts = await generateConcepts(core.business?.name || scraped.metadata.title, core.business?.sector || '', core.business?.main_product || '', core.brand?.colors?.primary || '#333', key, model);
  }

  const blueprint = { ...core, video_concepts: concepts };
  onProgress?.(`Blueprint: ${blueprint.business?.name} — font: ${blueprint.brand?.typography?.display}`);
  return blueprint;
}
