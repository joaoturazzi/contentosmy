'use client';
import { useState } from 'react';
import { Card, Inp, Sel, Btn, SLabel, toast } from '../ui';
import { uid } from '@/lib/utils';
import { W4_VIBES, W4_MODELS } from '@/lib/constants';
import { buildSystemPrompt } from '@/lib/w4-system-prompt';
import { callLLM, callScrape, parseJSON, ensureUrl, safeHostname } from '@/lib/w4-api';

export default function W4Rebirth({ w4, setW4 }) {
  const [url, setUrl] = useState('');
  const [vibe, setVibe] = useState('ethereal_glass');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const settings = w4.settings || [];
  const getKey = (k) => settings.find(s => s.key === k)?.value || '';

  const startRebirth = async () => {
    const fullUrl = ensureUrl(url);
    if (!fullUrl) { toast('Cole a URL do site'); return; }

    setLoading(true);
    setStep('scraping');
    setError(null);
    setResult(null);

    const projectId = uid();
    const hostname = safeHostname(fullUrl);
    const project = {
      id: projectId, name: `Rebirth: ${hostname}`,
      type: 'site_rebirth', status: 'scraping', inputUrl: fullUrl,
      inputText: '', inputChannel: '', vibe,
      brandBlueprint: {}, scrapedData: {}, outputContent: {},
      errorMessage: '', notes: '', createdAt: new Date().toISOString(),
    };
    setW4(d => ({ ...d, projects: [project, ...d.projects] }));

    try {
      // Step 1: Scrape
      const { markdown, data: scrapeData } = await callScrape({ url: fullUrl, apiKey: getKey('firecrawl_api_key') });
      setW4(d => ({ ...d, projects: d.projects.map(p => p.id === projectId ? { ...p, scrapedData: scrapeData, status: 'analyzing' } : p) }));

      // Step 2: Brand Analysis
      setStep('analyzing');
      const sysPrompt = buildSystemPrompt('site_rebirth', vibe);
      const analysisRaw = await callLLM({
        apiKey: getKey('openrouter_api_key'),
        model: W4_MODELS.analysis,
        maxTokens: 3000,
        messages: [
          { role: 'system', content: sysPrompt + `\n\nAnalyze this website. Output JSON: {sector, tone_of_voice:[3], color_palette:{primary,secondary,accent}, typography:{display_font,body_font}, sections:[{id,title,rewritten_content}], tagline, weaknesses:[]}. Target vibe: ${vibe}. JSON ONLY.` },
          { role: 'user', content: `URL: ${fullUrl}\n\n${markdown.slice(0, 4000)}` },
        ],
      });

      const { parsed: blueprint } = parseJSON(analysisRaw);
      const bp = blueprint || { raw: analysisRaw };
      setW4(d => ({ ...d, projects: d.projects.map(p => p.id === projectId ? { ...p, brandBlueprint: bp, status: 'generating' } : p) }));

      // Step 3: Generate frontend
      setStep('generating');
      const code = await callLLM({
        apiKey: getKey('openrouter_api_key'),
        model: W4_MODELS.code,
        maxTokens: 6000,
        messages: [
          { role: 'system', content: sysPrompt + `\n\nGenerate a COMPLETE React+Tailwind single-page site. Apply ${W4_VIBES[vibe]?.label || vibe} vibe. Output one App.tsx with ALL components inline. No external imports except React. COMPLETE code.` },
          { role: 'user', content: `Blueprint:\n${JSON.stringify(bp, null, 2).slice(0, 3000)}` },
        ],
      });

      const output = { id: uid(), projectId, type: 'site_code', title: `${hostname} — Rebuilt`, content: code, language: 'tsx', metadata: { vibe, url: fullUrl }, createdAt: new Date().toISOString() };
      setW4(d => ({
        ...d,
        projects: d.projects.map(p => p.id === projectId ? { ...p, outputContent: { code }, status: 'complete' } : p),
        outputs: [output, ...d.outputs],
      }));

      setResult({ blueprint: bp, code });
      toast('Site Rebirth completo');
    } catch (err) {
      const msg = err.message || 'Erro desconhecido';
      setError(msg);
      setW4(d => ({ ...d, projects: d.projects.map(p => p.id === projectId ? { ...p, status: 'error', errorMessage: msg } : p) }));
      toast('Erro: ' + msg.slice(0, 80));
    }
    setStep(null);
    setLoading(false);
  };

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Site Rebirth</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>Cole uma URL e reconstrua o site com padrao $150k agency.</p>

      <Card style={{ marginBottom: 20 }}>
        <SLabel>Input</SLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Inp placeholder="patagon.ai" value={url} onChange={e => setUrl(e.target.value)} style={{ flex: 1 }} onKeyDown={e => { if (e.key === 'Enter' && !loading) startRebirth(); }} />
          <Sel value={vibe} onChange={e => setVibe(e.target.value)} style={{ width: 200 }}>
            {Object.entries(W4_VIBES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Sel>
          <Btn onClick={startRebirth} style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>{loading ? 'Processando...' : 'Iniciar Rebirth'}</Btn>
        </div>
        {step && <p style={{ margin: 0, fontSize: 12, color: '#1a5276', fontWeight: 600 }}>{step === 'scraping' ? '1/3 Scraping...' : step === 'analyzing' ? '2/3 Analisando brand...' : '3/3 Gerando codigo...'}</p>}
        {error && !loading && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#c0392b', background: '#fdf2f2', padding: '8px 12px', borderRadius: 6 }}>{error}</p>}
      </Card>

      {/* Pipeline */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {[['scraping', 'Scrape'], ['analyzing', 'Brand'], ['generating', 'Code']].map(([key, label], i) => {
          const order = ['scraping', 'analyzing', 'generating'];
          const cur = step ? order.indexOf(step) : (result ? 3 : -1);
          const done = cur > i || !!result;
          const active = cur === i;
          return (
            <div key={key} style={{ flex: 1, padding: '8px 12px', borderRadius: 6, background: done ? '#eafaf1' : active ? '#eaf2fb' : '#f4f4f3', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: done ? '#1e8449' : active ? '#1a5276' : '#888' }}>{label}</p>
            </div>
          );
        })}
      </div>

      {result && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <SLabel style={{ margin: 0 }}>Brand Blueprint</SLabel>
              <Btn sm onClick={() => { navigator.clipboard.writeText(JSON.stringify(result.blueprint, null, 2)); toast('Copiado'); }}>Copiar</Btn>
            </div>
            <pre style={{ margin: 0, fontSize: 11, color: '#555', overflow: 'auto', maxHeight: 250, background: '#fafaf8', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(result.blueprint, null, 2)}</pre>
          </Card>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <SLabel style={{ margin: 0 }}>Codigo gerado</SLabel>
              <Btn sm onClick={() => { navigator.clipboard.writeText(result.code); toast('Copiado'); }}>Copiar</Btn>
            </div>
            <pre style={{ margin: 0, fontSize: 11, color: '#555', overflow: 'auto', maxHeight: 400, background: '#fafaf8', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{result.code}</pre>
          </Card>
        </>
      )}
    </div>
  );
}
