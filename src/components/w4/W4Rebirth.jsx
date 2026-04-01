'use client';
import { useState, useEffect, useRef } from 'react';
import { Card, Inp, Sel, Btn, SLabel, Modal, toast } from '../ui';
import { uid } from '@/lib/utils';
import { W4_VIBES, W4_MODELS } from '@/lib/constants';
import { ensureUrl, safeHostname, testConnections } from '@/lib/w4-api';
import { buildPreviewHTML, downloadHTML } from '@/lib/w4-preview';
import { runScrape } from '@/lib/w4/scraper';
import { generateBrandBlueprint } from '@/lib/w4/brand-generator';
import { runFullPipeline } from '@/lib/w4/pipeline';

const VIBE_CFG = {
  ethereal_glass: { bg:'#050505', surface:'#0d0d0d', text:'#FFFFFF', orbOp:'0.12', cardBg:'rgba(255,255,255,0.04)', cardBorder:'rgba(255,255,255,0.08)', desc:'OLED black, mesh gradients, glassmorphism' },
  editorial_luxury: { bg:'#FDFBF7', surface:'#F4F1EB', text:'#111111', orbOp:'0.06', cardBg:'#FFFFFF', cardBorder:'rgba(0,0,0,0.06)', desc:'Warm cream, serifs, grain overlay' },
  soft_structuralism: { bg:'#F9FAFB', surface:'#FFFFFF', text:'#18181B', orbOp:'0.04', cardBg:'#FFFFFF', cardBorder:'rgba(226,232,240,0.5)', desc:'White/grey, grotesk bold, airy' },
};

