'use client';
import { useState, useEffect } from 'react';
import { Card, Inp, Txa, Sel, Btn, SLabel, Empty, toast } from '../ui';
import { uid } from '@/lib/utils';
import { W4_MODELS } from '@/lib/constants';
import { buildSystemPrompt } from '@/lib/w4-system-prompt';

export default function W4Brand({ w4, setW4 }) {
  const [mode, setMode] = useState('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(null);
  const [result, setResult] = useState(null);
  const [envKeys, setEnvKeys] = useState({ firecrawl: false, openrouter: false });

  const settings = w4.settings || [];
  const getKey = (k) => settings.find(s => s.key === k)?.value || '';
  const firecrawlKey = getKey('firecrawl_api_key');
  const openrouterKey = getKey('openrouter_api_key');

  useEffect(() => { fetch('/api/w4/keys').then(r => r.json()).then(setEnvKeys).catch(() => {}); }, []);

  const startAudit = async () => {
    if (mode === 'url' && !url.trim()) { toast('Cole a URL'); return; }
    if (mode === 'text' && !text.trim()) { toast('Descreva a marca'); return; }
    if (!openrouterKey && !envKeys.openrouter) { toast('Configure a OpenRouter API key'); return; }

    const projectId = uid();
    const project = {
      id: projectId, name: mode === 'url' ? `Brand: ${new URL(url).hostname}` : `Brand: ${text.slice(0, 30)}...`,
      type: 'brand_audit', status: 'analyzing', inputUrl: mode === 'url' ? url : '',
      inputText: mode === 'text' ? text : '', inputChannel: '', vibe: '',
      brandBlueprint: {}, scrapedData: {}, outputContent: {},
      errorMessage: '', notes: '', createdAt: new Date().toISOString(),
    };
    setW4(d => ({ ...d, projects: [project, ...d.projects] }));
    setLoading(true);

    try {
      let content = text;

      // Step 1: Scrape if URL
      if (mode === 'url') {
        if (!firecrawlKey && !envKeys.firecrawl) { toast('Configure Firecrawl API key para scraping'); return; }
        setStep('scraping');
        const res = await fetch('/api/w4/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, apiKey: firecrawlKey || '' }),
        });
        const data = await res.json();
        content = data.scrape?.data?.markdown || '';
        setW4(d => ({ ...d, projects: d.projects.map(p => p.id === projectId ? { ...p, scrapedData: data } : p) }));
      }

      // Step 2: Brand Book
      setStep('analyzing');
      const res = await fetch('/api/w4/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: openrouterKey || '',
          model: W4_MODELS.analysis,
          maxTokens: 4096,
          messages: [
            { role: 'system', content: buildSystemPrompt('brand_audit') + `\n\nTASK: Create a complete Brand Book 2.0 in JSON with these fields: sector, positioning (1-2 sentences), primary_palette [{name, hex, usage}] (3 colors, max 1 accent, saturation<80%), expanded_palette [{name, hex, usage}] (6 colors with hex+RGB+HSL), typography {display_font, body_font} (from approved fonts ONLY), tone_of_voice {adjectives: [3], dos: [5 example phrases], donts: [5 example phrases]}, moodboard [{reference, description}] (5 items), tagline + 2 variations, social_slogan, brand_tokens {colors_rgb, colors_hsl, font_stacks, type_scale, spacing_scale, radius_scale, shadow_scale}. Output ONLY valid JSON.` },
            { role: 'user', content: `Brand input:\n${content.slice(0, 6000)}` },
          ],
        }),
      });
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || '';

      let brandBook = {};
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) brandBook = JSON.parse(jsonMatch[0]);
      } catch { brandBook = { raw }; }

      // Step 3: Image prompts
      setStep('generating');
      const imgRes = await fetch('/api/w4/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: openrouterKey || '',
          model: W4_MODELS.creative,
          maxTokens: 1024,
          messages: [
            { role: 'system', content: 'Generate 3 optimized image generation prompts based on this brand book. Output JSON array: [{type: "logo_mockup"|"social_banner"|"presentation_card", prompt: "detailed prompt for FLUX image model"}]' },
            { role: 'user', content: JSON.stringify(brandBook) },
          ],
        }),
      });
      const imgData = await imgRes.json();
      const imgPromptsRaw = imgData.choices?.[0]?.message?.content || '[]';
      let imagePrompts = [];
      try {
        const match = imgPromptsRaw.match(/\[[\s\S]*\]/);
        if (match) imagePrompts = JSON.parse(match[0]);
      } catch {}

      // Save
      const output = {
        id: uid(), projectId, type: 'brand_book',
        title: project.name, content: JSON.stringify({ brandBook, imagePrompts }, null, 2),
        language: 'json', metadata: { mode, imagePrompts },
        createdAt: new Date().toISOString(),
      };

      setW4(d => ({
        ...d,
        projects: d.projects.map(p => p.id === projectId ? { ...p, brandBlueprint: brandBook, outputContent: { brandBook, imagePrompts }, status: 'complete' } : p),
        outputs: [output, ...d.outputs],
      }));

      setResult({ brandBook, imagePrompts });
      setStep(null);
      toast('Brand Audit completo');
    } catch (err) {
      setW4(d => ({ ...d, projects: d.projects.map(p => p.id === projectId ? { ...p, status: 'error', errorMessage: err.message } : p) }));
      toast('Erro: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Brand Evolution Audit</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>Envie URL, logo ou descricao para gerar um Brand Book completo.</p>

      <Card style={{ marginBottom: 20 }}>
        <SLabel>Modo de input</SLabel>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[['url', 'URL do site'], ['text', 'Descricao em texto']].map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)} style={{ fontSize: 12, padding: '5px 14px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, background: mode === k ? '#1a1a1a' : 'transparent', color: mode === k ? '#fff' : '#888', border: `1px solid ${mode === k ? '#1a1a1a' : '#e0e0de'}`, fontFamily: 'inherit' }}>{l}</button>
          ))}
        </div>

        {mode === 'url' && <Inp placeholder="https://marca.com" value={url} onChange={e => setUrl(e.target.value)} style={{ marginBottom: 12 }} />}
        {mode === 'text' && <Txa placeholder="Descreva a marca: setor, publico-alvo, tom, valores..." value={text} onChange={e => setText(e.target.value)} rows={4} style={{ marginBottom: 12 }} />}

        <Btn onClick={startAudit} style={{ opacity: loading ? 0.6 : 1 }}>{loading ? 'Processando...' : 'Gerar Brand Book'}</Btn>
        {step && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#3498DB' }}>{step === 'scraping' ? 'Scraping site...' : step === 'analyzing' ? 'Gerando brand book...' : 'Criando prompts de imagem...'}</p>}
      </Card>

      {result && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <SLabel>Brand Book</SLabel>
            {result.brandBook.sector && <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>Setor: {result.brandBook.sector}</p>}
            {result.brandBook.tagline && <p style={{ margin: '0 0 12px', fontSize: 16, fontStyle: 'italic', color: '#555' }}>"{result.brandBook.tagline}"</p>}

            {result.brandBook.primary_palette && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#aaa' }}>Paleta Primaria</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {result.brandBook.primary_palette.map((c, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 8, background: c.hex, border: '1px solid #eceae5' }} />
                      <p style={{ margin: '4px 0 0', fontSize: 10, color: '#888' }}>{c.hex}</p>
                      <p style={{ margin: 0, fontSize: 10, color: '#aaa' }}>{c.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <pre style={{ margin: 0, fontSize: 11, color: '#555', overflow: 'auto', maxHeight: 300, background: '#fafaf8', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(result.brandBook, null, 2)}
            </pre>
            <Btn style={{ marginTop: 8 }} sm onClick={() => { navigator.clipboard.writeText(JSON.stringify(result.brandBook, null, 2)); toast('Brand book copiado'); }}>Copiar JSON</Btn>
          </Card>

          {result.imagePrompts?.length > 0 && (
            <Card>
              <SLabel>Prompts de Imagem (FLUX Schnell)</SLabel>
              {result.imagePrompts.map((p, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f5f4f1' }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#888' }}>{p.type}</p>
                  <p style={{ margin: '2px 0', fontSize: 13, color: '#555' }}>{p.prompt}</p>
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
