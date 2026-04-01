'use client';
import { useState, useEffect } from 'react';
import { Card, Inp, Sel, Btn, SLabel, Empty, toast } from '../ui';
import { uid } from '@/lib/utils';
import { W4_VIBES, W4_STATUS, W4_MODELS } from '@/lib/constants';
import { buildSystemPrompt } from '@/lib/w4-system-prompt';

export default function W4Rebirth({ w4, setW4 }) {
  const [url, setUrl] = useState('');
  const [vibe, setVibe] = useState('ethereal_glass');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(null);
  const [result, setResult] = useState(null);
  const [envKeys, setEnvKeys] = useState({ firecrawl: false, openrouter: false });

  const settings = w4.settings || [];
  const getKey = (k) => settings.find(s => s.key === k)?.value || '';
  const firecrawlKey = getKey('firecrawl_api_key');
  const openrouterKey = getKey('openrouter_api_key');

  // Check env vars on mount
  useEffect(() => {
    fetch('/api/w4/keys').then(r => r.json()).then(setEnvKeys).catch(() => {});
  }, []);

  const hasFirecrawl = firecrawlKey || envKeys.firecrawl;
  const hasOpenRouter = openrouterKey || envKeys.openrouter;

  const startRebirth = async () => {
    if (!url.trim()) { toast('Cole a URL do site'); return; }
    if (!hasFirecrawl) { toast('Configure a Firecrawl API key (Config ou .env.local)'); return; }
    if (!hasOpenRouter) { toast('Configure a OpenRouter API key (Config ou .env.local)'); return; }

    const projectId = uid();
    const project = {
      id: projectId, name: `Rebirth: ${new URL(url).hostname}`,
      type: 'site_rebirth', status: 'scraping', inputUrl: url,
      inputText: '', inputChannel: '', vibe,
      brandBlueprint: {}, scrapedData: {}, outputContent: {},
      errorMessage: '', notes: '', createdAt: new Date().toISOString(),
    };
    setW4(d => ({ ...d, projects: [project, ...d.projects] }));
    setLoading(true);

    try {
      // Step 1: Scrape
      setStep('scraping');
      const scrapeRes = await fetch('/api/w4/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, apiKey: firecrawlKey || '' }),
      });
      const scrapeData = await scrapeRes.json();
      if (scrapeData.error) throw new Error(scrapeData.error);

      setW4(d => ({
        ...d,
        projects: d.projects.map(p => p.id === projectId
          ? { ...p, scrapedData: scrapeData, status: 'analyzing' }
          : p
        ),
      }));

      // Step 2: Brand Analysis
      setStep('analyzing');
      const markdown = scrapeData.scrape?.data?.markdown || scrapeData.scrape?.markdown || '';
      const analysisRes = await fetch('/api/w4/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: openrouterKey || '',
          model: W4_MODELS.analysis,
          maxTokens: 4096,
          messages: [
            { role: 'system', content: buildSystemPrompt('site_rebirth', vibe) + `\n\nTASK: Analyze the scraped website content and produce a JSON brand_blueprint with these exact fields: sector, tone_of_voice (3 adjectives), color_palette (primary, secondary, accent — hex codes), typography (display_font, body_font from approved fonts only), sections (array of {id, title, rewritten_content}), tagline, weaknesses (array of current design flaws), vibe_recommendation. Target vibe: ${vibe}. Apply redesign-skill red flags detection. Output ONLY valid JSON.` },
            { role: 'user', content: `Website URL: ${url}\n\nScraped content:\n${markdown.slice(0, 6000)}` },
          ],
        }),
      });
      const analysisData = await analysisRes.json();
      if (analysisData.error) throw new Error(analysisData.error?.message || analysisData.error);
      const analysisContent = analysisData.choices?.[0]?.message?.content || '';

      let blueprint = {};
      try {
        const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) blueprint = JSON.parse(jsonMatch[0]);
        if (!blueprint.sector && !blueprint.sections) throw new Error('Invalid blueprint structure');
      } catch {
        blueprint = { raw: analysisContent, sector: 'Unknown', sections: [], weaknesses: [], tagline: '', parseError: true };
      }

      setW4(d => ({
        ...d,
        projects: d.projects.map(p => p.id === projectId
          ? { ...p, brandBlueprint: blueprint, status: 'generating' }
          : p
        ),
      }));

      // Step 3: Generate frontend code
      setStep('generating');
      const codeRes = await fetch('/api/w4/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: openrouterKey || '',
          model: W4_MODELS.code,
          maxTokens: 8192,
          messages: [
            { role: 'system', content: buildSystemPrompt('site_rebirth', vibe) + `\n\nTASK: Generate a complete React + Tailwind CSS single-page site based on the brand blueprint. Apply ${W4_VIBES[vibe]?.label || vibe} vibe archetype with all soft-skill patterns. Output a single complete App.tsx file with all components inline.` },
            { role: 'user', content: `Brand Blueprint:\n${JSON.stringify(blueprint, null, 2)}\n\nGenerate the complete App.tsx file.` },
          ],
        }),
      });
      const codeData = await codeRes.json();
      if (codeData.error) throw new Error(codeData.error?.message || codeData.error);
      const generatedCode = codeData.choices?.[0]?.message?.content || '';

      const output = {
        id: uid(), projectId, type: 'site_code',
        title: `${new URL(url).hostname} — Rebuilt`, content: generatedCode,
        language: 'tsx', metadata: { vibe, url },
        createdAt: new Date().toISOString(),
      };

      setW4(d => ({
        ...d,
        projects: d.projects.map(p => p.id === projectId
          ? { ...p, outputContent: { code: generatedCode }, status: 'complete' }
          : p
        ),
        outputs: [output, ...d.outputs],
      }));

      setResult({ blueprint, code: generatedCode });
      setStep(null);
      toast('Site Rebirth completo');
    } catch (err) {
      setW4(d => ({
        ...d,
        projects: d.projects.map(p => p.id === projectId
          ? { ...p, status: 'error', errorMessage: err.message }
          : p
        ),
      }));
      toast('Erro: ' + err.message);
      setStep(null);
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Site Rebirth</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>Cole uma URL e reconstrua o site com padrao $150k agency.</p>

      {/* API status inline */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, fontSize: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: hasFirecrawl ? '#1e8449' : '#c0392b' }} />
          Firecrawl {hasFirecrawl ? (firecrawlKey ? '(salvo)' : '(env)') : 'pendente'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: hasOpenRouter ? '#1e8449' : '#c0392b' }} />
          OpenRouter {hasOpenRouter ? (openrouterKey ? '(salvo)' : '(env)') : 'pendente'}
        </span>
      </div>

      <Card style={{ marginBottom: 20 }}>
        <SLabel>Input</SLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Inp placeholder="https://site-alvo.com" value={url} onChange={e => setUrl(e.target.value)} style={{ flex: 1 }} />
          <Sel value={vibe} onChange={e => setVibe(e.target.value)} style={{ width: 200 }}>
            {Object.entries(W4_VIBES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Sel>
          <Btn onClick={startRebirth} style={{ opacity: loading ? 0.6 : 1 }}>{loading ? 'Processando...' : 'Iniciar Rebirth'}</Btn>
        </div>
        {step && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6, background: '#eaf2fb' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3498DB', animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: 12, color: '#1a5276', fontWeight: 600 }}>
              {step === 'scraping' && 'Scraping site com Firecrawl...'}
              {step === 'analyzing' && 'Analisando brand com DeepSeek...'}
              {step === 'generating' && 'Gerando frontend com Qwen...'}
            </span>
          </div>
        )}
      </Card>

      {/* Pipeline steps */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {['Scrape', 'Brand Analysis', 'Code Gen'].map((s, i) => {
          const stepMap = ['scraping', 'analyzing', 'generating'];
          const idx = step ? stepMap.indexOf(step) : (result ? 3 : -1);
          const done = idx > i || result;
          const active = idx === i;
          return (
            <div key={s} style={{ flex: 1, padding: '8px 12px', borderRadius: 6, background: done ? '#eafaf1' : active ? '#eaf2fb' : '#f4f4f3', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: done ? '#1e8449' : active ? '#1a5276' : '#aaa' }}>
                {done ? 'Done' : active ? 'Running' : `Step ${i + 1}`}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: done ? '#1e8449' : active ? '#1a5276' : '#888' }}>{s}</p>
            </div>
          );
        })}
      </div>

      {/* Result */}
      {result && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <SLabel>Brand Blueprint</SLabel>
            <pre style={{ margin: 0, fontSize: 11, color: '#555', overflow: 'auto', maxHeight: 300, background: '#fafaf8', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(result.blueprint, null, 2)}
            </pre>
          </Card>
          <Card>
            <SLabel>Generated Code</SLabel>
            <pre style={{ margin: 0, fontSize: 11, color: '#555', overflow: 'auto', maxHeight: 400, background: '#fafaf8', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {result.code}
            </pre>
            <Btn style={{ marginTop: 12 }} onClick={() => { navigator.clipboard.writeText(result.code); toast('Codigo copiado'); }}>Copiar codigo</Btn>
          </Card>
        </>
      )}
    </div>
  );
}
