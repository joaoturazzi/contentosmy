'use client';
import { useState } from 'react';
import { Card, Txa, Sel, Btn, SLabel, toast } from '../ui';
import { uid } from '@/lib/utils';
import { W4_MODELS } from '@/lib/constants';
import { buildSystemPrompt } from '@/lib/w4-system-prompt';
import { callLLM, parseJSON } from '@/lib/w4-api';

const CHANNELS = { instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube', tiktok: 'TikTok', google_ads: 'Google Ads' };

export default function W4Ads({ w4, setW4 }) {
  const [product, setProduct] = useState('');
  const [channel, setChannel] = useState('instagram');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const settings = w4.settings || [];
  const getKey = (k) => settings.find(s => s.key === k)?.value || '';

  const generate = async () => {
    if (!product.trim()) { toast('Descreva o produto'); return; }
    setLoading(true);
    setError(null);
    setResult(null);

    const projectId = uid();
    const project = { id: projectId, name: `Ad: ${product.slice(0, 40)}`, type: 'ad_generator', status: 'generating', inputUrl: '', inputText: product, inputChannel: channel, vibe: '', brandBlueprint: {}, scrapedData: {}, outputContent: {}, errorMessage: '', notes: '', createdAt: new Date().toISOString() };
    setW4(d => ({ ...d, projects: [project, ...d.projects] }));

    try {
      const raw = await callLLM({
        apiKey: getKey('openrouter_api_key'),
        model: W4_MODELS.creative,
        maxTokens: 3000,
        messages: [
          { role: 'system', content: buildSystemPrompt('ad_generator') + `\n\nGenerate 3 ad concepts. Output JSON: {"concepts":[{"name":"Concept A - Emotional","headline":"max 8 words","subheadline":"max 15 words","cta":"max 4 words","caption":"120-180 chars + hashtags","ab_variations":{"headline_b":"alt","cta_b":"alt"},"video_script":[{"time":"0s-2s","visual":"desc","text_overlay":"text"}],"image_prompt":"FLUX prompt"}]}. A=Emotional B=Rational C=Disruptive. Channel: ${CHANNELS[channel]}. JSON ONLY.` },
          { role: 'user', content: `Product: ${product}\nChannel: ${CHANNELS[channel]}` },
        ],
      });

      const { parsed } = parseJSON(raw);
      const concepts = parsed?.concepts ? parsed : { concepts: [], raw };

      const output = { id: uid(), projectId, type: 'ad_copy', title: `Ad: ${product.slice(0, 40)} — ${CHANNELS[channel]}`, content: JSON.stringify(concepts, null, 2), language: 'json', metadata: { channel, product }, createdAt: new Date().toISOString() };
      setW4(d => ({
        ...d,
        projects: d.projects.map(p => p.id === projectId ? { ...p, outputContent: concepts, status: 'complete' } : p),
        outputs: [output, ...d.outputs],
      }));
      setResult(concepts);
      toast('Conceitos gerados');
    } catch (err) {
      const msg = err.message || 'Erro desconhecido';
      setError(msg);
      setW4(d => ({ ...d, projects: d.projects.map(p => p.id === projectId ? { ...p, status: 'error', errorMessage: msg } : p) }));
      toast('Erro: ' + msg.slice(0, 80));
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Creative Ad Generator</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>Descreva o produto + canal para gerar 3 conceitos criativos.</p>

      <Card style={{ marginBottom: 20 }}>
        <SLabel>Briefing</SLabel>
        <Txa placeholder="Produto, publico-alvo, diferenciais..." value={product} onChange={e => setProduct(e.target.value)} rows={3} style={{ marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Sel value={channel} onChange={e => setChannel(e.target.value)} style={{ width: 160 }}>
            {Object.entries(CHANNELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Sel>
          <Btn onClick={generate} style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>{loading ? 'Gerando...' : 'Gerar Conceitos'}</Btn>
        </div>
        {loading && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#1a5276' }}>Gerando conceitos com Llama 3.3...</p>}
        {error && !loading && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#c0392b', background: '#fdf2f2', padding: '8px 12px', borderRadius: 6 }}>{error}</p>}
      </Card>

      {result?.concepts?.map((c, i) => (
        <Card key={i} style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>{c.name}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
            <div><p style={{ margin: 0, fontSize: 11, color: '#aaa', textTransform: 'uppercase', fontWeight: 700 }}>Headline</p><p style={{ margin: '2px 0', fontSize: 16, fontWeight: 800 }}>{c.headline}</p></div>
            <div><p style={{ margin: 0, fontSize: 11, color: '#aaa', textTransform: 'uppercase', fontWeight: 700 }}>CTA</p><p style={{ margin: '2px 0', fontSize: 14, fontWeight: 700, color: '#1a5276' }}>{c.cta}</p></div>
          </div>
          {c.subheadline && <p style={{ margin: '0 0 8px', fontSize: 13, color: '#555' }}>{c.subheadline}</p>}
          {c.caption && <div style={{ padding: '8px 12px', borderRadius: 6, background: '#fafaf8', marginBottom: 8, fontSize: 12, color: '#555' }}>{c.caption}</div>}
          {c.ab_variations && <p style={{ margin: '0 0 8px', fontSize: 11, color: '#888' }}><strong>A/B:</strong> {c.ab_variations.headline_b} / {c.ab_variations.cta_b}</p>}
          {c.video_script?.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#aaa' }}>ROTEIRO</p>
              {c.video_script.map((s, j) => (
                <div key={j} style={{ display: 'flex', gap: 8, padding: '3px 0', fontSize: 12, borderBottom: '1px solid #f5f4f1' }}>
                  <span style={{ fontWeight: 700, color: '#888', width: 50, flexShrink: 0 }}>{s.time}</span>
                  <span style={{ color: '#555' }}>{s.visual} {s.text_overlay ? `[${s.text_overlay}]` : ''}</span>
                </div>
              ))}
            </div>
          )}
          {c.image_prompt && <div style={{ padding: '8px 12px', borderRadius: 6, background: '#f5eef8', fontSize: 11, color: '#8e44ad' }}><strong>FLUX:</strong> {c.image_prompt}</div>}
        </Card>
      ))}
      {result && result.concepts?.length === 0 && result.raw && (
        <Card><SLabel>Raw</SLabel><pre style={{ margin: 0, fontSize: 11, color: '#555', overflow: 'auto', maxHeight: 300, whiteSpace: 'pre-wrap' }}>{result.raw}</pre></Card>
      )}
    </div>
  );
}
