'use client';
import { useState, useEffect, useRef } from 'react';
import { Card, Inp, Sel, Btn, SLabel, toast } from '../ui';
import { uid } from '@/lib/utils';
import { W4_VIBES, W4_MODELS } from '@/lib/constants';
import { buildSystemPrompt } from '@/lib/w4-system-prompt';
import { callLLM, ensureUrl, safeHostname, parseJSON } from '@/lib/w4-api';
import { buildPreviewHTML, downloadHTML, isCodeComplete } from '@/lib/w4-preview';
import { parseScrapedData } from '@/lib/w4-scrape-parser';

export default function W4Rebirth({ w4, setW4 }) {
  const [url, setUrl] = useState('');
  const [vibe, setVibe] = useState('ethereal_glass');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('scrape');
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Phase data
  const [scrapeSteps, setScrapeSteps] = useState([]);
  const [scraped, setScraped] = useState(null);
  const [brandStepMsg, setBrandStepMsg] = useState('');
  const [blueprint, setBlueprint] = useState(null);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [generatedHtml, setGeneratedHtml] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [showBlueprintRaw, setShowBlueprintRaw] = useState(false);
  const brandStepInterval = useRef(null);

  useEffect(() => { return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); clearInterval(brandStepInterval.current); }; }, [previewUrl]);

  const settings = w4.settings || [];
  const getKey = (k) => settings.find(s => s.key === k)?.value || '';
  const orKey = getKey('openrouter_api_key');
  const fcKey = getKey('firecrawl_api_key');

  const updateStep = (id, done) => setScrapeSteps(prev => prev.map(s => s.id === id ? { ...s, done } : s));

  // ═══════════════════════════════════════════════════════════════
  // PHASE 1: SCRAPE
  // ═══════════════════════════════════════════════════════════════
  const startScrape = async () => {
    const fullUrl = ensureUrl(url);
    if (!fullUrl) { toast('Cole a URL do site'); return; }

    setLoading(true);
    setError(null);
    setScraped(null);
    setBlueprint(null);
    setSelectedConcept(null);
    setGeneratedHtml(null);
    setActiveTab('scrape');
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }

    setScrapeSteps([
      { id: 'scrape', label: 'Raspando conteudo principal...', done: false },
      { id: 'map', label: 'Mapeando subpaginas...', done: false },
      { id: 'parse', label: 'Extraindo cores, imagens e copy...', done: false },
      { id: 'done', label: 'Scraping concluido', done: false },
    ]);

    try {
      updateStep('scrape', 'loading');
      updateStep('map', 'loading');

      const res = await fetch('/api/w4/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fullUrl, apiKey: fcKey }),
      });
      const data = await res.json();
      if (data.error) {
        const msg = typeof data.error === 'string' ? data.error : data.error.message || 'Firecrawl error';
        if (msg.includes('401')) throw new Error('API Key do Firecrawl invalida');
        if (msg.includes('402')) throw new Error('Creditos Firecrawl esgotados');
        throw new Error(msg);
      }

      updateStep('scrape', true);
      updateStep('map', true);
      updateStep('parse', 'loading');

      const parsed = parseScrapedData(data.scrape, data.map, fullUrl);
      if (!parsed.markdown || parsed.markdown.length < 50) throw new Error('Nenhum conteudo extraido.');

      updateStep('parse', true);
      updateStep('done', true);
      setScraped(parsed);
      toast(`Scraping OK: ${parsed.images.length} imgs, ${parsed.colors.length} cores`);
    } catch (err) {
      setError(err.message);
      toast('Erro: ' + (err.message || '').slice(0, 80));
    }
    setLoading(false);
  };

  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: BRAND BLUEPRINT
  // ═══════════════════════════════════════════════════════════════
  const startBrand = async () => {
    if (!scraped) { toast('Execute o scraping primeiro'); return; }
    if (!orKey) { toast('Configure a OpenRouter API key na Config'); return; }

    setLoading(true);
    setError(null);
    setBlueprint(null);
    setSelectedConcept(null);
    setActiveTab('brand');

    // Animated loading steps
    const brandMsgs = [
      'Analisando identidade da marca...',
      'Extraindo paleta e tipografia...',
      'Reescrevendo copy...',
      'Gerando 3 conceitos de video...',
      'Finalizando blueprint...',
    ];
    let msgIdx = 0;
    setBrandStepMsg(brandMsgs[0]);
    brandStepInterval.current = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, brandMsgs.length - 1);
      setBrandStepMsg(brandMsgs[msgIdx]);
    }, 2500);

    try {
      const raw = await callLLM({
        apiKey: orKey,
        model: W4_MODELS.analysis,
        maxTokens: 3500,
        messages: [
          {
            role: 'system',
            content: `Voce e um diretor de criacao senior de uma agencia de $150k.
Voce recebe dados de scraping de um site existente e devolve um brand_blueprint JSON.
Responda APENAS com JSON valido. Nenhuma palavra fora do JSON. Sem markdown, sem backticks.`
          },
          {
            role: 'user',
            content: `Analise este site e gere o brand_blueprint.

DADOS DO SCRAPING:
URL: ${scraped.metadata.url}
Titulo: ${scraped.metadata.title}
Descricao: ${scraped.metadata.description}
H1s: ${scraped.headings.h1.join(' | ')}
H2s: ${scraped.headings.h2.slice(0, 6).join(' | ')}
H3s: ${scraped.headings.h3.slice(0, 8).join(' | ')}
Cores encontradas: ${scraped.colors.slice(0, 8).join(', ')}
Fonts encontradas: ${scraped.fonts.join(', ')}
Contato - telefones: ${scraped.contact.phones.join(', ')}
Contato - emails: ${scraped.contact.emails.join(', ')}
Logo URL: ${scraped.logoUrl || 'nao encontrada'}
Subpaginas: ${scraped.subpages.slice(0, 8).join(', ')}
Markdown do site:
${scraped.markdown.slice(0, 6000)}

VIBE ESCOLHIDO: ${vibe}
(ethereal_glass = dark OLED, mesh gradients, glass cards | editorial_luxury = cream warm, big serif, grain | soft_structuralism = white/grey, bold grotesk, airy)

Responda APENAS com este JSON preenchido com dados REAIS do site (nao invente):

{
  "business": {
    "name": "NOME_REAL",
    "sector": "SETOR_REAL",
    "location": "CIDADE_REAL ou null",
    "main_product": "PRODUTO_PRINCIPAL_REAL",
    "tone_of_voice": "3 adjetivos",
    "target_audience": "QUEM_COMPRA"
  },
  "brand": {
    "colors": {
      "primary": "#hex_do_site",
      "secondary": "#hex_do_site",
      "accent": "#hex_destaque",
      "bg": "#050505",
      "surface": "#111111"
    },
    "typography": {
      "display": "font premium (nunca Inter/Roboto/Arial) — usar Outfit, Cabinet Grotesk, Satoshi, Clash Display ou Plus Jakarta Sans",
      "body": "Outfit",
      "mono": "JetBrains Mono"
    },
    "vibe_archetype": "${vibe}",
    "logo_url": "${scraped.logoUrl || 'null'}"
  },
  "copy": {
    "hero_headline": "HEADLINE max 8 palavras sem cliches (Elevate, Seamless, etc)",
    "hero_sub": "SUBHEADLINE 15-20 palavras proposta de valor clara",
    "hero_cta": "CTA 3-4 palavras",
    "sections": [
      {
        "id": "features",
        "items": [
          {"title":"FEATURE_REAL_1","desc":"desc real"},
          {"title":"FEATURE_REAL_2","desc":"desc real"},
          {"title":"FEATURE_REAL_3","desc":"desc real"},
          {"title":"FEATURE_REAL_4","desc":"desc real"}
        ]
      },
      {"id":"about","title":"Titulo sobre","content":"Paragrafo real sobre a empresa"},
      {"id":"contact","address":"ENDERECO_REAL","phone":"TEL_REAL","email":"EMAIL_REAL","hours":"HORARIOS"}
    ]
  },
  "problems_fixed": [
    "PROBLEMA 1 do site atual e solucao",
    "PROBLEMA 2 do site atual e solucao",
    "PROBLEMA 3 do site atual e solucao"
  ],
  "video_concepts": [
    {
      "id": "A",
      "name": "NOME_CRIATIVO",
      "scene": "Descricao cena com produto real",
      "camera": "Movimento de camera",
      "lighting": "Iluminacao",
      "mood": "Mood",
      "image_prompt": "prompt ingles para FLUX: [PRODUTO_REAL], cinematic 8K, dramatic lighting, commercial photography, no text, no logos",
      "video_prompt": "prompt ingles para Kling: slow cinematic [MOVIMENTO], smooth camera, professional commercial style"
    },
    {
      "id": "B",
      "name": "NOME_CRIATIVO_2",
      "scene": "cena diferente",
      "camera": "outro movimento",
      "lighting": "outra iluminacao",
      "mood": "outro mood",
      "image_prompt": "prompt diferente",
      "video_prompt": "prompt diferente"
    },
    {
      "id": "C",
      "name": "NOME_CRIATIVO_3",
      "scene": "cena diferente",
      "camera": "outro movimento",
      "lighting": "outra iluminacao",
      "mood": "outro mood",
      "image_prompt": "prompt diferente",
      "video_prompt": "prompt diferente"
    }
  ]
}`
          }
        ],
      });

      clearInterval(brandStepInterval.current);
      setBrandStepMsg('');

      const { parsed: bp } = parseJSON(raw);
      if (!bp) throw new Error('JSON invalido retornado. Tente novamente.');
      if (!bp.business?.name) throw new Error('Blueprint incompleto — sem nome do negocio.');

      setBlueprint(bp);
      toast('Brand blueprint gerado com sucesso');
    } catch (err) {
      clearInterval(brandStepInterval.current);
      setBrandStepMsg('');
      setError(err.message);
      toast('Erro: ' + (err.message || '').slice(0, 80));
    }
    setLoading(false);
  };

  // ═══════════════════════════════════════════════════════════════
  // PHASE 3: HTML GENERATION
  // ═══════════════════════════════════════════════════════════════
  const startHtmlGen = async () => {
    if (!blueprint) { toast('Gere o blueprint primeiro'); return; }
    if (!orKey) { toast('Configure a OpenRouter API key'); return; }

    setLoading(true);
    setError(null);
    setActiveTab('html');

    try {
      const bp = blueprint;
      const pri = bp.brand?.colors?.primary || '#050505';
      const sec = bp.brand?.colors?.secondary || '#1A1A1A';
      const acc = bp.brand?.colors?.accent || '#3B82F6';
      const bg = bp.brand?.colors?.bg || '#050505';
      const surface = bp.brand?.colors?.surface || '#111111';
      const dFont = bp.brand?.typography?.display || 'Outfit';
      const bFont = bp.brand?.typography?.body || 'Satoshi';
      const vibeLabel = W4_VIBES[vibe]?.label || vibe;
      const concept = selectedConcept || bp.video_concepts?.[0];

      const code = await callLLM({
        apiKey: orKey,
        model: W4_MODELS.code,
        maxTokens: 10000,
        messages: [
          { role: 'system', content: buildSystemPrompt('site_rebirth', vibe) + `

Generate a COMPLETE standalone HTML page. Pure HTML + Tailwind CSS CDN + Alpine.js + vanilla JS.
Start with <!DOCTYPE html> end with </html>. No markdown backticks. No React.

MANDATORY <head>:
<script src="https://cdn.tailwindcss.com"></script>
<script defer src="https://unpkg.com/alpinejs@3/dist/cdn.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=${dFont.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900&family=${bFont.replace(/ /g, '+')}:wght@400;500;600;700&display=swap" rel="stylesheet">
<script>tailwind.config={theme:{extend:{colors:{primary:'${pri}',secondary:'${sec}',accent:'${acc}',surface:'${surface}'},fontFamily:{display:['${dFont}','system-ui'],body:['${bFont}','system-ui']}}}}</script>

VIBE: ${vibeLabel}. BG: ${bg}. Text: white.

MANDATORY SECTIONS:
1. FLOATING ISLAND NAVBAR — pill shape, fixed top-6, mx-auto, rounded-full, backdrop-blur, bg-black/80. ${scraped?.logoUrl ? `<img src="${scraped.logoUrl}" class="h-6"> as logo` : `"${bp.business?.name}" as text logo`}. Nav links + accent CTA. Alpine.js x-data for mobile.
2. HERO — min-h-[100dvh], bg-[${bg}]. Headline: "${bp.copy?.hero_headline}". Sub: "${bp.copy?.hero_sub}". CTA: "${bp.copy?.hero_cta}" with bg-accent. Asymmetric layout.
3. FEATURES BENTO — asymmetric CSS grid (NOT 3 equal cards). Items: ${JSON.stringify(bp.copy?.sections?.find(s => s.id === 'features')?.items?.map(i => i.title) || [])}.
4. ABOUT — "${bp.copy?.sections?.find(s => s.id === 'about')?.content || ''}".
5. CTA SECTION — contrasting bg-accent.
6. FOOTER — ${bp.copy?.sections?.find(s => s.id === 'contact')?.phone || ''} ${bp.copy?.sections?.find(s => s.id === 'contact')?.email || ''} ${bp.copy?.sections?.find(s => s.id === 'contact')?.address || ''}.

MANDATORY CSS MODULES:
- body::after grain overlay (fixed, pointer-events-none, noise SVG, opacity 0.025)
- IntersectionObserver scroll reveals (translateY(32px) opacity-0 → revealed)
- Stagger delays: style="--stagger:N" with calc(var(--stagger)*120ms)
- Hover: scale-105 on cards, transition-all duration-300
- scroll-behavior:smooth on html
- Double-Bezel on feature cards (outer ring-1 ring-white/5 p-1.5 rounded-2xl → inner)
- Button-in-Button on CTA (icon in circular wrapper)

Output COMPLETE HTML. No truncation.` },
          { role: 'user', content: `Blueprint: ${JSON.stringify(bp).slice(0, 2500)}\n\nGenerate the complete premium ${vibeLabel} HTML page.` },
        ],
      });

      if (!isCodeComplete(code)) throw new Error('Codigo incompleto. Tente novamente.');

      const html = buildPreviewHTML(code, `${safeHostname(url)} — Rebuilt`);
      const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      const projectId = uid();
      const output = { id: uid(), projectId, type: 'site_code', title: `${safeHostname(url)} — Rebuilt (${vibeLabel})`, content: code, language: 'html', metadata: { vibe, url: ensureUrl(url) }, createdAt: new Date().toISOString() };
      const project = { id: projectId, name: `Rebirth: ${safeHostname(url)}`, type: 'site_rebirth', status: 'complete', inputUrl: ensureUrl(url), inputText: '', inputChannel: '', vibe, brandBlueprint: bp, scrapedData: {}, outputContent: { code }, errorMessage: '', notes: '', createdAt: new Date().toISOString() };
      setW4(d => ({ ...d, projects: [project, ...d.projects], outputs: [output, ...d.outputs] }));

      setGeneratedHtml({ code, html });
      setPreviewUrl(blobUrl);
      toast('Site gerado com sucesso');
    } catch (err) {
      setError(err.message);
      toast('Erro: ' + (err.message || '').slice(0, 80));
    }
    setLoading(false);
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  const tabs = [
    { id: 'scrape', label: 'Scrape', ready: true, done: !!scraped },
    { id: 'brand', label: 'Brand', ready: !!scraped, done: !!blueprint },
    { id: 'html', label: 'HTML', ready: !!blueprint && !!selectedConcept, done: !!generatedHtml },
  ];

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Site Rebirth</h1>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#888' }}>3 fases: Scrape → Brand → HTML</p>

      {/* Input */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Inp placeholder="patagon.ai" value={url} onChange={e => setUrl(e.target.value)} style={{ flex: 1 }} onKeyDown={e => { if (e.key === 'Enter' && !loading) startScrape(); }} />
          <Sel value={vibe} onChange={e => setVibe(e.target.value)} style={{ width: 200 }}>
            {Object.entries(W4_VIBES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Sel>
          <Btn onClick={startScrape} style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>{loading ? 'Processando...' : 'Iniciar Rebirth'}</Btn>
        </div>
      </Card>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => tab.ready && setActiveTab(tab.id)} style={{
            flex: 1, padding: '10px 16px', borderRadius: 6, border: 'none', cursor: tab.ready ? 'pointer' : 'default', fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
            background: activeTab === tab.id ? (tab.done ? '#eafaf1' : '#eaf2fb') : '#f4f4f3',
            color: activeTab === tab.id ? (tab.done ? '#1e8449' : '#1a5276') : tab.ready ? '#555' : '#ccc',
            opacity: tab.ready ? 1 : 0.5,
          }}>
            {tab.done && 'Done '}{tab.label}
          </button>
        ))}
      </div>

      {error && !loading && <div style={{ padding: '10px 14px', borderRadius: 6, background: '#fdf2f2', marginBottom: 16, fontSize: 12, color: '#c0392b' }}>{error}</div>}

      {/* ═══ TAB: SCRAPE ═══ */}
      {activeTab === 'scrape' && (
        <div>
          {scrapeSteps.length > 0 && !scraped && (
            <Card style={{ marginBottom: 16 }}>
              {scrapeSteps.map(step => (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: step.done === true ? '#1e8449' : step.done === 'loading' ? '#3498DB' : '#ccc' }} />
                  <span style={{ fontSize: 13, color: step.done === true ? '#1e8449' : step.done === 'loading' ? '#1a5276' : '#888' }}>{step.label}</span>
                </div>
              ))}
            </Card>
          )}
          {scraped && (
            <>
              <Card style={{ marginBottom: 12 }}>
                <SLabel>Metadados</SLabel>
                <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div><strong>URL:</strong> {scraped.metadata.url}</div>
                  <div><strong>Titulo:</strong> {scraped.metadata.title}</div>
                  {scraped.metadata.description && <div><strong>Desc:</strong> {scraped.metadata.description}</div>}
                  <div><strong>Subpaginas:</strong> {scraped.subpages.length} | <strong>Markdown:</strong> {scraped.markdown.length} chars</div>
                </div>
              </Card>
              <Card style={{ marginBottom: 12 }}>
                <SLabel>Logo</SLabel>
                {scraped.logoUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={scraped.logoUrl} alt="logo" style={{ maxHeight: 48, background: '#f4f4f3', borderRadius: 6, padding: 6 }} onError={e => { e.target.style.display = 'none'; }} />
                    <span style={{ fontSize: 10, color: '#888', wordBreak: 'break-all' }}>{scraped.logoUrl.slice(0, 60)}</span>
                  </div>
                ) : <p style={{ fontSize: 12, color: '#888' }}>Nao detectada — sera texto</p>}
              </Card>
              <Card style={{ marginBottom: 12 }}>
                <SLabel>Paleta ({scraped.colors.length} cores)</SLabel>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {scraped.colors.map((c, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 6, background: c, border: '1px solid #eceae5' }} />
                      <p style={{ margin: '2px 0 0', fontSize: 8, color: '#888', fontFamily: 'monospace' }}>{c}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card style={{ marginBottom: 12 }}>
                <SLabel>Imagens ({scraped.images.length})</SLabel>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {scraped.images.slice(0, 12).map((img, i) => (
                    <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                      <img src={img} alt="" style={{ width: 72, height: 48, objectFit: 'cover', borderRadius: 4, border: '1px solid #eceae5' }} onError={e => { e.target.style.display = 'none'; }} />
                    </a>
                  ))}
                </div>
              </Card>
              <Card style={{ marginBottom: 12 }}>
                <SLabel>Conteudo</SLabel>
                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {scraped.headings.h1.length > 0 && <div><strong>H1:</strong> {scraped.headings.h1.join(' | ')}</div>}
                  {scraped.headings.h2.length > 0 && <div><strong>H2:</strong> {scraped.headings.h2.slice(0, 5).join(' | ')}</div>}
                  {scraped.contact.phones.length > 0 && <div><strong>Tel:</strong> {scraped.contact.phones.join(', ')}</div>}
                  {scraped.contact.emails.length > 0 && <div><strong>Email:</strong> {scraped.contact.emails.join(', ')}</div>}
                  {scraped.fonts.length > 0 && <div><strong>Fonts:</strong> {scraped.fonts.join(', ')}</div>}
                </div>
              </Card>
              <Card style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <SLabel style={{ margin: 0 }}>Markdown raw</SLabel>
                  <button onClick={() => setShowRaw(!showRaw)} style={{ fontSize: 11, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>{showRaw ? 'Fechar' : 'Expandir'}</button>
                </div>
                {showRaw && <pre style={{ margin: '8px 0 0', fontSize: 9, color: '#555', overflow: 'auto', maxHeight: 200, background: '#fafaf8', padding: 8, borderRadius: 6, whiteSpace: 'pre-wrap' }}>{scraped.markdown.slice(0, 4000)}</pre>}
              </Card>
              <Btn onClick={startBrand} style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>{loading ? 'Analisando...' : 'Proximo: Gerar Brand Blueprint →'}</Btn>
            </>
          )}
        </div>
      )}

      {/* ═══ TAB: BRAND ═══ */}
      {activeTab === 'brand' && (
        <div>
          {loading && brandStepMsg && (
            <Card style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3498DB' }} />
                <span style={{ fontSize: 13, color: '#1a5276' }}>{brandStepMsg}</span>
              </div>
            </Card>
          )}
          {!blueprint && !loading && scraped && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>Dados do scraping prontos. Gere o blueprint da marca.</p>
              <Btn onClick={startBrand}>Gerar Brand Blueprint</Btn>
            </div>
          )}
          {blueprint && (
            <>
              {/* Brand Card Visual */}
              <Card style={{ marginBottom: 16, background: '#0a0a0a', color: '#fff', borderColor: '#222' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  {blueprint.brand?.logo_url && blueprint.brand.logo_url !== 'null' ? (
                    <img src={blueprint.brand.logo_url} alt="logo" style={{ maxHeight: 40, borderRadius: 6 }} onError={e => { e.target.style.display = 'none'; }} />
                  ) : null}
                  <div>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{blueprint.business?.name || 'Brand'}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{blueprint.business?.sector}{blueprint.business?.location ? ` — ${blueprint.business.location}` : ''}</p>
                  </div>
                </div>

                {/* Colors */}
                <p style={{ margin: '0 0 6px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Paleta</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {blueprint.brand?.colors && Object.entries(blueprint.brand.colors).map(([name, hex]) => (
                    <div key={name} style={{ textAlign: 'center' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: hex, border: '1px solid rgba(255,255,255,0.1)' }} />
                      <p style={{ margin: '3px 0 0', fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{name}</p>
                      <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{hex}</p>
                    </div>
                  ))}
                </div>

                {/* Typography */}
                <p style={{ margin: '0 0 4px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Tipografia</p>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Display: <strong>{blueprint.brand?.typography?.display}</strong> · Body: <strong>{blueprint.brand?.typography?.body}</strong></p>

                {/* Hero copy */}
                <p style={{ margin: '0 0 4px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Hero Copy</p>
                <p style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{blueprint.copy?.hero_headline}</p>
                <p style={{ margin: '0 0 8px', fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{blueprint.copy?.hero_sub}</p>
                <span style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 8, background: blueprint.brand?.colors?.accent || '#3B82F6', color: '#fff', fontSize: 13, fontWeight: 600 }}>{blueprint.copy?.hero_cta}</span>

                {/* Problems fixed */}
                {blueprint.problems_fixed?.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <p style={{ margin: '0 0 6px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Problemas corrigidos</p>
                    {blueprint.problems_fixed.map((p, i) => (
                      <p key={i} style={{ margin: '0 0 3px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>• {p}</p>
                    ))}
                  </div>
                )}
              </Card>

              {/* 3 Video Concepts */}
              <SLabel>Conceitos de Hero Video — escolha um</SLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                {(blueprint.video_concepts || []).map(concept => {
                  const isSelected = selectedConcept?.id === concept.id;
                  return (
                    <Card key={concept.id} onClick={() => setSelectedConcept(concept)} style={{
                      cursor: 'pointer', border: isSelected ? '2px solid #3B82F6' : '1px solid #eceae5',
                      background: isSelected ? '#eaf2fb' : '#fff', transition: 'all .15s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ width: 24, height: 24, borderRadius: 6, background: isSelected ? '#3B82F6' : '#f4f4f3', color: isSelected ? '#fff' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{concept.id}</span>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{concept.name}</p>
                      </div>
                      <p style={{ margin: '0 0 4px', fontSize: 12, color: '#555' }}>{concept.scene}</p>
                      <p style={{ margin: '0 0 2px', fontSize: 11, color: '#888' }}>Camera: {concept.camera}</p>
                      <p style={{ margin: '0 0 2px', fontSize: 11, color: '#888' }}>Luz: {concept.lighting}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#888' }}>Mood: {concept.mood}</p>
                    </Card>
                  );
                })}
              </div>

              {/* Advance button */}
              {selectedConcept ? (
                <Btn onClick={startHtmlGen} style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
                  {loading ? 'Gerando HTML...' : `Gerar site com conceito ${selectedConcept.id} →`}
                </Btn>
              ) : (
                <p style={{ fontSize: 13, color: '#888', textAlign: 'center' }}>Selecione um conceito de video acima para continuar</p>
              )}

              {/* Raw JSON */}
              <div style={{ marginTop: 16 }}>
                <button onClick={() => setShowBlueprintRaw(!showBlueprintRaw)} style={{ fontSize: 11, color: '#888', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>{showBlueprintRaw ? 'Fechar JSON raw' : 'Ver brand_blueprint completo'}</button>
                {showBlueprintRaw && <pre style={{ margin: '8px 0 0', fontSize: 9, color: '#555', overflow: 'auto', maxHeight: 250, background: '#fafaf8', padding: 10, borderRadius: 6, whiteSpace: 'pre-wrap' }}>{JSON.stringify(blueprint, null, 2)}</pre>}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ TAB: HTML ═══ */}
      {activeTab === 'html' && (
        <div>
          {!generatedHtml && !loading && blueprint && selectedConcept && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>Blueprint pronto. Conceito {selectedConcept.id} selecionado.</p>
              <p style={{ fontSize: 12, color: '#aaa', marginBottom: 16 }}>"{selectedConcept.name}" — {selectedConcept.scene}</p>
              <Btn onClick={startHtmlGen}>Gerar Site HTML Premium</Btn>
            </div>
          )}
          {!generatedHtml && !loading && (!blueprint || !selectedConcept) && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ fontSize: 14, color: '#ccc' }}>Complete as fases anteriores primeiro</p>
            </div>
          )}
          {loading && activeTab === 'html' && (
            <Card><p style={{ fontSize: 13, color: '#1a5276' }}>Gerando site com Gemini Flash — pode levar 15-30s...</p></Card>
          )}
          {previewUrl && generatedHtml && (
            <>
              <Card style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <SLabel style={{ margin: 0 }}>Preview</SLabel>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn sm onClick={() => { const w = window.open('', '_blank'); w.document.write(generatedHtml.html); w.document.close(); }}>Abrir em nova aba</Btn>
                    <Btn sm variant="ghost" onClick={() => downloadHTML(generatedHtml.html, `${safeHostname(url)}-rebirth.html`)}>Download</Btn>
                  </div>
                </div>
                <div style={{ border: '1px solid #eceae5', borderRadius: 8, overflow: 'hidden' }}>
                  <iframe src={previewUrl} style={{ width: '100%', height: 600, border: 'none' }} title="Preview" sandbox="allow-scripts" />
                </div>
              </Card>
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <SLabel style={{ margin: 0 }}>Codigo ({generatedHtml.code.length} chars)</SLabel>
                  <Btn sm onClick={() => { navigator.clipboard.writeText(generatedHtml.html); toast('HTML copiado'); }}>Copiar</Btn>
                </div>
                <pre style={{ margin: 0, fontSize: 9, color: '#555', overflow: 'auto', maxHeight: 200, background: '#fafaf8', padding: 10, borderRadius: 6, whiteSpace: 'pre-wrap' }}>{generatedHtml.code.slice(0, 2000)}{generatedHtml.code.length > 2000 ? '\n...' : ''}</pre>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
