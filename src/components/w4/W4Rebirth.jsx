'use client';
import { useState, useEffect } from 'react';
import { Card, Inp, Sel, Btn, SLabel, toast } from '../ui';
import { uid } from '@/lib/utils';
import { W4_VIBES, W4_MODELS } from '@/lib/constants';
import { buildSystemPrompt } from '@/lib/w4-system-prompt';
import { callLLM, callScrape, parseJSON, ensureUrl, safeHostname } from '@/lib/w4-api';
import { buildPreviewHTML, downloadHTML, isCodeComplete } from '@/lib/w4-preview';

export default function W4Rebirth({ w4, setW4 }) {
  const [url, setUrl] = useState('');
  const [vibe, setVibe] = useState('ethereal_glass');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [debug, setDebug] = useState('');

  useEffect(() => { return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }; }, [previewUrl]);

  const settings = w4.settings || [];
  const getKey = (k) => settings.find(s => s.key === k)?.value || '';
  const orKey = getKey('openrouter_api_key');
  const fcKey = getKey('firecrawl_api_key');

  const log = (msg) => {
    console.log(`[W4 Rebirth] ${msg}`);
    setDebug(d => d + '\n' + msg);
  };

  const testConnection = async () => {
    setDebug('');
    log(`Settings count: ${settings.length}`);
    log(`OpenRouter key: ${orKey ? orKey.slice(0, 8) + '...' + orKey.slice(-4) : 'EMPTY'}`);
    log(`Firecrawl key: ${fcKey ? fcKey.slice(0, 8) + '...' + fcKey.slice(-4) : 'EMPTY'}`);

    if (!orKey) {
      log('ERROR: OpenRouter key not found in w4.settings. Go to Config and save it.');
      return;
    }

    try {
      log('Testing OpenRouter direct call...');
      const content = await callLLM({
        apiKey: orKey,
        model: 'deepseek/deepseek-chat',
        maxTokens: 50,
        messages: [{ role: 'user', content: 'Reply with just "OK"' }],
      });
      log(`OpenRouter response: "${content}"`);
      log('SUCCESS: OpenRouter is working!');
    } catch (err) {
      log(`ERROR: ${err.message}`);
    }
  };

  const startRebirth = async () => {
    const fullUrl = ensureUrl(url);
    if (!fullUrl) { toast('Cole a URL do site'); return; }
    if (!orKey) { toast('Configure a OpenRouter API key na aba Config'); return; }

    setLoading(true);
    setStep('scraping');
    setError(null);
    setResult(null);
    setDebug('');
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }

    const projectId = uid();
    const hostname = safeHostname(fullUrl);
    log(`Starting rebirth for ${hostname}`);
    log(`Vibe: ${vibe}`);
    log(`OpenRouter key present: ${!!orKey}`);

    try {
      // Step 1: Scrape
      log('Step 1: Scraping with Firecrawl...');
      const { markdown } = await callScrape({ url: fullUrl, apiKey: fcKey });
      log(`Scrape done: ${markdown.length} chars`);

      // Step 2: Brand Analysis
      setStep('analyzing');
      log('Step 2: Brand analysis with Gemini Flash (direct browser call)...');
      const analysisRaw = await callLLM({
        apiKey: orKey,
        model: W4_MODELS.analysis,
        maxTokens: 2000,
        messages: [
          { role: 'system', content: `You are a brand strategist. Analyze this website and output ONLY a JSON object with: {sector, tone:[3 words], palette:{primary,secondary,accent}, fonts:{display,body}, tagline, sections:[{id,title,content}]}. Use only approved fonts: Outfit, Cabinet Grotesk, Satoshi, Plus Jakarta Sans. No #000000, use #050505 or #111111. JSON ONLY, no other text.` },
          { role: 'user', content: `${fullUrl}\n\n${markdown.slice(0, 3000)}` },
        ],
      });
      log(`Brand analysis done: ${analysisRaw.length} chars`);
      const { parsed: bp } = parseJSON(analysisRaw);
      const blueprint = bp || { sector: 'Tech', tagline: hostname, palette: { primary: '#050505', secondary: '#1A1A1A', accent: '#3B82F6' }, fonts: { display: 'Outfit', body: 'Satoshi' }, sections: [] };
      log(`Blueprint parsed: sector=${blueprint.sector}, sections=${blueprint.sections?.length || 0}`);

      // Step 3: Generate HTML site
      setStep('generating');
      const vibeLabel = W4_VIBES[vibe]?.label || vibe;
      const pri = blueprint.palette?.primary || '#050505';
      const sec = blueprint.palette?.secondary || '#1A1A1A';
      const acc = blueprint.palette?.accent || '#3B82F6';
      const dFont = (blueprint.fonts?.display || 'Outfit').replace(/ /g, '+');
      const bFont = (blueprint.fonts?.body || 'Satoshi').replace(/ /g, '+');
      log(`Step 3: Generating HTML with Gemini Flash (maxTokens=8000)...`);

      const code = await callLLM({
        apiKey: orKey,
        model: W4_MODELS.code,
        maxTokens: 8000,
        messages: [
          { role: 'system', content: buildSystemPrompt('site_rebirth', vibe) + `

Generate a COMPLETE standalone HTML page. Pure HTML + Tailwind CSS + Alpine.js.

MANDATORY <head> includes (copy exactly):
<script src="https://cdn.tailwindcss.com"></script>
<script defer src="https://unpkg.com/alpinejs@3/dist/cdn.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=${dFont}:wght@400;500;600;700;800&family=${bFont}:wght@400;500;600;700&display=swap" rel="stylesheet">
<script>tailwind.config={theme:{extend:{colors:{primary:'${pri}',secondary:'${sec}',accent:'${acc}'},fontFamily:{sans:['${blueprint.fonts?.display || 'Outfit'}','${blueprint.fonts?.body || 'Satoshi'}','system-ui']}}}}</script>

Use Tailwind utility classes with these custom colors: bg-primary, bg-secondary, bg-accent, text-primary, text-accent, etc.
Background: bg-primary (${pri}). Text: text-white. Accent: text-accent (${acc}).

REQUIRED SECTIONS:
1. Navbar — fixed, backdrop-blur, logo + nav links + accent CTA, Alpine.js x-data mobile menu
2. Hero — min-h-[100dvh], ${vibeLabel} vibe, asymmetric (text left 60%, visual right 40%), large headline, tagline, CTA button
3. Features — bento-style grid (NOT 3 equal cards), 4 items with icons, descriptions
4. Social proof / stats section
5. CTA section with accent background
6. Footer with links

MUST include: hover:scale-105 on cards, transition-all duration-300, smooth scroll, responsive (mobile collapse).
Use REAL content from the brand data. No Lorem Ipsum.
Start with <!DOCTYPE html> end with </html>. No markdown backticks.` },
          { role: 'user', content: `Brand: ${JSON.stringify(blueprint).slice(0, 2000)}\n\nGenerate the complete premium HTML page.` },
        ],
      });
      log(`Code generation done: ${code.length} chars`);
      log(`Code starts with: ${code.slice(0, 50)}...`);
      log(`Code ends with: ...${code.slice(-50)}`);

      // Validate
      if (!isCodeComplete(code)) {
        log('WARNING: Code appears incomplete');
        // Don't throw — still try to render what we got
      }

      // Build preview
      const html = buildPreviewHTML(code, `${hostname} — Rebuilt`);
      log(`Preview HTML: ${html.length} chars`);
      const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));

      // Save
      const outputId = uid();
      const output = { id: outputId, projectId, type: 'site_code', title: `${hostname} — Rebuilt (${vibeLabel})`, content: code, language: 'html', metadata: { vibe, url: fullUrl }, createdAt: new Date().toISOString() };
      const project = {
        id: projectId, name: `Rebirth: ${hostname}`, type: 'site_rebirth', status: 'complete',
        inputUrl: fullUrl, inputText: '', inputChannel: '', vibe,
        brandBlueprint: blueprint, scrapedData: {}, outputContent: { code },
        errorMessage: '', notes: '', createdAt: new Date().toISOString(),
      };
      setW4(d => ({ ...d, projects: [project, ...d.projects], outputs: [output, ...d.outputs] }));

      setResult({ blueprint, code, html });
      setPreviewUrl(blobUrl);
      log('DONE! Site rebirth complete.');
      toast('Site Rebirth completo');
    } catch (err) {
      const msg = err.message || 'Erro desconhecido';
      log(`ERROR: ${msg}`);
      setError(msg);
      toast('Erro: ' + msg.slice(0, 80));
    }
    setStep(null);
    setLoading(false);
  };

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Site Rebirth</h1>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#888' }}>Cole uma URL e reconstrua o site com padrao $150k agency.</p>

      {/* Status indicators */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, fontSize: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: fcKey ? '#1e8449' : '#c0392b' }} />
          Firecrawl {fcKey ? '(salvo)' : '(sem key)'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: orKey ? '#1e8449' : '#c0392b' }} />
          OpenRouter {orKey ? `(salvo — ${orKey.slice(0, 6)}...)` : '(sem key — configure na Config)'}
        </span>
        <button onClick={testConnection} style={{ fontSize: 11, color: '#1a5276', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Testar conexao</button>
      </div>

      <Card style={{ marginBottom: 20 }}>
        <SLabel>Input</SLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Inp placeholder="patagon.ai" value={url} onChange={e => setUrl(e.target.value)} style={{ flex: 1 }} onKeyDown={e => { if (e.key === 'Enter' && !loading) startRebirth(); }} />
          <Sel value={vibe} onChange={e => setVibe(e.target.value)} style={{ width: 200 }}>
            {Object.entries(W4_VIBES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Sel>
          <Btn onClick={startRebirth} style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>{loading ? 'Processando...' : 'Iniciar Rebirth'}</Btn>
        </div>
        {step && <p style={{ margin: 0, fontSize: 12, color: '#1a5276', fontWeight: 600 }}>{step === 'scraping' ? '1/3 Scraping com Firecrawl...' : step === 'analyzing' ? '2/3 Analisando brand (DeepSeek)...' : '3/3 Gerando HTML (Qwen — aguarde ~30s)...'}</p>}
        {error && !loading && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#c0392b', background: '#fdf2f2', padding: '8px 12px', borderRadius: 6 }}>{error}</p>}
      </Card>

      {/* Pipeline */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {[['scraping', 'Scrape'], ['analyzing', 'Brand'], ['generating', 'HTML']].map(([key, label], i) => {
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

      {/* Debug log */}
      {debug && (
        <Card style={{ marginBottom: 16, background: '#fafaf8' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <SLabel style={{ margin: 0 }}>Debug Log</SLabel>
            <button onClick={() => setDebug('')} style={{ fontSize: 11, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>Limpar</button>
          </div>
          <pre style={{ margin: 0, fontSize: 10, color: '#555', overflow: 'auto', maxHeight: 150, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{debug.trim()}</pre>
        </Card>
      )}

      {/* PREVIEW */}
      {previewUrl && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <SLabel style={{ margin: 0 }}>Preview do site</SLabel>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn sm onClick={() => { const w = window.open('', '_blank'); w.document.write(result.html); w.document.close(); }}>Abrir em nova aba</Btn>
              <Btn sm variant="ghost" onClick={() => downloadHTML(result.html, `${safeHostname(url)}-rebirth.html`)}>Download HTML</Btn>
            </div>
          </div>
          <div style={{ border: '1px solid #eceae5', borderRadius: 8, overflow: 'hidden' }}>
            <iframe
              src={previewUrl}
              style={{ width: '100%', height: 600, border: 'none' }}
              title="Site Preview"
              sandbox="allow-scripts"
            />
          </div>
        </Card>
      )}

      {result && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <SLabel style={{ margin: 0 }}>Codigo ({result.code.length} chars)</SLabel>
            <Btn sm onClick={() => { navigator.clipboard.writeText(result.html); toast('HTML copiado'); }}>Copiar HTML</Btn>
          </div>
          <pre style={{ margin: 0, fontSize: 11, color: '#555', overflow: 'auto', maxHeight: 250, background: '#fafaf8', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{result.code.slice(0, 2000)}{result.code.length > 2000 ? '\n...' : ''}</pre>
        </Card>
      )}
    </div>
  );
}
