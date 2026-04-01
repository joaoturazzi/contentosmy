'use client';
import { useState, useEffect } from 'react';
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

  // Phased data
  const [scrapeSteps, setScrapeSteps] = useState([]);
  const [scraped, setScraped] = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [generatedHtml, setGeneratedHtml] = useState(null);

  // Markdown raw collapsed
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => { return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }; }, [previewUrl]);

  const settings = w4.settings || [];
  const getKey = (k) => settings.find(s => s.key === k)?.value || '';
  const orKey = getKey('openrouter_api_key');
  const fcKey = getKey('firecrawl_api_key');

  const updateStep = (id, done) => {
    setScrapeSteps(prev => prev.map(s => s.id === id ? { ...s, done } : s));
  };

  // ─── PHASE 1: SCRAPE ─────────────────────────────────────────
  const startScrape = async () => {
    const fullUrl = ensureUrl(url);
    if (!fullUrl) { toast('Cole a URL do site'); return; }

    setLoading(true);
    setError(null);
    setScraped(null);
    setBlueprint(null);
    setGeneratedHtml(null);
    setActiveTab('scrape');
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }

    const steps = [
      { id: 'scrape', label: 'Raspando conteudo principal...', done: false },
      { id: 'map', label: 'Mapeando subpaginas...', done: false },
      { id: 'parse', label: 'Extraindo cores, imagens e copy...', done: false },
      { id: 'done', label: 'Scraping concluido', done: false },
    ];
    setScrapeSteps(steps);

    try {
      // Request 1 + 2: Scrape + Map in parallel via server proxy (needs server-side Firecrawl key)
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

      // Parse
      updateStep('parse', 'loading');
      const parsed = parseScrapedData(data.scrape, data.map, fullUrl);

      if (!parsed.markdown || parsed.markdown.length < 50) {
        throw new Error('Nenhum conteudo extraido. Verifique se a URL esta acessivel.');
      }

      updateStep('parse', true);
      updateStep('done', true);

      setScraped(parsed);
      toast(`Scraping concluido: ${parsed.images.length} imagens, ${parsed.colors.length} cores, ${parsed.headings.h1.length + parsed.headings.h2.length} headings`);
    } catch (err) {
      setError(err.message || 'Erro no scraping');
      toast('Erro: ' + (err.message || '').slice(0, 80));
    }
    setLoading(false);
  };

  // ─── PHASE 2: BRAND ANALYSIS ─────────────────────────────────
  const startBrand = async () => {
    if (!scraped) { toast('Execute o scraping primeiro'); return; }
    if (!orKey) { toast('Configure a OpenRouter API key na Config'); return; }

    setLoading(true);
    setError(null);
    setActiveTab('brand');

    try {
      const raw = await callLLM({
        apiKey: orKey,
        model: W4_MODELS.analysis,
        maxTokens: 3000,
        messages: [
          { role: 'system', content: buildSystemPrompt('site_rebirth', vibe) + `

Analyze the scraped website data and generate a brand_blueprint JSON.

OUTPUT ONLY valid JSON with this exact structure:
{
  "business": { "name": "", "sector": "", "main_product": "", "tone_of_voice": "" },
  "brand": {
    "colors": { "primary": "#hex", "secondary": "#hex", "accent": "#hex", "bg": "#050505", "surface": "#111111" },
    "typography": { "display": "font name", "body": "font name" },
    "vibe_archetype": "${vibe}",
    "logo_url": "${scraped.logoUrl || ''}"
  },
  "copy": {
    "hero_headline": "max 8 words, compelling, no cliches",
    "hero_sub": "max 20 words, specific",
    "hero_cta": "max 4 words",
    "sections": [
      { "id": "features", "items": [{"title":"","desc":""}] },
      { "id": "about", "content": "" },
      { "id": "social_proof", "content": "" }
    ]
  },
  "design_problems": ["problem 1", "problem 2"]
}

RULES:
- Use REAL content from the scraped data. Do not invent facts.
- Colors: extract from site OR suggest premium alternatives. No #000000, use #050505.
- Fonts: only Outfit, Cabinet Grotesk, Satoshi, Plus Jakarta Sans, Clash Display.
- Hero headline: rewrite to be magnetic. No "Elevate", "Seamless", "Unleash".
- Business name: "${scraped.businessName}"
- Logo URL: "${scraped.logoUrl || 'none found'}"
- Contact: phones=${JSON.stringify(scraped.contact.phones)}, emails=${JSON.stringify(scraped.contact.emails)}
- Site colors found: ${JSON.stringify(scraped.colors.slice(0, 6))}
- Fonts found: ${JSON.stringify(scraped.fonts)}

JSON ONLY, no markdown.` },
          { role: 'user', content: `Website: ${scraped.metadata.url}\nTitle: ${scraped.metadata.title}\nDescription: ${scraped.metadata.description}\n\nContent:\n${scraped.markdown.slice(0, 4000)}` },
        ],
      });

      const { parsed: bp } = parseJSON(raw);
      if (!bp) throw new Error('Nao foi possivel parsear o blueprint. Tente novamente.');
      setBlueprint(bp);
      toast('Brand blueprint gerado');
    } catch (err) {
      setError(err.message || 'Erro na analise');
      toast('Erro: ' + (err.message || '').slice(0, 80));
    }
    setLoading(false);
  };

  // ─── PHASE 3: HTML GENERATION ─────────────────────────────────
  const startHtmlGen = async () => {
    if (!blueprint) { toast('Gere o brand blueprint primeiro'); return; }
    if (!orKey) { toast('Configure a OpenRouter API key na Config'); return; }

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

      const code = await callLLM({
        apiKey: orKey,
        model: W4_MODELS.code,
        maxTokens: 10000,
        messages: [
          { role: 'system', content: buildSystemPrompt('site_rebirth', vibe) + `

Generate a COMPLETE standalone HTML page. Pure HTML + Tailwind CSS CDN + Alpine.js + vanilla JS.

MANDATORY <head>:
<script src="https://cdn.tailwindcss.com"></script>
<script defer src="https://unpkg.com/alpinejs@3/dist/cdn.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=${dFont.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900&family=${bFont.replace(/ /g, '+')}:wght@400;500;600;700&display=swap" rel="stylesheet">

MANDATORY Tailwind config:
<script>tailwind.config={theme:{extend:{colors:{primary:'${pri}',secondary:'${sec}',accent:'${acc}',surface:'${surface}'},fontFamily:{display:['${dFont}','system-ui'],body:['${bFont}','system-ui']}}}}</script>

VIBE: ${vibeLabel}. Background: ${bg}. Text: white/gray-300.

MANDATORY MODULES (implement ALL):
1. FLOATING ISLAND NAVBAR — not full-width. Pill shape, fixed, top 1.5rem, centered, backdrop-blur, rounded-full. Logo text + links + CTA button. Alpine.js x-data for mobile menu.
2. HERO — min-h-[100dvh], asymmetric layout. ${bp.copy?.hero_headline || 'Headline'} as large heading. ${bp.copy?.hero_sub || ''}. CTA button with accent bg.
3. FEATURES BENTO GRID — NOT 3 equal cards. Asymmetric CSS grid. Use real features from blueprint.
4. SOCIAL PROOF — stats or testimonials from real content.
5. CTA SECTION — contrasting bg, compelling copy.
6. FOOTER — with real contact info: ${JSON.stringify(scraped?.contact || {})}.

MANDATORY CSS EFFECTS:
- Grain overlay: body::after with fixed, pointer-events-none, noise SVG
- IntersectionObserver for scroll reveals: translateY(32px) opacity-0 → revealed
- Stagger delays: calc(var(--stagger) * 120ms)
- Hover transitions: scale, opacity changes on cards and buttons
- scroll-behavior: smooth on html

${scraped?.logoUrl ? `LOGO: Use <img src="${scraped.logoUrl}" alt="logo" class="h-8"> in navbar` : `LOGO: Use "${bp.business?.name || 'Brand'}" as text in navbar`}

CONTENT: Use the REAL rewritten copy from the blueprint below. No Lorem Ipsum. No placeholder.
COMPLETE HTML from <!DOCTYPE html> to </html>. No markdown backticks.` },
          { role: 'user', content: `Blueprint:\n${JSON.stringify(bp).slice(0, 3000)}\n\nGenerate the complete premium HTML page.` },
        ],
      });

      if (!isCodeComplete(code)) {
        throw new Error('Codigo incompleto — o modelo pode ter excedido o limite. Tente novamente.');
      }

      const html = buildPreviewHTML(code, `${safeHostname(url)} — Rebuilt`);
      const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      // Save to state
      const projectId = uid();
      const outputId = uid();
      const output = { id: outputId, projectId, type: 'site_code', title: `${safeHostname(url)} — Rebuilt (${vibeLabel})`, content: code, language: 'html', metadata: { vibe, url: ensureUrl(url) }, createdAt: new Date().toISOString() };
      const project = { id: projectId, name: `Rebirth: ${safeHostname(url)}`, type: 'site_rebirth', status: 'complete', inputUrl: ensureUrl(url), inputText: '', inputChannel: '', vibe, brandBlueprint: bp, scrapedData: {}, outputContent: { code }, errorMessage: '', notes: '', createdAt: new Date().toISOString() };
      setW4(d => ({ ...d, projects: [project, ...d.projects], outputs: [output, ...d.outputs] }));

      setGeneratedHtml({ code, html });
      setPreviewUrl(blobUrl);
      toast('Site gerado com sucesso');
    } catch (err) {
      setError(err.message || 'Erro na geracao');
      toast('Erro: ' + (err.message || '').slice(0, 80));
    }
    setLoading(false);
  };

  // ─── RENDER ───────────────────────────────────────────────────
  const tabs = [
    { id: 'scrape', label: 'Scrape', ready: true, done: !!scraped },
    { id: 'brand', label: 'Brand', ready: !!scraped, done: !!blueprint },
    { id: 'html', label: 'HTML', ready: !!blueprint, done: !!generatedHtml },
  ];

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Site Rebirth</h1>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#888' }}>Cole uma URL. 3 passos: Scrape → Brand → HTML.</p>

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
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '10px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
            background: activeTab === tab.id ? (tab.done ? '#eafaf1' : '#eaf2fb') : '#f4f4f3',
            color: activeTab === tab.id ? (tab.done ? '#1e8449' : '#1a5276') : tab.ready ? '#555' : '#ccc',
            opacity: tab.ready ? 1 : 0.5,
          }}>
            {tab.done ? 'Done' : ''} {tab.label}
            {tab.id === 'brand' && !tab.ready && <span style={{ fontSize: 10, marginLeft: 4 }}>(scrape primeiro)</span>}
            {tab.id === 'html' && !tab.ready && <span style={{ fontSize: 10, marginLeft: 4 }}>(brand primeiro)</span>}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && !loading && (
        <div style={{ padding: '10px 14px', borderRadius: 6, background: '#fdf2f2', marginBottom: 16, fontSize: 12, color: '#c0392b' }}>{error}</div>
      )}

      {/* ═══ TAB: SCRAPE ═══ */}
      {activeTab === 'scrape' && (
        <div>
          {/* Loading steps */}
          {scrapeSteps.length > 0 && !scraped && (
            <Card style={{ marginBottom: 16 }}>
              {scrapeSteps.map(step => (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: step.done === true ? '#1e8449' : step.done === 'loading' ? '#3498DB' : '#ccc', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: step.done === true ? '#1e8449' : step.done === 'loading' ? '#1a5276' : '#888' }}>{step.label}</span>
                </div>
              ))}
            </Card>
          )}

          {scraped && (
            <>
              {/* Section 1: Metadata */}
              <Card style={{ marginBottom: 12 }}>
                <SLabel>Status e metadados</SLabel>
                <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div><strong>URL:</strong> {scraped.metadata.url}</div>
                  <div><strong>Titulo:</strong> {scraped.metadata.title}</div>
                  <div><strong>Descricao:</strong> {scraped.metadata.description || '(nenhuma)'}</div>
                  <div><strong>Idioma:</strong> {scraped.metadata.language}</div>
                  <div><strong>Subpaginas:</strong> {scraped.subpages.length}</div>
                  <div><strong>Markdown:</strong> {scraped.markdown.length} chars</div>
                </div>
              </Card>

              {/* Section 2: Logo */}
              <Card style={{ marginBottom: 12 }}>
                <SLabel>Logo detectada</SLabel>
                {scraped.logoUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={scraped.logoUrl} alt="logo" style={{ maxHeight: 60, maxWidth: 200, background: '#f4f4f3', borderRadius: 6, padding: 8 }} onError={e => { e.target.style.display = 'none'; }} />
                    <span style={{ fontSize: 11, color: '#888', wordBreak: 'break-all' }}>{scraped.logoUrl.slice(0, 80)}</span>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: '#888' }}>Logo nao detectada — sera usada como texto na Fase 3</p>
                )}
              </Card>

              {/* Section 3: Colors */}
              <Card style={{ marginBottom: 12 }}>
                <SLabel>Paleta extraida ({scraped.colors.length} cores)</SLabel>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {scraped.colors.map((color, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 6, background: color, border: '1px solid #eceae5' }} />
                      <p style={{ margin: '2px 0 0', fontSize: 9, color: '#888', fontFamily: 'monospace' }}>{color}</p>
                    </div>
                  ))}
                  {scraped.colors.length === 0 && <p style={{ fontSize: 12, color: '#888' }}>Nenhuma cor significativa encontrada</p>}
                </div>
              </Card>

              {/* Section 4: Images */}
              <Card style={{ marginBottom: 12 }}>
                <SLabel>Imagens do site ({scraped.images.length})</SLabel>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {scraped.images.map((img, i) => (
                    <a key={i} href={img} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                      <img src={img} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #eceae5' }} onError={e => { e.target.style.display = 'none'; }} />
                    </a>
                  ))}
                  {scraped.images.length === 0 && <p style={{ fontSize: 12, color: '#888' }}>Nenhuma imagem encontrada</p>}
                </div>
              </Card>

              {/* Section 5: Content */}
              <Card style={{ marginBottom: 12 }}>
                <SLabel>Conteudo principal</SLabel>
                <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {scraped.headings.h1.length > 0 && <div><strong>H1:</strong> {scraped.headings.h1.join(' | ')}</div>}
                  {scraped.headings.h2.length > 0 && <div><strong>H2:</strong> {scraped.headings.h2.slice(0, 5).join(' | ')}</div>}
                  {scraped.contact.phones.length > 0 && <div><strong>Telefones:</strong> {scraped.contact.phones.join(', ')}</div>}
                  {scraped.contact.emails.length > 0 && <div><strong>Emails:</strong> {scraped.contact.emails.join(', ')}</div>}
                  {scraped.fonts.length > 0 && <div><strong>Fonts:</strong> {scraped.fonts.join(', ')}</div>}
                </div>
              </Card>

              {/* Section 6: Raw markdown */}
              <Card style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <SLabel style={{ margin: 0 }}>Markdown raw</SLabel>
                  <button onClick={() => setShowRaw(!showRaw)} style={{ fontSize: 11, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>{showRaw ? 'Fechar' : 'Expandir'}</button>
                </div>
                {showRaw && (
                  <pre style={{ margin: '8px 0 0', fontSize: 10, color: '#555', overflow: 'auto', maxHeight: 300, background: '#fafaf8', padding: 10, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{scraped.markdown.slice(0, 5000)}</pre>
                )}
              </Card>

              {/* Next step button */}
              <Btn onClick={startBrand} style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>{loading ? 'Analisando...' : 'Proximo: Gerar Brand Blueprint'}</Btn>
            </>
          )}
        </div>
      )}

      {/* ═══ TAB: BRAND ═══ */}
      {activeTab === 'brand' && (
        <div>
          {!blueprint && !loading && scraped && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>Pronto para analisar a marca e gerar o blueprint.</p>
              <Btn onClick={startBrand}>Gerar Brand Blueprint</Btn>
            </div>
          )}
          {loading && activeTab === 'brand' && (
            <Card><p style={{ fontSize: 13, color: '#1a5276' }}>Analisando marca com Gemini Flash...</p></Card>
          )}
          {blueprint && (
            <>
              <Card style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <SLabel style={{ margin: 0 }}>Brand Blueprint</SLabel>
                  <Btn sm onClick={() => { navigator.clipboard.writeText(JSON.stringify(blueprint, null, 2)); toast('JSON copiado'); }}>Copiar</Btn>
                </div>
                {blueprint.business?.name && <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>{blueprint.business.name}</p>}
                {blueprint.business?.sector && <p style={{ margin: '0 0 8px', fontSize: 13, color: '#888' }}>{blueprint.business.sector}</p>}
                {blueprint.copy?.hero_headline && <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, fontStyle: 'italic' }}>"{blueprint.copy.hero_headline}"</p>}
                {blueprint.copy?.hero_sub && <p style={{ margin: '0 0 12px', fontSize: 13, color: '#888' }}>{blueprint.copy.hero_sub}</p>}

                {/* Colors */}
                {blueprint.brand?.colors && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {Object.entries(blueprint.brand.colors).map(([name, hex]) => (
                      <div key={name} style={{ textAlign: 'center' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 6, background: hex, border: '1px solid #eceae5' }} />
                        <p style={{ margin: '2px 0 0', fontSize: 9, color: '#888' }}>{name}</p>
                        <p style={{ margin: 0, fontSize: 9, color: '#aaa', fontFamily: 'monospace' }}>{hex}</p>
                      </div>
                    ))}
                  </div>
                )}

                <pre style={{ margin: 0, fontSize: 10, color: '#555', overflow: 'auto', maxHeight: 250, background: '#fafaf8', padding: 10, borderRadius: 6, whiteSpace: 'pre-wrap' }}>{JSON.stringify(blueprint, null, 2)}</pre>
              </Card>

              <Btn onClick={startHtmlGen} style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>{loading ? 'Gerando HTML...' : 'Proximo: Gerar Site HTML'}</Btn>
            </>
          )}
        </div>
      )}

      {/* ═══ TAB: HTML ═══ */}
      {activeTab === 'html' && (
        <div>
          {!generatedHtml && !loading && blueprint && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>Blueprint pronto. Gere o site HTML premium.</p>
              <Btn onClick={startHtmlGen}>Gerar Site HTML</Btn>
            </div>
          )}
          {loading && activeTab === 'html' && (
            <Card><p style={{ fontSize: 13, color: '#1a5276' }}>Gerando site com Gemini Flash (pode levar 15-30s)...</p></Card>
          )}
          {previewUrl && generatedHtml && (
            <>
              <Card style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <SLabel style={{ margin: 0 }}>Preview do site</SLabel>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn sm onClick={() => { const w = window.open('', '_blank'); w.document.write(generatedHtml.html); w.document.close(); }}>Abrir em nova aba</Btn>
                    <Btn sm variant="ghost" onClick={() => downloadHTML(generatedHtml.html, `${safeHostname(url)}-rebirth.html`)}>Download HTML</Btn>
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
                <pre style={{ margin: 0, fontSize: 10, color: '#555', overflow: 'auto', maxHeight: 250, background: '#fafaf8', padding: 10, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{generatedHtml.code.slice(0, 2000)}{generatedHtml.code.length > 2000 ? '\n...' : ''}</pre>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