export default function W4Rebirth({ w4, setW4 }) {
  const [url, setUrl] = useState('');
  const [vibe, setVibe] = useState('ethereal_glass');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('scrape');
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [viewport, setViewport] = useState('desktop');
  const [deployModal, setDeployModal] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const [scrapeSteps, setScrapeSteps] = useState([]);
  const [scraped, setScraped] = useState(null);
  const [stepMsg, setStepMsg] = useState('');
  const [blueprint, setBlueprint] = useState(null);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [generatedHtml, setGeneratedHtml] = useState(null);
  const [htmlAudit, setHtmlAudit] = useState(null);
  const [pipelineStep, setPipelineStep] = useState(null); // {stepId, detail, pct}
  const [showRaw, setShowRaw] = useState(false);
  const [showBpRaw, setShowBpRaw] = useState(false);
  const intRef = useRef(null);

  useEffect(() => { return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); clearInterval(intRef.current); }; }, [previewUrl]);

  const settings = w4.settings || [];
  const getKey = (k) => settings.find(s => s.key === k)?.value || '';
  const orKey = getKey('openrouter_api_key');
  const fcKey = getKey('firecrawl_api_key');

  const animate = (msgs) => { let i = 0; setStepMsg(msgs[0]); clearInterval(intRef.current); intRef.current = setInterval(() => { i = Math.min(i+1, msgs.length-1); setStepMsg(msgs[i]); }, 3000); };
  const stopAnim = () => { clearInterval(intRef.current); setStepMsg(''); };
  const upStep = (id, done) => setScrapeSteps(p => p.map(s => s.id === id ? { ...s, done } : s));

  // ═══ TEST CONNECTION ═══
  const runTest = async () => {
    setTesting(true); setTestResult(null);
    const r = await testConnections(fcKey, orKey);
    setTestResult(r);
    setTesting(false);
    toast(r.errors.length === 0 ? 'Conexoes OK' : 'Problemas encontrados');
  };

  // ═══ RESET ═══
  const resetAll = () => {
    setScraped(null); setBlueprint(null); setSelectedConcept(null);
    setGeneratedHtml(null); setHtmlAudit(null); setError(null);
    setScrapeSteps([]); setStepMsg(''); setActiveTab('scrape');
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
  };

  // ═══ PHASE 1: SCRAPE ═══
  const startScrape = async () => {
    let fullUrl;
    try { fullUrl = ensureUrl(url); } catch (e) { toast(e.message); return; }
    if (!fullUrl) { toast('Cole a URL'); return; }
    resetAll();
    setLoading(true);
    setScrapeSteps([
      { id: 'scrape', label: 'Raspando conteudo principal...', done: false },
      { id: 'map', label: 'Mapeando subpaginas...', done: false },
      { id: 'parse', label: 'Extraindo cores, imagens, copy...', done: false },
      { id: 'done', label: 'Concluido', done: false },
    ]);
    try {
      upStep('scrape', 'loading'); upStep('map', 'loading');
      const parsed = await runScrape(fullUrl, fcKey, (msg) => {
        if (msg.includes('OK') || msg.includes('conclu')) { upStep('scrape', true); upStep('map', true); upStep('parse', true); upStep('done', true); }
        else if (msg.includes('Extraindo')) { upStep('scrape', true); upStep('map', true); upStep('parse', 'loading'); }
      });
      upStep('scrape', true); upStep('map', true); upStep('parse', true); upStep('done', true);
      setScraped(parsed);
      toast(`Scraping OK: ${parsed.images.length} imgs, ${parsed.colors.length} cores, logo: ${parsed._sources.logo_strategy}`);
    } catch (e) { setError(e.message); toast('Erro: ' + (e.message || '').slice(0, 80)); }
    setLoading(false);
  };

  // ═══ PHASE 2: BRAND (split into 2 parallel calls) ═══
  const startBrand = async () => {
    if (!scraped) return; if (!orKey) { toast('Configure OpenRouter key na Config'); return; }
    setLoading(true); setError(null); setBlueprint(null); setSelectedConcept(null); setActiveTab('brand');
    animate(['Analisando identidade da marca...', 'Extraindo paleta e tipografia...', 'Reescrevendo copy...', 'Gerando 3 conceitos de video...', 'Finalizando...']);
    try {
      const bp = await generateBrandBlueprint(scraped, vibe, orKey, W4_MODELS.analysis, (msg) => setStepMsg(msg));
      stopAnim();
      if (!bp.business?.name) throw new Error('Blueprint incompleto: sem nome da empresa');
      setBlueprint(bp);
      toast(`Blueprint: ${bp.business.name} — font: ${bp.brand?.typography?.display}`);
    } catch (e) { stopAnim(); setError(e.message); toast('Erro: ' + (e.message || '').slice(0, 80)); }
    setLoading(false);
  };

  // ═══ PHASE 3: HTML via 4-STEP PIPELINE ═══
  const startHtmlGen = async () => {
    if (!blueprint || !selectedConcept) return;
    if (!orKey) { toast('Configure OpenRouter key'); return; }
    setLoading(true); setError(null); setActiveTab('html'); setHtmlAudit(null); setPipelineStep(null);

    try {
      const result = await runFullPipeline(
        scraped, blueprint, vibe, orKey,
        (progress) => setPipelineStep(progress)
      );

      const html = buildPreviewHTML(result.html, `${safeHostname(url)} — Rebuilt`);
      setHtmlAudit(result.auditResult.checks);

      if (!result.auditResult.allPassed) {
        setError(`Audit: ${result.auditResult.score} — alguns checks falharam`);
      }

      const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      const projectId = uid();
      const output = { id: uid(), projectId, type: 'site_code', title: `${safeHostname(url)} — Rebuilt`, content: result.html, language: 'html', metadata: { vibe, url: ensureUrl(url), auditScore: result.auditResult.score }, createdAt: new Date().toISOString() };
      const project = { id: projectId, name: `Rebirth: ${safeHostname(url)}`, type: 'site_rebirth', status: 'complete', inputUrl: ensureUrl(url), inputText: '', inputChannel: '', vibe, brandBlueprint: blueprint, scrapedData: {}, outputContent: { code: result.html, audit: result.audit, plan: result.plan }, errorMessage: '', notes: '', createdAt: new Date().toISOString() };
      setW4(d => ({ ...d, projects: [project, ...d.projects], outputs: [output, ...d.outputs] }));

      setGeneratedHtml({ code: result.html, html });
      setPreviewUrl(blobUrl);
      toast(`Site gerado — ${result.auditResult.score}`);
    } catch (e) { setError(e.message); toast('Erro: ' + (e.message || '').slice(0, 80)); }
    setPipelineStep(null);
    setLoading(false);
  };

  // ═══ RENDER ═══
  const tabs = [
    { id: 'scrape', label: 'Scrape', ready: true, done: !!scraped },
    { id: 'brand', label: 'Brand', ready: !!scraped, done: !!blueprint },
    { id: 'html', label: 'HTML', ready: !!blueprint && !!selectedConcept, done: !!generatedHtml },
  ];
  const slug = (blueprint?.business?.name || safeHostname(url) || 'site').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Site Rebirth</h1>
        {(scraped || blueprint || generatedHtml) && <button onClick={resetAll} style={{ fontSize: 11, color: '#888', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Novo site</button>}
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#888' }}>3 fases: Scrape → Brand → HTML</p>

      {/* API Status + Test */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, fontSize: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: fcKey ? '#1e8449' : '#c0392b' }} />Firecrawl {fcKey ? '(salvo)' : '(sem key)'}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: orKey ? '#1e8449' : '#c0392b' }} />OpenRouter {orKey ? '(salvo)' : '(sem key)'}</span>
        <button onClick={runTest} disabled={testing} style={{ fontSize: 11, color: '#1a5276', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>{testing ? 'Testando...' : 'Testar conexao'}</button>
      </div>
      {testResult && (
        <Card style={{ marginBottom: 14, fontSize: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ color: testResult.firecrawl ? '#1e8449' : '#c0392b' }}>{testResult.firecrawl ? 'OK' : 'FALHA'} Firecrawl</span>
            <span style={{ color: testResult.openrouter ? '#1e8449' : '#c0392b' }}>{testResult.openrouter ? 'OK' : 'FALHA'} OpenRouter</span>
            {testResult.errors.map((e, i) => <span key={i} style={{ color: '#c0392b', fontSize: 11 }}>{e}</span>)}
          </div>
        </Card>
      )}

      {/* Input */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Inp placeholder="patagon.ai" value={url} onChange={e => setUrl(e.target.value)} style={{ flex: 1 }} onKeyDown={e => { if (e.key === 'Enter' && !loading) startScrape(); }} />
          <Sel value={vibe} onChange={e => setVibe(e.target.value)} style={{ width: 190 }}>
            {Object.entries(W4_VIBES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Sel>
          <Btn onClick={startScrape} style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>{loading ? 'Processando...' : 'Iniciar Rebirth'}</Btn>
        </div>
      </Card>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 14 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => t.ready && setActiveTab(t.id)} style={{ flex: 1, padding: '9px 14px', borderRadius: 6, border: 'none', cursor: t.ready ? 'pointer' : 'default', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, background: activeTab === t.id ? (t.done ? '#eafaf1' : '#eaf2fb') : '#f4f4f3', color: activeTab === t.id ? (t.done ? '#1e8449' : '#1a5276') : t.ready ? '#555' : '#ccc', opacity: t.ready ? 1 : 0.5 }}>
            {t.done && 'Done '}{t.label}
          </button>
        ))}
      </div>

      {error && !loading && <div style={{ padding: '10px 14px', borderRadius: 6, background: '#fdf2f2', marginBottom: 14, fontSize: 12, color: '#c0392b' }}>{error}</div>}
      {loading && stepMsg && <Card style={{ marginBottom: 14 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3498DB' }} /><span style={{ fontSize: 13, color: '#1a5276' }}>{stepMsg}</span></div></Card>}

      {/* ═══ TAB: SCRAPE ═══ */}
      {activeTab === 'scrape' && (
        <div>
          {scrapeSteps.length > 0 && !scraped && !loading && null}
          {scrapeSteps.length > 0 && !scraped && loading && (
            <Card style={{ marginBottom: 14 }}>{scrapeSteps.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.done === true ? '#1e8449' : s.done === 'loading' ? '#3498DB' : '#ccc' }} />
                <span style={{ fontSize: 12, color: s.done === true ? '#1e8449' : s.done === 'loading' ? '#1a5276' : '#888' }}>{s.label}</span>
              </div>
            ))}</Card>
          )}
          {scraped && (
            <>
              <Card style={{ marginBottom: 10 }}><SLabel>Metadados</SLabel><div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2 }}><div><strong>URL:</strong> {scraped.metadata.url}</div><div><strong>Titulo:</strong> {scraped.metadata.title}</div>{scraped.metadata.description && <div><strong>Desc:</strong> {scraped.metadata.description.slice(0,120)}</div>}<div><strong>Subpags:</strong> {scraped.subpages.length} | <strong>Markdown:</strong> {scraped.markdown.length} chars</div></div></Card>
              <Card style={{ marginBottom: 10 }}><SLabel>Logo</SLabel>{scraped.logoUrl ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><img src={scraped.logoUrl} alt="" style={{ maxHeight: 40, background: '#f4f4f3', borderRadius: 6, padding: 4 }} onError={e => { e.target.style.display = 'none'; }} /><span style={{ fontSize: 10, color: '#888' }}>{scraped.logoUrl.slice(0,60)}</span></div> : <p style={{ fontSize: 12, color: '#888' }}>Nao detectada</p>}</Card>
              <Card style={{ marginBottom: 10 }}><SLabel>Paleta ({scraped.colors.length} cores)</SLabel><div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{scraped.colors.length === 0 ? <p style={{ fontSize: 11, color: '#888' }}>Nenhuma cor encontrada</p> : scraped.colors.map((c, i) => <div key={i} style={{ textAlign: 'center' }}><div style={{ width: 32, height: 32, borderRadius: 5, background: c, border: '1px solid #eceae5' }} /><p style={{ margin: '1px 0 0', fontSize: 8, color: '#888', fontFamily: 'monospace' }}>{c}</p></div>)}</div></Card>
              <Card style={{ marginBottom: 10 }}><SLabel>Imagens ({scraped.images.length})</SLabel><div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{scraped.images.length === 0 ? <p style={{ fontSize: 11, color: '#888' }}>Nenhuma imagem</p> : scraped.images.slice(0,10).map((img, i) => <a key={i} href={img} target="_blank" rel="noopener noreferrer"><img src={img} alt="" style={{ width: 64, height: 44, objectFit: 'cover', borderRadius: 3, border: '1px solid #eceae5' }} onError={e => { e.target.style.display = 'none'; }} /></a>)}</div></Card>
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
          {!blueprint && !loading && scraped && <div style={{ textAlign: 'center', padding: 32 }}><Btn onClick={startBrand}>Gerar Brand Blueprint</Btn></div>}
          {blueprint && (
            <>
              <Card style={{ marginBottom: 14, background: '#0a0a0a', color: '#fff', borderColor: '#222' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  {blueprint.brand?.logo_url && blueprint.brand.logo_url !== 'null' && <img src={blueprint.brand.logo_url} alt="" style={{ maxHeight: 36, borderRadius: 4 }} onError={e => { e.target.style.display = 'none'; }} />}
                  <div><p style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{blueprint.business?.name}</p><p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{blueprint.business?.sector}{blueprint.business?.location ? ' — ' + blueprint.business.location : ''}</p></div>
                </div>
                <p style={{ margin: '0 0 4px', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Paleta</p>
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>{blueprint.brand?.colors && Object.entries(blueprint.brand.colors).map(([n, h]) => <div key={n} style={{ textAlign: 'center' }}><div style={{ width: 38, height: 38, borderRadius: 7, background: h, border: '1px solid rgba(255,255,255,0.08)' }} /><p style={{ margin: '2px 0 0', fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>{n}: {h}</p></div>)}</div>
                <p style={{ margin: '0 0 3px', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Tipografia</p>
                <p style={{ margin: '0 0 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{blueprint.brand?.typography?.display} / {blueprint.brand?.typography?.body}</p>
                <p style={{ margin: '0 0 3px', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Hero</p>
                <p style={{ margin: '0 0 3px', fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{blueprint.copy?.hero_headline}</p>
                <p style={{ margin: '0 0 8px', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{blueprint.copy?.hero_sub}</p>
                <span style={{ display: 'inline-block', padding: '7px 18px', borderRadius: 7, background: blueprint.brand?.colors?.accent || '#3B82F6', color: '#fff', fontSize: 12, fontWeight: 600 }}>{blueprint.copy?.hero_cta}</span>
                {blueprint.problems_fixed?.length > 0 && <div style={{ marginTop: 16 }}><p style={{ margin: '0 0 4px', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Problemas corrigidos</p>{blueprint.problems_fixed.map((p, i) => <p key={i} style={{ margin: '0 0 2px', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>• {p}</p>)}</div>}
              </Card>
              <SLabel>Conceitos de Hero Video — escolha um</SLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                {(blueprint.video_concepts || []).map(c => {
                  const sel = selectedConcept?.id === c.id;
                  return (<Card key={c.id} onClick={() => setSelectedConcept(c)} style={{ cursor: 'pointer', border: sel ? '2px solid #3B82F6' : '1px solid #eceae5', background: sel ? '#eaf2fb' : '#fff', transition: 'all .12s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}><span style={{ width: 22, height: 22, borderRadius: 5, background: sel ? '#3B82F6' : '#f4f4f3', color: sel ? '#fff' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{c.id}</span><p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>{c.name}</p></div>
                    <p style={{ margin: '0 0 3px', fontSize: 11, color: '#555' }}>{c.scene}</p>
                    <p style={{ margin: 0, fontSize: 10, color: '#888' }}>Camera: {c.camera} | Mood: {c.mood}</p>
                  </Card>);
                })}
              </div>
              {selectedConcept ? <Btn onClick={startHtmlGen} style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>{loading ? 'Gerando...' : `Gerar site com conceito ${selectedConcept.id} →`}</Btn> : <p style={{ fontSize: 12, color: '#888', textAlign: 'center' }}>Selecione um conceito</p>}
              <div style={{ marginTop: 12 }}><button onClick={() => setShowBpRaw(!showBpRaw)} style={{ fontSize: 10, color: '#888', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>{showBpRaw ? 'Fechar' : 'Ver JSON raw'}</button>{showBpRaw && <pre style={{ margin: '6px 0 0', fontSize: 9, color: '#555', overflow: 'auto', maxHeight: 200, background: '#fafaf8', padding: 8, borderRadius: 6, whiteSpace: 'pre-wrap' }}>{JSON.stringify(blueprint, null, 2)}</pre>}</div>
            </>
          )}
        </div>
      )}

      {/* ═══ TAB: HTML ═══ */}
      {activeTab === 'html' && (
        <div>
          {!generatedHtml && !loading && blueprint && selectedConcept && <div style={{ textAlign: 'center', padding: 32 }}><p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Conceito {selectedConcept.id}: "{selectedConcept.name}"</p><Btn onClick={startHtmlGen}>Gerar Site HTML (4-step pipeline)</Btn></div>}
          {!generatedHtml && !loading && (!blueprint || !selectedConcept) && <div style={{ textAlign: 'center', padding: 32 }}><p style={{ fontSize: 13, color: '#ccc' }}>Complete as fases anteriores</p></div>}

          {/* Pipeline progress */}
          {loading && pipelineStep && (
            <Card style={{ marginBottom: 14 }}>
              <SLabel>Pipeline ({pipelineStep.pct || 0}%)</SLabel>
              {[
                { id: 'audit', label: 'Audit (redesign-skill)' },
                { id: 'plan', label: 'Plan (estrutura das secoes)' },
                { id: 'build', label: 'Build (HTML + modulos cinematicos)' },
                { id: 'fix', label: 'Fix (corrigir violacoes)' },
              ].map(step => {
                const pipeSteps = ['audit', 'plan', 'build', 'fix'];
                const curIdx = pipeSteps.indexOf(pipelineStep.stepId);
                const stepIdx = pipeSteps.indexOf(step.id);
                const isDone = stepIdx < curIdx;
                const isActive = stepIdx === curIdx;
                return (
                  <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: isDone ? '#1e8449' : isActive ? '#3498DB' : '#ccc', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: isDone ? '#1e8449' : isActive ? '#1a5276' : '#888', fontWeight: isActive ? 600 : 400 }}>{step.label}</span>
                    {isActive && pipelineStep.detail && <span style={{ fontSize: 11, color: '#888', marginLeft: 4 }}>— {pipelineStep.detail}</span>}
                  </div>
                );
              })}
            </Card>
          )}
          {generatedHtml && previewUrl && (
            <>
              {/* Audit checklist */}
              {htmlAudit && (
                <Card style={{ marginBottom: 12, fontSize: 12 }}>
                  <SLabel>Audit ({htmlAudit.filter(c => c.pass).length}/{htmlAudit.length})</SLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    {htmlAudit.map((c, i) => (
                      <span key={i} style={{ color: c.pass ? '#1e8449' : '#c0392b' }}>{c.pass ? 'OK' : 'FALHA'} {c.label}</span>
                    ))}
                  </div>
                </Card>
              )}
              {/* Toolbar */}
              <Card style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: '#eafaf1', color: '#1e8449', fontWeight: 600 }}>{generatedHtml.code.length} chars</span>
                  <Btn sm onClick={() => downloadHTML(generatedHtml.html, `rebirth-${slug}.html`)}>Baixar HTML</Btn>
                  <Btn sm variant="ghost" onClick={() => { navigator.clipboard.writeText(generatedHtml.html); toast('Copiado'); }}>Copiar</Btn>
                  <Btn sm variant="ghost" onClick={() => setDeployModal(true)}>Publicar</Btn>
                  <Btn sm variant="ghost" onClick={startHtmlGen}>Regenerar</Btn>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                    {['desktop', 'mobile'].map(v => <button key={v} onClick={() => setViewport(v)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 4, background: viewport === v ? '#1a1a1a' : '#f4f4f3', color: viewport === v ? '#fff' : '#888', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>{v === 'desktop' ? 'Desktop' : 'Mobile'}</button>)}
                  </div>
                </div>
              </Card>
              {/* Preview */}
              <div style={{ border: '1px solid #eceae5', borderRadius: 12, overflow: 'hidden', background: '#f4f4f3' }}>
                <iframe src={previewUrl} style={{ width: viewport === 'mobile' ? 390 : '100%', height: 700, border: 'none', display: 'block', margin: viewport === 'mobile' ? '0 auto' : '0' }} title="Preview" sandbox="allow-scripts" />
              </div>
              {/* Code */}
              <Card style={{ marginTop: 12 }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}><SLabel style={{ margin: 0 }}>Codigo</SLabel><Btn sm onClick={() => { const w = window.open('', '_blank'); w.document.write(generatedHtml.html); w.document.close(); }}>Abrir em nova aba</Btn></div><pre style={{ margin: 0, fontSize: 9, color: '#555', overflow: 'auto', maxHeight: 200, background: '#fafaf8', padding: 8, borderRadius: 6, whiteSpace: 'pre-wrap' }}>{generatedHtml.code.slice(0, 2000)}{generatedHtml.code.length > 2000 ? '\n...' : ''}</pre></Card>
            </>
          )}
        </div>
      )}

      <Modal open={deployModal} onClose={() => setDeployModal(false)} title="Publicar online" width={480}>
        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Surge.sh (CLI)</p>
          <pre style={{ background: '#fafaf8', padding: 10, borderRadius: 6, fontSize: 11, marginBottom: 16, whiteSpace: 'pre-wrap' }}>{`mkdir rebirth-${slug}\nmv rebirth-${slug}.html rebirth-${slug}/index.html\nnpm install -g surge\ncd rebirth-${slug} && surge .`}</pre>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Netlify Drop (sem CLI)</p>
          <p>Acesse <strong>app.netlify.com/drop</strong> e arraste a pasta.</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}><Btn variant="ghost" onClick={() => setDeployModal(false)}>Fechar</Btn></div>
      </Modal>
    </div>
  );
}
