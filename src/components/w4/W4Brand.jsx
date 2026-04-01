'use client';
import { useState } from 'react';
import { Card, Inp, Txa, Btn, SLabel, toast } from '../ui';
import { uid } from '@/lib/utils';
import { W4_MODELS } from '@/lib/constants';
import { buildSystemPrompt } from '@/lib/w4-system-prompt';

function ensureUrl(raw) {
  let u = raw.trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

export default function W4Brand({ w4, setW4 }) {
  const [mode, setMode] = useState('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const settings = w4.settings || [];
  const getKey = (k) => settings.find(s => s.key === k)?.value || '';

  const startAudit = async () => {
    if (mode === 'url' && !url.trim()) { toast('Cole a URL'); return; }
    if (mode === 'text' && !text.trim()) { toast('Descreva a marca'); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    const fullUrl = mode === 'url' ? ensureUrl(url) : '';
    const projectId = uid();
    const hostname = fullUrl ? fullUrl.replace(/^https?:\/\//, '').split('/')[0] : text.slice(0, 30);
    const project = {
      id: projectId, name: `Brand: ${hostname}`,
      type: 'brand_audit', status: 'analyzing', inputUrl: fullUrl,
      inputText: mode === 'text' ? text : '', inputChannel: '', vibe: '',
      brandBlueprint: {}, scrapedData: {}, outputContent: {},
      errorMessage: '', notes: '', createdAt: new Date().toISOString(),
    };
    setW4(d => ({ ...d, projects: [project, ...d.projects] }));

    try {
      let content = text;

      // Step 1: Scrape if URL
      if (mode === 'url') {
        setStep('scraping');
        const res = await fetch('/api/w4/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: fullUrl, apiKey: getKey('firecrawl_api_key') }),
        });
        const data = await res.json();
        if (data.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message || 'Scrape failed');
        content = data.scrape?.data?.markdown || data.scrape?.markdown || '';
        if (!content) throw new Error('Nenhum conteudo extraido do site.');
        setW4(d => ({ ...d, projects: d.projects.map(p => p.id === projectId ? { ...p, scrapedData: data } : p) }));
      }

      // Step 2: Brand Book
      setStep('analyzing');
      const res = await fetch('/api/w4/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: getKey('openrouter_api_key'),
          model: W4_MODELS.analysis,
          maxTokens: 4096,
          messages: [
            { role: 'system', content: buildSystemPrompt('brand_audit') + `\n\nTASK: Create a Brand Book 2.0 in JSON. Fields: sector, positioning, primary_palette [{name, hex, usage}] (3 colors), expanded_palette [{name, hex, usage}] (6 colors), typography {display_font, body_font} (ONLY from approved fonts), tone_of_voice {adjectives [3], dos [5], donts [5]}, moodboard [{reference, description}] (5 items), tagline, tagline_variations [2], brand_tokens {spacing, radius, shadows}. Output ONLY valid JSON.` },
            { role: 'user', content: `Brand input:\n${content.slice(0, 6000)}` },
          ],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message || 'Analysis failed');
      const raw = data.choices?.[0]?.message?.content || '';

      let brandBook = {};
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) brandBook = JSON.parse(jsonMatch[0]);
      } catch { brandBook = { raw, parseError: true }; }

      // Step 3: Image prompts
      setStep('generating');
      const imgRes = await fetch('/api/w4/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: getKey('openrouter_api_key'),
          model: W4_MODELS.creative,
          maxTokens: 1024,
          messages: [
            { role: 'system', content: 'Generate 3 optimized image generation prompts for FLUX Schnell based on this brand book. Output JSON array: [{type: "logo_mockup"|"social_banner"|"presentation_card", prompt: "detailed prompt"}]. Output ONLY the JSON array.' },
            { role: 'user', content: JSON.stringify(brandBook).slice(0, 3000) },
          ],
        }),
      });
      const imgData = await imgRes.json();
      let imagePrompts = [];
      try {
        const imgRaw = imgData.choices?.[0]?.message?.content || '[]';
        const match = imgRaw.match(/\[[\s\S]*\]/);
        if (match) imagePrompts = JSON.parse(match[0]);
      } catch {}

      // Save
      const output = {
        id: uid(), projectId, type: 'brand_book',
        title: `Brand: ${hostname}`, content: JSON.stringify({ brandBook, imagePrompts }, null, 2),
        language: 'json', metadata: { mode, imagePrompts },
        createdAt: new Date().toISOString(),
      };

      setW4(d => ({
        ...d,
        projects: d.projects.map(p => p.id === projectId ? { ...p, brandBlueprint: brandBook, outputContent: { brandBook, imagePrompts }, status: 'complete' } : p),
        outputs: [output, ...d.outputs],
      }));

      setResult({ brandBook, imagePrompts });
      toast('Brand Audit completo');
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
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Brand Evolution Audit</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>Envie URL, logo ou descricao para gerar um Brand Book completo.</p>

      <Card style={{ marginBottom: 20 }}>
        <SLabel>Modo de input</SLabel>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[['url', 'URL do site'], ['text', 'Descricao em texto']].map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)} style={{ fontSize: 12, padding: '5px 14px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, background: mode === k ? '#1a1a1a' : 'transparent', color: mode === k ? '#fff' : '#888', border: `1px solid ${mode === k ? '#1a1a1a' : '#e0e0de'}`, fontFamily: 'inherit' }}>{l}</button>
          ))}
        </div>

        {mode === 'url' && <Inp placeholder="patagon.ai ou https://marca.com" value={url} onChange={e => setUrl(e.target.value)} style={{ marginBottom: 12 }} />}
        {mode === 'text' && <Txa placeholder="Descreva a marca: setor, publico-alvo, tom, valores..." value={text} onChange={e => setText(e.target.value)} rows={4} style={{ marginBottom: 12 }} />}

        <Btn onClick={startAudit} style={{ opacity: loading ? 0.6 : 1 }}>{loading ? 'Processando...' : 'Gerar Brand Book'}</Btn>
        {step && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#3498DB' }}>{step === 'scraping' ? 'Scraping site...' : step === 'analyzing' ? 'Gerando brand book...' : 'Criando prompts de imagem...'}</p>}
        {error && !loading && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#c0392b' }}>{error}</p>}
      </Card>

      {result && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <SLabel style={{ margin: 0 }}>Brand Book</SLabel>
              <Btn sm onClick={() => { navigator.clipboard.writeText(JSON.stringify(result.brandBook, null, 2)); toast('JSON copiado'); }}>Copiar JSON</Btn>
            </div>
            {result.brandBook.sector && <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700 }}>Setor: {result.brandBook.sector}</p>}
            {result.brandBook.tagline && <p style={{ margin: '0 0 12px', fontSize: 16, fontStyle: 'italic', color: '#555' }}>"{result.brandBook.tagline}"</p>}

            {result.brandBook.primary_palette && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#aaa' }}>Paleta</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(result.brandBook.primary_palette || []).concat(result.brandBook.expanded_palette || []).map((c, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 6, background: c.hex, border: '1px solid #eceae5' }} />
                      <p style={{ margin: '2px 0 0', fontSize: 9, color: '#888' }}>{c.hex}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <pre style={{ margin: 0, fontSize: 11, color: '#555', overflow: 'auto', maxHeight: 300, background: '#fafaf8', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(result.brandBook, null, 2)}
            </pre>
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
