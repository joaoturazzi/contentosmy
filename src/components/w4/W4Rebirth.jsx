'use client';
import { useState, useEffect, useRef } from 'react';
import { Card, Inp, Sel, Btn, SLabel, Modal, toast } from '../ui';
import { uid } from '@/lib/utils';
import { W4_VIBES, W4_MODELS } from '@/lib/constants';
import { buildSystemPrompt } from '@/lib/w4-system-prompt';
import { callLLM, ensureUrl, safeHostname, parseJSON } from '@/lib/w4-api';
import { buildPreviewHTML, downloadHTML, isCodeComplete } from '@/lib/w4-preview';
import { parseScrapedData } from '@/lib/w4-scrape-parser';

const VIBE_CONFIG = {
  ethereal_glass: { bg:'#050505', surface:'#0d0d0d', text:'#FFFFFF', orbOp:'0.12', cardBg:'rgba(255,255,255,0.04)', cardBorder:'rgba(255,255,255,0.08)', desc:'OLED black, mesh gradients, glassmorphism cards com backdrop-blur' },
  editorial_luxury: { bg:'#FDFBF7', surface:'#F4F1EB', text:'#111111', orbOp:'0.06', cardBg:'#FFFFFF', cardBorder:'rgba(0,0,0,0.06)', desc:'Warm cream, serifs editoriais, grain overlay' },
  soft_structuralism: { bg:'#F9FAFB', surface:'#FFFFFF', text:'#18181B', orbOp:'0.04', cardBg:'#FFFFFF', cardBorder:'rgba(226,232,240,0.5)', desc:'White/silver-grey, grotesk bold, sombras ultra-difusas' },
};

function validateHTML(html) {
  const checks = [
    { test: /<nav/i, label: 'navbar' },
    { test: /hero|min-h/i, label: 'hero section' },
    { test: /data-reveal|IntersectionObserver/i, label: 'scroll reveals' },
    { test: /::after|grain|noise/i, label: 'grain overlay' },
    { test: /<footer/i, label: 'footer' },
  ];
  return checks.filter(c => !c.test.test(html)).map(c => c.label);
}

