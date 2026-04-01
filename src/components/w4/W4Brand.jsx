'use client';
import { useState } from 'react';
import { Card, Inp, Txa, Btn, SLabel, toast } from '../ui';
import { uid } from '@/lib/utils';
import { W4_MODELS } from '@/lib/constants';
import { buildSystemPrompt } from '@/lib/w4-system-prompt';
import { callLLM, callScrape, parseJSON, ensureUrl } from '@/lib/w4-api';

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

      if (mode === 'url') {
        setStep('scraping');
        const { markdown, data } = await callScrape({ url: fullUrl, apiKey: getKey('firecrawl_api_key') });
        content = markdown;
        setW4(d => ({ ...d, projects: d.projects.map(p => p.id === projectId ? { ...p, scrapedData: data } : p) }));
      }

      // Brand Book
      setStep('analyzing');
      const raw = await callLLM({
        apiKey: getKey('openrouter_api_key'),
        model: W4_MODELS.analysis,
        maxTokens: 3000,
        messages: [
          { role: 'system', content: buildSystemPrompt('brand_audit') + `\n\nCreate a Brand Book 2.0 in JSON: {sector, positioning, primary_palette:[{name,hex,usage}], expanded_palette:[{name,hex,usage}], typography:{display_font,body_font}, tone_of_voice:{adjectives:[3],dos:[5],donts:[5]}, moodboard:[{reference,description}], tagline, tagline_variations:[2], brand_tokens:{spacing,radius,shadows}}. JSON ONLY.` },
          { role: 'user', content: content.slice(0, 4000) },
        ],
      });

      const { parsed: brandBook } = parseJSON(raw);
      const bb = brandBook || { raw };

      // Image prompts
      setStep('generating');
      let imagePrompts = [];
      try {
        const imgRaw = await callLLM({
          apiKey: getKey('openrouter_api_key'),
          model: W4_MODELS.creative,
          maxTokens: 800,
          messages: [
            { role: 'system', content: 'Generate 3 FLUX Schnell image prompts based on this brand. Output JSON array: [{type:"logo_mockup"|"social_banner"|"presentation_card",prompt:"detailed prompt"}]. JSON ONLY.' },
            { role: 'user', content: JSON.stringify(bb).slice(0, 2000) },
          ],
        });
        const { parsed } = parseJSON(imgRaw);
        if (Array.isArray(parsed)) imagePrompts = parsed;
      } catch {}

      const output = { id: uid(), projectId, type: 'brand_book', title: `Brand: ${hostname}`, content: JSON.stringify({ brandBook: bb, imagePrompts }, null, 2), language: 'json', metadata: { mode, imagePrompts }, createdAt: new Date().toISOString() };
      setW4(d => ({
        ...d,
        projects: d.projects.map(p => p.id === projectId ? { ...p, brandBlueprint: bb, outputContent: { brandBook: bb, imagePrompts }, status: 'complete' } : p),
        outputs: [output, ...d.outputs],
      }));

      setResult({ brandBook: bb, imagePrompts });
      toast('Brand Audit completo');
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
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Brand Evolution Audit</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>Envie URL ou descricao para gerar um Brand Book completo.</p>

      <Card style={{ marginBottom: 20 }}>
        <SLabel>Modo de input</SLabel>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[['url', 'URL do site'], ['text', 'Descricao em texto']].map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)} style={{ fontSize: 12, padding: '5px 14px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, background: mode === k ? '#1a1a1a' : 'transparent', color: mode === k ? '#fff' : '#888', border: `1px solid ${mode === k ? '#1a1a1a' : '#e0e0de'}`, fontFamily: 'inherit' }}>{l}</button>
          ))}
        </div>

        {mode === 'url' && <Inp placeholder="patagon.ai" value={url} onChange={e => setUrl(e.target.value)} style={{ marginBottom: 12 }} onKeyDown={e => { if (e.key === 'Enter' && !loading) startAudit(); }} />}
        {mode === 'text' && <Txa placeholder="Descreva: setor, publico, tom, valores..." value={text} onChange={e => setText(e.target.value)} rows={4} style={{ marginBottom: 12 }} />}

        <Btn onClick={startAudit} style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>{loading ? 'Processando...' : 'Gerar Brand Book'}</Btn>
        {step && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#1a5276' }}>{step === 'scraping' ? 'Scraping...' : step === 'analyzing' ? 'Gerando brand book...' : 'Criando prompts...'}</p>}
        {error && !loading && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#c0392b', background: '#fdf2f2', padding: '8px 12px', borderRadius: 6 }}>{error}</p>}
      </Card>

      {result && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <SLabel style={{ margin: 0 }}>Brand Book</SLabel>
              <Btn sm onClick={() => { navigator.clipboard.writeText(JSON.stringify(result.brandBook, null, 2)); toast('JSON copiado'); }}>Copiar</Btn>
            </div>
            {result.brandBook.tagline && <p style={{ margin: '0 0 12px', fontSize: 16, fontStyle: 'italic', color: '#555' }}>"{result.brandBook.tagline}"</p>}
            {result.brandBook.primary_palette && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {(result.brandBook.primary_palette || []).concat(result.brandBook.expanded_palette || []).map((c, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 6, background: c.hex, border: '1px solid #eceae5' }} />
                    <p style={{ margin: '2px 0 0', fontSize: 9, color: '#888' }}>{c.hex}</p>
                  </div>
                ))}
              </div>
            )}
            <pre style={{ margin: 0, fontSize: 11, color: '#555', overflow: 'auto', maxHeight: 300, background: '#fafaf8', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(result.brandBook, null, 2)}</pre>
          </Card>
          {result.imagePrompts?.length > 0 && (
            <Card>
              <SLabel>Prompts FLUX Schnell</SLabel>
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
