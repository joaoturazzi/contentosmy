'use client';
import { useState } from 'react';
import { Card, Inp, Sel, Btn, SLabel, toast } from '../ui';
import { uid } from '@/lib/utils';
import { W4_VIBES, W4_MODELS } from '@/lib/constants';
import { buildSystemPrompt } from '@/lib/w4-system-prompt';

function ensureUrl(raw) {
  let u = raw.trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

function safeHostname(url) {
  try { return new URL(url).hostname; } catch { return url.replace(/^https?:\/\//, '').split('/')[0]; }
}

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
      const scrapeRes = await fetch('/api/w4/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fullUrl, apiKey: getKey('firecrawl_api_key') }),
      });
      const scrapeData = await scrapeRes.json();
      if (scrapeData.error) throw new Error(typeof scrapeData.error === 'string' ? scrapeData.error : scrapeData.error.message || 'Scrape failed');

      const markdown = scrapeData.scrape?.data?.markdown || scrapeData.scrape?.markdown || '';
      if (!markdown) throw new Error('Nenhum conteudo extraido do site. Verifique a URL.');

      setW4(d => ({ ...d, projects: d.projects.map(p => p.id === projectId ? { ...p, scrapedData: scrapeData, status: 'analyzing' } : p) }));

      // Step 2: Brand Analysis
      setStep('analyzing');
      const analysisRes = await fetch('/api/w4/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: getKey('openrouter_api_key'),
          model: W4_MODELS.analysis,
          maxTokens: 4096,
          messages: [
            { role: 'system', content: buildSystemPrompt('site_rebirth', vibe) + `\n\nTASK: Analyze this website and produce a JSON brand_blueprint. Fields: sector (string), tone_of_voice (array of 3 adjectives), color_palette {primary, secondary, accent} (hex codes, no pure black, no neon purple), typography {display_font, body_font} (ONLY from: Geist, Outfit, Cabinet Grotesk, Satoshi, Clash Display, Plus Jakarta Sans), sections (array of {id, title, rewritten_content}), tagline (string), weaknesses (array of current design flaws), vibe_recommendation (string). Target vibe: ${vibe}. Output ONLY valid JSON, no markdown.` },
            { role: 'user', content: `URL: ${fullUrl}\n\nContent:\n${markdown.slice(0, 6000)}` },
          ],
        }),
      });
      const analysisData = await analysisRes.json();
      if (analysisData.error) throw new Error(typeof analysisData.error === 'string' ? analysisData.error : analysisData.error.message || 'Analysis failed');

      const analysisContent = analysisData.choices?.[0]?.message?.content || '';
      let blueprint = {};
      try {
        const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) blueprint = JSON.parse(jsonMatch[0]);
      } catch {
        blueprint = { raw: analysisContent, parseError: true };
      }

      setW4(d => ({ ...d, projects: d.projects.map(p => p.id === projectId ? { ...p, brandBlueprint: blueprint, status: 'generating' } : p) }));

      // Step 3: Generate frontend
      setStep('generating');
      const codeRes = await fetch('/api/w4/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: getKey('openrouter_api_key'),
          model: W4_MODELS.code,
          maxTokens: 8192,
          messages: [
            { role: 'system', content: buildSystemPrompt('site_rebirth', vibe) + `\n\nTASK: Generate a COMPLETE React + Tailwind CSS single-page site. Use the brand blueprint content below. Apply ${W4_VIBES[vibe]?.label || vibe} vibe. Output a single App.tsx with ALL components inline. No imports from external packages except React. Use only Tailwind classes. COMPLETE code, no truncation, no placeholders.` },
            { role: 'user', content: `Brand Blueprint:\n${JSON.stringify(blueprint, null, 2)}` },
          ],
        }),
      });
      const codeData = await codeRes.json();
      if (codeData.error) throw new Error(typeof codeData.error === 'string' ? codeData.error : codeData.error.message || 'Code generation failed');

      const generatedCode = codeData.choices?.[0]?.message?.content || '';

      const output = {
        id: uid(), projectId, type: 'site_code',
        title: `${hostname} — Rebuilt`, content: generatedCode,
        language: 'tsx', metadata: { vibe, url: fullUrl },
        createdAt: new Date().toISOString(),
      };

      setW4(d => ({
        ...d,
        projects: d.projects.map(p => p.id === projectId ? { ...p, outputContent: { code: generatedCode }, status: 'complete' } : p),
        outputs: [output, ...d.outputs],
      }));

      setResult({ blueprint, code: generatedCode });
      toast('Site Rebirth completo');
    } catch (err) {
      const msg = err.message || 'Erro desconhecido';
      setError(msg);
      setW4(d => ({ ...d, projects: d.projects.map(p => p.id === projectId ? { ...p, status: 'error', errorMessage: msg } : p) }));
      toast('Erro: ' + msg);
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
          <Inp placeholder="patagon.ai ou https://site.com" value={url} onChange={e => setUrl(e.target.value)} style={{ flex: 1 }} />
          <Sel value={vibe} onChange={e => setVibe(e.target.value)} style={{ width: 200 }}>
            {Object.entries(W4_VIBES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Sel>
          <Btn onClick={startRebirth} style={{ opacity: loading ? 0.6 : 1 }}>{loading ? 'Processando...' : 'Iniciar Rebirth'}</Btn>
        </div>
        {step && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6, background: '#eaf2fb' }}>
            <span style={{ fontSize: 12, color: '#1a5276', fontWeight: 600 }}>
              {step === 'scraping' ? 'Passo 1/3 — Scraping site com Firecrawl...' : step === 'analyzing' ? 'Passo 2/3 — Analisando brand com DeepSeek...' : 'Passo 3/3 — Gerando frontend com Qwen...'}
            </span>
          </div>
        )}
        {error && !loading && (
          <div style={{ padding: '8px 12px', borderRadius: 6, background: '#fdf2f2', marginTop: 8 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#c0392b' }}>{error}</p>
          </div>
        )}
      </Card>

      {/* Pipeline */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {[['scraping', 'Scrape'], ['analyzing', 'Brand Analysis'], ['generating', 'Code Gen']].map(([key, label], i) => {
          const stepOrder = ['scraping', 'analyzing', 'generating'];
          const curIdx = step ? stepOrder.indexOf(step) : (result ? 3 : -1);
          const done = curIdx > i || !!result;
          const active = curIdx === i;
          return (
            <div key={key} style={{ flex: 1, padding: '8px 12px', borderRadius: 6, background: done ? '#eafaf1' : active ? '#eaf2fb' : '#f4f4f3', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: done ? '#1e8449' : active ? '#1a5276' : '#aaa' }}>{done ? 'Concluido' : active ? 'Executando...' : `Passo ${i + 1}`}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: done ? '#1e8449' : active ? '#1a5276' : '#888' }}>{label}</p>
            </div>
          );
        })}
      </div>

      {result && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <SLabel>Brand Blueprint</SLabel>
            {result.blueprint.parseError && <p style={{ margin: '0 0 8px', fontSize: 12, color: '#d68910' }}>Aviso: JSON parcialmente parseado. O resultado pode estar incompleto.</p>}
            <pre style={{ margin: 0, fontSize: 11, color: '#555', overflow: 'auto', maxHeight: 300, background: '#fafaf8', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(result.blueprint, null, 2)}
            </pre>
          </Card>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <SLabel style={{ margin: 0 }}>Codigo gerado</SLabel>
              <Btn sm onClick={() => { navigator.clipboard.writeText(result.code); toast('Codigo copiado para clipboard'); }}>Copiar</Btn>
            </div>
            <pre style={{ margin: 0, fontSize: 11, color: '#555', overflow: 'auto', maxHeight: 400, background: '#fafaf8', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {result.code}
            </pre>
          </Card>
        </>
      )}
    </div>
  );
}
