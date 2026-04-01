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

  useEffect(() => { return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }; }, [previewUrl]);

  const settings = w4.settings || [];
  const getKey = (k) => settings.find(s => s.key === k)?.value || '';

  const startRebirth = async () => {
    const fullUrl = ensureUrl(url);
    if (!fullUrl) { toast('Cole a URL do site'); return; }

    setLoading(true);
    setStep('scraping');
    setError(null);
    setResult(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }

    const projectId = uid();
    const hostname = safeHostname(fullUrl);

    try {
      // Step 1: Scrape
      const { markdown } = await callScrape({ url: fullUrl, apiKey: getKey('firecrawl_api_key') });

      // Step 2: Brand Analysis
      setStep('analyzing');
      const analysisRaw = await callLLM({
        apiKey: getKey('openrouter_api_key'),
        model: W4_MODELS.analysis,
        maxTokens: 2000,
        messages: [
          { role: 'system', content: `You are a brand strategist. Analyze this website and output ONLY a JSON object with: {sector, tone:[3 words], palette:{primary,secondary,accent}, fonts:{display,body}, tagline, sections:[{id,title,content}]}. Use only approved fonts: Outfit, Cabinet Grotesk, Satoshi, Plus Jakarta Sans. No #000000, use #050505 or #111111. JSON ONLY, no other text.` },
          { role: 'user', content: `${fullUrl}\n\n${markdown.slice(0, 3000)}` },
        ],
      });
      const { parsed: bp } = parseJSON(analysisRaw);
      const blueprint = bp || { sector: 'Tech', tagline: hostname, palette: { primary: '#050505', secondary: '#1A1A1A', accent: '#3B82F6' }, fonts: { display: 'Outfit', body: 'Satoshi' }, sections: [] };

      // Step 3: Generate HTML site (NOT React — pure HTML+Tailwind+AlpineJS)
      setStep('generating');
      const vibeLabel = W4_VIBES[vibe]?.label || vibe;
      const code = await callLLM({
        apiKey: getKey('openrouter_api_key'),
        model: W4_MODELS.code,
        maxTokens: 8000,
        messages: [
          { role: 'system', content: buildSystemPrompt('site_rebirth', vibe) + `

CRITICAL: Generate a COMPLETE standalone HTML page. NOT React. Pure HTML + Tailwind CSS classes + Alpine.js for interactivity.

OUTPUT FORMAT: A complete HTML document starting with <!DOCTYPE html> and ending with </html>. Include:
- <script src="https://cdn.tailwindcss.com"></script>
- <script defer src="https://unpkg.com/alpinejs@3/dist/cdn.min.js"></script>
- Google Fonts link for ${blueprint.fonts?.display || 'Outfit'} and ${blueprint.fonts?.body || 'Satoshi'}
- Tailwind config with custom font families

REQUIRED SECTIONS:
1. Navbar with logo text and navigation links (use Alpine.js x-data for mobile menu toggle)
2. Hero section — ${vibeLabel} vibe. Asymmetric layout. Large headline with tagline. CTA button.
3. Features/Value props section — Bento-style asymmetric grid, NOT 3 equal cards
4. Social proof / case studies section
5. CTA section
6. Footer with links

STYLE: ${vibeLabel} vibe. Colors: primary=${blueprint.palette?.primary || '#050505'}, secondary=${blueprint.palette?.secondary || '#1A1A1A'}, accent=${blueprint.palette?.accent || '#3B82F6'}.
Use the REAL content from the blueprint sections below. No placeholder text. No Lorem Ipsum.
Add hover transitions on all interactive elements. Use fade-in animations via CSS classes.
COMPLETE code from <!DOCTYPE html> to </html>. No truncation. No markdown backticks.` },
          { role: 'user', content: `Brand: ${JSON.stringify(blueprint).slice(0, 2000)}\n\nGenerate the complete HTML page now.` },
        ],
      });

      // Validate
      if (!isCodeComplete(code)) {
        throw new Error('Codigo gerado incompleto. O modelo pode ter excedido o limite de tokens. Tente novamente.');
      }

      // Build preview
      const html = buildPreviewHTML(code, `${hostname} — Rebuilt`);
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
      toast('Site Rebirth completo');
    } catch (err) {
      const msg = err.message || 'Erro desconhecido';
      setError(msg);
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
        {step && <p style={{ margin: 0, fontSize: 12, color: '#1a5276', fontWeight: 600 }}>{step === 'scraping' ? '1/3 Scraping com Firecrawl...' : step === 'analyzing' ? '2/3 Analisando brand...' : '3/3 Gerando site (HTML+Tailwind)...'}</p>}
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
            <SLabel style={{ margin: 0 }}>Codigo fonte ({result.code.length} caracteres)</SLabel>
            <Btn sm onClick={() => { navigator.clipboard.writeText(result.html); toast('HTML completo copiado'); }}>Copiar HTML</Btn>
          </div>
          <pre style={{ margin: 0, fontSize: 11, color: '#555', overflow: 'auto', maxHeight: 300, background: '#fafaf8', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{result.code.slice(0, 3000)}{result.code.length > 3000 ? '\n\n... (truncado para visualizacao — use Copiar para o codigo completo)' : ''}</pre>
        </Card>
      )}
    </div>
  );
}