export default function W4Rebirth({ w4, setW4 }) {
  const [url, setUrl] = useState('');
  const [vibe, setVibe] = useState('ethereal_glass');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('scrape');
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [viewport, setViewport] = useState('desktop');
  const [deployModal, setDeployModal] = useState(false);

  // Phase data
  const [scrapeSteps, setScrapeSteps] = useState([]);
  const [scraped, setScraped] = useState(null);
  const [brandStepMsg, setBrandStepMsg] = useState('');
  const [htmlStepMsg, setHtmlStepMsg] = useState('');
  const [blueprint, setBlueprint] = useState(null);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [generatedHtml, setGeneratedHtml] = useState(null);
  const [htmlWarnings, setHtmlWarnings] = useState([]);
  const [showRaw, setShowRaw] = useState(false);
  const [showBpRaw, setShowBpRaw] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => { return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); clearInterval(intervalRef.current); }; }, [previewUrl]);

  const settings = w4.settings || [];
  const getKey = (k) => settings.find(s => s.key === k)?.value || '';
  const orKey = getKey('openrouter_api_key');
  const fcKey = getKey('firecrawl_api_key');

  const animateSteps = (msgs, setMsg) => {
    let i = 0;
    setMsg(msgs[0]);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => { i = Math.min(i + 1, msgs.length - 1); setMsg(msgs[i]); }, 3000);
  };
  const stopSteps = (setMsg) => { clearInterval(intervalRef.current); setMsg(''); };
  const updateStep = (id, done) => setScrapeSteps(prev => prev.map(s => s.id === id ? { ...s, done } : s));

  // ═══ PHASE 1: SCRAPE ═══
  const startScrape = async () => {
    const fullUrl = ensureUrl(url);
    if (!fullUrl) { toast('Cole a URL'); return; }
    setLoading(true); setError(null); setScraped(null); setBlueprint(null); setSelectedConcept(null); setGeneratedHtml(null); setActiveTab('scrape'); setHtmlWarnings([]);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    setScrapeSteps([
      { id: 'scrape', label: 'Raspando conteudo principal...', done: false },
      { id: 'map', label: 'Mapeando subpaginas...', done: false },
      { id: 'parse', label: 'Extraindo cores, imagens e copy...', done: false },
      { id: 'done', label: 'Scraping concluido', done: false },
    ]);
    try {
      updateStep('scrape', 'loading'); updateStep('map', 'loading');
      const res = await fetch('/api/w4/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: fullUrl, apiKey: fcKey }) });
      const data = await res.json();
      if (data.error) { const m = typeof data.error === 'string' ? data.error : data.error.message || ''; if (m.includes('401')) throw new Error('API Key Firecrawl invalida'); if (m.includes('402')) throw new Error('Creditos Firecrawl esgotados'); throw new Error(m); }
      updateStep('scrape', true); updateStep('map', true); updateStep('parse', 'loading');
      const parsed = parseScrapedData(data.scrape, data.map, fullUrl);
      if (!parsed.markdown || parsed.markdown.length < 50) throw new Error('Nenhum conteudo extraido.');
      updateStep('parse', true); updateStep('done', true);
      setScraped(parsed);
      toast(`Scraping OK: ${parsed.images.length} imgs, ${parsed.colors.length} cores`);
    } catch (err) { setError(err.message); toast('Erro: ' + (err.message || '').slice(0, 80)); }
    setLoading(false);
  };

  // ═══ PHASE 2: BRAND ═══
  const startBrand = async () => {
    if (!scraped) return; if (!orKey) { toast('Configure OpenRouter API key na Config'); return; }
    setLoading(true); setError(null); setBlueprint(null); setSelectedConcept(null); setActiveTab('brand');
    animateSteps(['Analisando identidade da marca...', 'Extraindo paleta e tipografia...', 'Reescrevendo copy...', 'Gerando 3 conceitos de video...', 'Finalizando blueprint...'], setBrandStepMsg);
    try {
      const raw = await callLLM({ apiKey: orKey, model: W4_MODELS.analysis, maxTokens: 3500, messages: [
        { role: 'system', content: 'Voce e um diretor de criacao senior de agencia $150k. Responda APENAS com JSON valido. Sem markdown, sem backticks.' },
        { role: 'user', content: `Analise e gere brand_blueprint JSON.\n\nURL: ${scraped.metadata.url}\nTitulo: ${scraped.metadata.title}\nDesc: ${scraped.metadata.description}\nH1s: ${scraped.headings.h1.join(' | ')}\nH2s: ${scraped.headings.h2.slice(0,6).join(' | ')}\nCores: ${scraped.colors.slice(0,8).join(', ')}\nFonts: ${scraped.fonts.join(', ')}\nTel: ${scraped.contact.phones.join(', ')}\nEmail: ${scraped.contact.emails.join(', ')}\nLogo: ${scraped.logoUrl || 'nao encontrada'}\nVIBE: ${vibe}\n\nMarkdown:\n${scraped.markdown.slice(0,6000)}\n\nJSON: {business:{name,sector,location,main_product,tone_of_voice,target_audience}, brand:{colors:{primary,secondary,accent,bg:"#050505",surface:"#111111"}, typography:{display:"font premium nunca Inter/Roboto/Arial",body:"Outfit"}, vibe_archetype:"${vibe}", logo_url:"${scraped.logoUrl||'null'}"}, copy:{hero_headline:"max 8 palavras sem cliches",hero_sub:"15-20 palavras",hero_cta:"3-4 palavras", sections:[{id:"features",items:[{title,desc}x4]},{id:"about",title,content},{id:"contact",address,phone,email,hours}]}, problems_fixed:[3 strings], video_concepts:[{id:"A",name,scene,camera,lighting,mood,image_prompt:"ingles para FLUX",video_prompt:"ingles para Kling"},{id:"B",...},{id:"C",...}]}` }
      ] });
      stopSteps(setBrandStepMsg);
      const { parsed: bp } = parseJSON(raw);
      if (!bp || !bp.business?.name) throw new Error('Blueprint invalido. Tente novamente.');
      setBlueprint(bp);
      toast('Brand blueprint gerado');
    } catch (err) { stopSteps(setBrandStepMsg); setError(err.message); toast('Erro: ' + (err.message||'').slice(0,80)); }
    setLoading(false);
  };

  // ═══ PHASE 3: HTML GENERATION ═══
  const startHtmlGen = async () => {
    if (!blueprint || !selectedConcept) return;
    if (!orKey) { toast('Configure OpenRouter API key'); return; }
    setLoading(true); setError(null); setActiveTab('html'); setHtmlWarnings([]);
    animateSteps(['Enviando blueprint para Gemini Flash...', 'Gerando navbar e hero section...', 'Construindo features e secoes...', 'Aplicando modulos cinematicos...', 'Finalizando footer e scripts...', 'Renderizando preview...'], setHtmlStepMsg);

    try {
      const b = blueprint;
      const c = selectedConcept;
      const vc = VIBE_CONFIG[vibe] || VIBE_CONFIG.ethereal_glass;
      const pri = b.brand?.colors?.primary || '#050505';
      const sec = b.brand?.colors?.secondary || '#1A1A1A';
      const acc = b.brand?.colors?.accent || '#3B82F6';
      const dFont = b.brand?.typography?.display || 'Outfit';
      const bFont = b.brand?.typography?.body || 'Outfit';
      const features = b.copy?.sections?.find(s => s.id === 'features')?.items || [];
      const about = b.copy?.sections?.find(s => s.id === 'about') || {};
      const contact = b.copy?.sections?.find(s => s.id === 'contact') || {};

      const code = await callLLM({ apiKey: orKey, model: W4_MODELS.code, maxTokens: 10000, messages: [
        { role: 'system', content: `Voce e um engenheiro frontend senior de agencia $150k. Gera sites HTML cinematicos completos.

REGRAS ABSOLUTAS:
- Responda APENAS com HTML. Comecar com <!DOCTYPE html> terminar com </html>
- Zero markdown, zero backticks, zero explicacoes
- font-family NUNCA Inter/Roboto/Arial → usar ${dFont}
- SEMPRE min-height:100dvh (nunca height:100vh)
- Navbar floating island pill (nunca full-width colada)
- Features bento assimetrico (NUNCA 3 cards iguais)
- Zero TODO, zero placeholder

MODULOS CINEMATICOS OBRIGATORIOS (copiar no HTML):
1. Grain overlay: body::after{content:'';position:fixed;inset:0;z-index:9999;pointer-events:none;opacity:0.025;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-size:256px}
2. Mesh gradient: 2 divs fixed, border-radius:50%, filter:blur(120px), pointer-events:none. Orb1: ${pri} opacity ${vc.orbOp} anim 14s. Orb2: ${sec} opacity 0.10 anim 18s.
3. Scroll reveal: [data-reveal]{opacity:0;transform:translateY(28px);transition:opacity 0.9s cubic-bezier(0.16,1,0.3,1),transform 0.9s cubic-bezier(0.16,1,0.3,1);transition-delay:calc(var(--stagger,0)*120ms)} [data-reveal].visible{opacity:1;transform:translateY(0)} + IntersectionObserver
4. Double-Bezel no card principal: outer ring-1 ring-white/5 p-1.5 rounded-[2rem] → inner shadow-inset
5. Button-in-Button no CTA: texto + span circular com seta
6. Active nav link via IntersectionObserver nas sections
7. scroll-behavior:smooth no html` },
        { role: 'user', content: `Gere o site HTML completo:

EMPRESA: ${b.business?.name} — ${b.business?.sector}
LOCAL: ${b.business?.location || 'nao informado'}
PRODUTO: ${b.business?.main_product}

VIBE: ${vibe.toUpperCase()} — ${vc.desc}
BG: ${vc.bg} | Texto: ${vc.text} | Cards: ${vc.cardBg} | Border: ${vc.cardBorder}

CORES DA MARCA: primary=${pri}, secondary=${sec}, accent=${acc}
FONT: display=${dFont}, body=${bFont}
LOGO: ${b.brand?.logo_url && b.brand.logo_url !== 'null' ? `<img src="${b.brand.logo_url}" class="h-6">` : `"${b.business?.name}" em font bold`}

COPY:
Headline: "${b.copy?.hero_headline}"
Sub: "${b.copy?.hero_sub}"
CTA: "${b.copy?.hero_cta}"

FEATURES (bento assimetrico):
${features.map((f,i) => `${i+1}. ${f.title}: ${f.desc}`).join('\n')}

SOBRE: ${about.content || 'nao disponivel'}
CONTATO: ${contact.phone || ''} ${contact.email || ''} ${contact.address || ''}

HERO VIDEO: nao disponivel ainda. Usar mesh gradient animado como background da hero.
<!-- SUBSTITUIR: <video autoplay muted loop playsinline src="hero.mp4"> -->

CONCEITO SELECIONADO: ${c.id} — ${c.name}
Cena: ${c.scene}
Mood: ${c.mood}

ESTRUTURA:
1. Navbar floating island pill (logo + 4 links + CTA accent)
2. Hero min-h-[100dvh] assimetrico (headline + sub + CTA)
3. Features bento grid assimetrico (4 items, 1 com col-span-2)
4. Sobre (conteudo real)
5. CTA section (dark radial gradient)
6. Footer (dados reais de contato)

<head> OBRIGATORIO:
<script src="https://cdn.tailwindcss.com"></script>
<script defer src="https://unpkg.com/alpinejs@3/dist/cdn.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=${dFont.replace(/ /g,'+')}:wght@300;400;500;600;700;800;900&family=${bFont.replace(/ /g,'+')}:wght@400;500;600;700&display=swap" rel="stylesheet">
<script>tailwind.config={theme:{extend:{colors:{primary:'${pri}',secondary:'${sec}',accent:'${acc}',surface:'${b.brand?.colors?.surface||'#111111'}'},fontFamily:{display:['${dFont}','system-ui'],body:['${bFont}','system-ui']}}}}</script>

Gere o HTML COMPLETO agora. <!DOCTYPE html> ate </html>.` }
      ] });

      stopSteps(setHtmlStepMsg);

      // Validate
      const missing = validateHTML(code);
      if (missing.length > 0) setHtmlWarnings(missing);

      if (!isCodeComplete(code)) throw new Error('HTML incompleto — modelo excedeu limite. Tente novamente.');

      const html = buildPreviewHTML(code, `${safeHostname(url)} — Rebuilt`);
      const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      // Save to W4 state
      const projectId = uid();
      const output = { id: uid(), projectId, type: 'site_code', title: `${safeHostname(url)} — Rebuilt (${W4_VIBES[vibe]?.label})`, content: code, language: 'html', metadata: { vibe, url: ensureUrl(url) }, createdAt: new Date().toISOString() };
      const project = { id: projectId, name: `Rebirth: ${safeHostname(url)}`, type: 'site_rebirth', status: 'complete', inputUrl: ensureUrl(url), inputText: '', inputChannel: '', vibe, brandBlueprint: blueprint, scrapedData: {}, outputContent: { code }, errorMessage: '', notes: '', createdAt: new Date().toISOString() };
      setW4(d => ({ ...d, projects: [project, ...d.projects], outputs: [output, ...d.outputs] }));

      setGeneratedHtml({ code, html });
      setPreviewUrl(blobUrl);
      toast('Site gerado com sucesso');
    } catch (err) { stopSteps(setHtmlStepMsg); setError(err.message); toast('Erro: ' + (err.message||'').slice(0,80)); }
    setLoading(false);
  };

  // ═══ RENDER ═══
  const tabs = [
    { id: 'scrape', label: 'Scrape', ready: true, done: !!scraped },
    { id: 'brand', label: 'Brand', ready: !!scraped, done: !!blueprint },
    { id: 'html', label: 'HTML', ready: !!blueprint && !!selectedConcept, done: !!generatedHtml },
  ];
  const bizSlug = (blueprint?.business?.name || safeHostname(url) || 'site').toLowerCase().replace(/[^a-z0-9]+/g, '-');

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
          <button key={tab.id} onClick={() => tab.ready && setActiveTab(tab.id)} style={{ flex: 1, padding: '10px 16px', borderRadius: 6, border: 'none', cursor: tab.ready ? 'pointer' : 'default', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, background: activeTab === tab.id ? (tab.done ? '#eafaf1' : '#eaf2fb') : '#f4f4f3', color: activeTab === tab.id ? (tab.done ? '#1e8449' : '#1a5276') : tab.ready ? '#555' : '#ccc', opacity: tab.ready ? 1 : 0.5 }}>
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
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: step.done === true ? '#1e8449' : step.done === 'loading' ? '#3498DB' : '#ccc' }} />
                  <span style={{ fontSize: 13, color: step.done === true ? '#1e8449' : step.done === 'loading' ? '#1a5276' : '#888' }}>{step.label}</span>
                </div>
              ))}
            </Card>
          )}
          {scraped && (
            <>
              <Card style={{ marginBottom: 10 }}><SLabel>Metadados</SLabel><div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2 }}><div><strong>URL:</strong> {scraped.metadata.url}</div><div><strong>Titulo:</strong> {scraped.metadata.title}</div>{scraped.metadata.description && <div><strong>Desc:</strong> {scraped.metadata.description.slice(0,120)}</div>}<div><strong>Subpags:</strong> {scraped.subpages.length} | <strong>Markdown:</strong> {scraped.markdown.length} chars</div></div></Card>
              <Card style={{ marginBottom: 10 }}><SLabel>Logo</SLabel>{scraped.logoUrl ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><img src={scraped.logoUrl} alt="" style={{ maxHeight: 40, background: '#f4f4f3', borderRadius: 6, padding: 4 }} onError={e => { e.target.style.display = 'none'; }} /><span style={{ fontSize: 10, color: '#888' }}>{scraped.logoUrl.slice(0,60)}</span></div> : <p style={{ fontSize: 12, color: '#888' }}>Nao detectada</p>}</Card>
              <Card style={{ marginBottom: 10 }}><SLabel>Paleta ({scraped.colors.length})</SLabel><div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{scraped.colors.map((c, i) => <div key={i} style={{ textAlign: 'center' }}><div style={{ width: 32, height: 32, borderRadius: 5, background: c, border: '1px solid #eceae5' }} /><p style={{ margin: '1px 0 0', fontSize: 8, color: '#888', fontFamily: 'monospace' }}>{c}</p></div>)}</div></Card>
              <Card style={{ marginBottom: 10 }}><SLabel>Imagens ({scraped.images.length})</SLabel><div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{scraped.images.slice(0,10).map((img, i) => <a key={i} href={img} target="_blank" rel="noopener noreferrer"><img src={img} alt="" style={{ width: 64, height: 44, objectFit: 'cover', borderRadius: 3, border: '1px solid #eceae5' }} onError={e => { e.target.style.display = 'none'; }} /></a>)}</div></Card>
              <Card style={{ marginBottom: 10 }}><SLabel>Conteudo</SLabel><div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 2 }}>{scraped.headings.h1.length > 0 && <div><strong>H1:</strong> {scraped.headings.h1.join(' | ')}</div>}{scraped.headings.h2.length > 0 && <div><strong>H2:</strong> {scraped.headings.h2.slice(0,4).join(' | ')}</div>}{scraped.contact.phones.length > 0 && <div><strong>Tel:</strong> {scraped.contact.phones.join(', ')}</div>}{scraped.contact.emails.length > 0 && <div><strong>Email:</strong> {scraped.contact.emails.join(', ')}</div>}{scraped.fonts.length > 0 && <div><strong>Fonts:</strong> {scraped.fonts.join(', ')}</div>}</div></Card>
              <Card style={{ marginBottom: 14 }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><SLabel style={{ margin: 0 }}>Markdown raw</SLabel><button onClick={() => setShowRaw(!showRaw)} style={{ fontSize: 10, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>{showRaw ? 'Fechar' : 'Expandir'}</button></div>{showRaw && <pre style={{ margin: '6px 0 0', fontSize: 9, color: '#555', overflow: 'auto', maxHeight: 180, background: '#fafaf8', padding: 8, borderRadius: 6, whiteSpace: 'pre-wrap' }}>{scraped.markdown.slice(0,3000)}</pre>}</Card>
              <Btn onClick={startBrand} style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>{loading ? 'Analisando...' : 'Proximo: Brand Blueprint →'}</Btn>
            </>
          )}
        </div>
      )}

      {/* ═══ TAB: BRAND ═══ */}
      {activeTab === 'brand' && (
        <div>
          {loading && brandStepMsg && <Card style={{ marginBottom: 16 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3498DB' }} /><span style={{ fontSize: 13, color: '#1a5276' }}>{brandStepMsg}</span></div></Card>}
          {!blueprint && !loading && scraped && <div style={{ textAlign: 'center', padding: 32 }}><Btn onClick={startBrand}>Gerar Brand Blueprint</Btn></div>}
          {blueprint && (
            <>
              {/* Visual Brand Card */}
              <Card style={{ marginBottom: 14, background: '#0a0a0a', color: '#fff', borderColor: '#222' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  {blueprint.brand?.logo_url && blueprint.brand.logo_url !== 'null' && <img src={blueprint.brand.logo_url} alt="" style={{ maxHeight: 36, borderRadius: 4 }} onError={e => { e.target.style.display = 'none'; }} />}
                  <div><p style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{blueprint.business?.name}</p><p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{blueprint.business?.sector}{blueprint.business?.location ? ` — ${blueprint.business.location}` : ''}</p></div>
                </div>
                <p style={{ margin: '0 0 4px', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Paleta</p>
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  {blueprint.brand?.colors && Object.entries(blueprint.brand.colors).map(([n, h]) => <div key={n} style={{ textAlign: 'center' }}><div style={{ width: 38, height: 38, borderRadius: 7, background: h, border: '1px solid rgba(255,255,255,0.08)' }} /><p style={{ margin: '2px 0 0', fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>{n}</p><p style={{ margin: 0, fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{h}</p></div>)}
                </div>
                <p style={{ margin: '0 0 3px', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Tipografia</p>
                <p style={{ margin: '0 0 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Display: <strong>{blueprint.brand?.typography?.display}</strong> · Body: <strong>{blueprint.brand?.typography?.body}</strong></p>
                <p style={{ margin: '0 0 3px', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Hero Copy</p>
                <p style={{ margin: '0 0 3px', fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{blueprint.copy?.hero_headline}</p>
                <p style={{ margin: '0 0 8px', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{blueprint.copy?.hero_sub}</p>
                <span style={{ display: 'inline-block', padding: '7px 18px', borderRadius: 7, background: blueprint.brand?.colors?.accent || '#3B82F6', color: '#fff', fontSize: 12, fontWeight: 600 }}>{blueprint.copy?.hero_cta}</span>
                {blueprint.problems_fixed?.length > 0 && <div style={{ marginTop: 16 }}><p style={{ margin: '0 0 4px', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Problemas corrigidos</p>{blueprint.problems_fixed.map((p, i) => <p key={i} style={{ margin: '0 0 2px', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>• {p}</p>)}</div>}
              </Card>

              {/* 3 Video Concepts */}
              <SLabel>Conceitos de Hero Video — escolha um</SLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                {(blueprint.video_concepts || []).map(concept => {
                  const sel = selectedConcept?.id === concept.id;
                  return (
                    <Card key={concept.id} onClick={() => setSelectedConcept(concept)} style={{ cursor: 'pointer', border: sel ? '2px solid #3B82F6' : '1px solid #eceae5', background: sel ? '#eaf2fb' : '#fff', transition: 'all .12s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                        <span style={{ width: 22, height: 22, borderRadius: 5, background: sel ? '#3B82F6' : '#f4f4f3', color: sel ? '#fff' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{concept.id}</span>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>{concept.name}</p>
                      </div>
                      <p style={{ margin: '0 0 3px', fontSize: 11, color: '#555' }}>{concept.scene}</p>
                      <p style={{ margin: 0, fontSize: 10, color: '#888' }}>Camera: {concept.camera}</p>
                      <p style={{ margin: 0, fontSize: 10, color: '#888' }}>Mood: {concept.mood}</p>
                    </Card>
                  );
                })}
              </div>
              {selectedConcept ? (
                <Btn onClick={startHtmlGen} style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>{loading ? 'Gerando...' : `Gerar site com conceito ${selectedConcept.id} →`}</Btn>
              ) : <p style={{ fontSize: 12, color: '#888', textAlign: 'center' }}>Selecione um conceito acima</p>}
              <div style={{ marginTop: 12 }}><button onClick={() => setShowBpRaw(!showBpRaw)} style={{ fontSize: 10, color: '#888', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>{showBpRaw ? 'Fechar JSON' : 'Ver JSON raw'}</button>{showBpRaw && <pre style={{ margin: '6px 0 0', fontSize: 9, color: '#555', overflow: 'auto', maxHeight: 200, background: '#fafaf8', padding: 8, borderRadius: 6, whiteSpace: 'pre-wrap' }}>{JSON.stringify(blueprint, null, 2)}</pre>}</div>
            </>
          )}
        </div>
      )}

      {/* ═══ TAB: HTML ═══ */}
      {activeTab === 'html' && (
        <div>
          {loading && htmlStepMsg && <Card style={{ marginBottom: 16 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3498DB' }} /><span style={{ fontSize: 13, color: '#1a5276' }}>{htmlStepMsg}</span></div></Card>}
          {!generatedHtml && !loading && blueprint && selectedConcept && (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>Conceito {selectedConcept.id}: "{selectedConcept.name}"</p>
              <Btn onClick={startHtmlGen}>Gerar Site HTML Premium</Btn>
            </div>
          )}
          {!generatedHtml && !loading && (!blueprint || !selectedConcept) && <div style={{ textAlign: 'center', padding: 32 }}><p style={{ fontSize: 13, color: '#ccc' }}>Complete as fases anteriores</p></div>}

          {generatedHtml && previewUrl && (
            <>
              {/* Warnings */}
              {htmlWarnings.length > 0 && <div style={{ padding: '8px 12px', borderRadius: 6, background: '#fef9e7', marginBottom: 12, fontSize: 11, color: '#8a6d3b' }}>Secoes possivelmente faltando: {htmlWarnings.join(', ')}. Considere regenerar.</div>}

              {/* Toolbar */}
              <Card style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: '#eafaf1', color: '#1e8449', fontWeight: 600 }}>Gerado ({generatedHtml.code.length} chars)</span>
                  <Btn sm onClick={() => downloadHTML(generatedHtml.html, `rebirth-${bizSlug}.html`)}>Baixar HTML</Btn>
                  <Btn sm variant="ghost" onClick={() => { navigator.clipboard.writeText(generatedHtml.html); toast('HTML copiado'); }}>Copiar codigo</Btn>
                  <Btn sm variant="ghost" onClick={() => setDeployModal(true)}>Publicar →</Btn>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                    <button onClick={() => setViewport('desktop')} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 4, background: viewport === 'desktop' ? '#1a1a1a' : '#f4f4f3', color: viewport === 'desktop' ? '#fff' : '#888', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Desktop</button>
                    <button onClick={() => setViewport('mobile')} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 4, background: viewport === 'mobile' ? '#1a1a1a' : '#f4f4f3', color: viewport === 'mobile' ? '#fff' : '#888', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Mobile</button>
                  </div>
                </div>
              </Card>

              {/* Preview iframe */}
              <div style={{ border: '1px solid #eceae5', borderRadius: 12, overflow: 'hidden', background: '#f4f4f3', padding: viewport === 'mobile' ? '0' : '0' }}>
                <iframe
                  src={previewUrl}
                  style={{ width: viewport === 'mobile' ? 390 : '100%', height: 700, border: 'none', display: 'block', margin: viewport === 'mobile' ? '0 auto' : '0', borderRadius: viewport === 'mobile' ? 12 : 0 }}
                  title="Preview"
                  sandbox="allow-scripts"
                />
              </div>

              {/* Code preview */}
              <Card style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <SLabel style={{ margin: 0 }}>Codigo fonte</SLabel>
                  <Btn sm onClick={() => { const w = window.open('', '_blank'); w.document.write(generatedHtml.html); w.document.close(); }}>Abrir em nova aba</Btn>
                </div>
                <pre style={{ margin: 0, fontSize: 9, color: '#555', overflow: 'auto', maxHeight: 200, background: '#fafaf8', padding: 8, borderRadius: 6, whiteSpace: 'pre-wrap' }}>{generatedHtml.code.slice(0, 2000)}{generatedHtml.code.length > 2000 ? '\n...' : ''}</pre>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Deploy Modal */}
      <Modal open={deployModal} onClose={() => setDeployModal(false)} title="Publicar online" width={500}>
        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Opcao 1 — Surge.sh (CLI)</p>
          <pre style={{ background: '#fafaf8', padding: 10, borderRadius: 6, fontSize: 11, marginBottom: 16, whiteSpace: 'pre-wrap' }}>{`# 1. Baixe o HTML (botao acima)
# 2. Crie pasta e mova:
mkdir rebirth-${bizSlug}
mv rebirth-${bizSlug}.html rebirth-${bizSlug}/index.html

# 3. Instale Surge (uma vez):
npm install -g surge

# 4. Publique:
cd rebirth-${bizSlug} && surge .

# URL gerada: rebirth-${bizSlug}.surge.sh`}</pre>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Opcao 2 — Netlify Drop (sem CLI)</p>
          <p>Acesse <strong>app.netlify.com/drop</strong> e arraste a pasta com o index.html. URL gerada instantaneamente.</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Btn variant="ghost" onClick={() => setDeployModal(false)}>Fechar</Btn>
        </div>
      </Modal>
    </div>
  );
}
