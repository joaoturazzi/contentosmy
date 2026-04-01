'use client';
import { useState } from 'react';
import { Card, Inp, Txa, Sel, Btn, SLabel, Empty, toast } from '../ui';
import { uid } from '@/lib/utils';
import { W4_MODELS } from '@/lib/constants';
import { buildSystemPrompt } from '@/lib/w4-system-prompt';

const CHANNELS = { instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube', tiktok: 'TikTok' };

export default function W4Ads({ w4, setW4 }) {
  const [product, setProduct] = useState('');
  const [channel, setChannel] = useState('instagram');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const settings = w4.settings || [];
  const openrouterKey = settings.find(s => s.key === 'openrouter_api_key')?.value || '';

  const generate = async () => {
    if (!product.trim()) { toast('Descreva o produto/servico'); return; }
    if (!openrouterKey) { toast('Configure a OpenRouter API key'); return; }

    const projectId = uid();
    const project = {
      id: projectId, name: `Ad: ${product.slice(0, 40)}`,
      type: 'ad_generator', status: 'generating',
      inputUrl: '', inputText: product, inputChannel: channel, vibe: '',
      brandBlueprint: {}, scrapedData: {}, outputContent: {},
      errorMessage: '', notes: '', createdAt: new Date().toISOString(),
    };
    setW4(d => ({ ...d, projects: [project, ...d.projects] }));
    setLoading(true);

    try {
      // Creative concepts
      const res = await fetch('/api/w4/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: openrouterKey,
          model: W4_MODELS.creative,
          maxTokens: 4096,
          messages: [
            { role: 'system', content: buildSystemPrompt('ad_generator') + `\n\nTASK: Generate 3 ad concepts. Output JSON:
{"concepts": [{"name": "Concept A - Emotional", "approach": "storytelling", "headline": "max 8 words", "subheadline": "max 15 words", "cta": "max 4 words", "caption": "120-180 chars + hashtags", "ab_variations": {"headline_b": "alt", "cta_b": "alt"}, "linkedin_version": "professional tone adaptation", "instagram_version": "visual/emotional adaptation", "video_script": [{"time": "0s-2s", "visual": "desc", "text_overlay": "if any", "transition": "type"}], "image_prompt": "detailed FLUX prompt with aspect ratio"}]}
3 concepts: A-Emotional (storytelling), B-Rational (problem>solution>proof), C-Disruptive (pattern interrupt). Channel: ${CHANNELS[channel]}.` },
            { role: 'user', content: `Product/Service: ${product}\nChannel: ${CHANNELS[channel]}` },
          ],
        }),
      });
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || '';

      let concepts = { concepts: [] };
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) concepts = JSON.parse(match[0]);
      } catch { concepts = { raw }; }

      const output = {
        id: uid(), projectId, type: 'ad_copy',
        title: `Ad: ${product.slice(0, 40)} — ${CHANNELS[channel]}`,
        content: JSON.stringify(concepts, null, 2),
        language: 'json', metadata: { channel, product },
        createdAt: new Date().toISOString(),
      };

      setW4(d => ({
        ...d,
        projects: d.projects.map(p => p.id === projectId ? { ...p, outputContent: concepts, status: 'complete' } : p),
        outputs: [output, ...d.outputs],
      }));

      setResult(concepts);
      toast('Conceitos gerados');
    } catch (err) {
      setW4(d => ({ ...d, projects: d.projects.map(p => p.id === projectId ? { ...p, status: 'error', errorMessage: err.message } : p) }));
      toast('Erro: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Creative Ad Generator</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>Descreva o produto + canal para gerar 3 conceitos criativos com copy, roteiro e prompts de imagem.</p>

      <Card style={{ marginBottom: 20 }}>
        <SLabel>Briefing</SLabel>
        <Txa placeholder="Descreva o produto ou servico, publico-alvo, diferenciais, tom..." value={product} onChange={e => setProduct(e.target.value)} rows={3} style={{ marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Sel value={channel} onChange={e => setChannel(e.target.value)} style={{ width: 160 }}>
            {Object.entries(CHANNELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Sel>
          <Btn onClick={generate} style={{ opacity: loading ? 0.6 : 1 }}>{loading ? 'Gerando...' : 'Gerar Conceitos'}</Btn>
        </div>
      </Card>

      {result?.concepts?.map((concept, i) => (
        <Card key={i} style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>{concept.name}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase' }}>Headline</p>
              <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800 }}>{concept.headline}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase' }}>CTA</p>
              <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: '#1a5276' }}>{concept.cta}</p>
            </div>
          </div>
          {concept.subheadline && <p style={{ margin: '0 0 8px', fontSize: 13, color: '#555' }}>{concept.subheadline}</p>}
          {concept.caption && (
            <div style={{ padding: '8px 12px', borderRadius: 6, background: '#fafaf8', marginBottom: 8, fontSize: 12, color: '#555' }}>{concept.caption}</div>
          )}
          {concept.ab_variations && (
            <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
              <span style={{ fontWeight: 700 }}>A/B:</span> {concept.ab_variations.headline_b} / {concept.ab_variations.cta_b}
            </div>
          )}
          {concept.video_script?.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#aaa' }}>ROTEIRO</p>
              {concept.video_script.map((scene, j) => (
                <div key={j} style={{ display: 'flex', gap: 8, padding: '3px 0', fontSize: 12, borderBottom: '1px solid #f5f4f1' }}>
                  <span style={{ fontWeight: 700, color: '#888', width: 60, flexShrink: 0 }}>{scene.time}</span>
                  <span style={{ color: '#555' }}>{scene.visual} {scene.text_overlay ? `[${scene.text_overlay}]` : ''}</span>
                </div>
              ))}
            </div>
          )}
          {concept.image_prompt && (
            <div style={{ padding: '8px 12px', borderRadius: 6, background: '#f5eef8', fontSize: 11, color: '#8e44ad' }}>
              <strong>FLUX prompt:</strong> {concept.image_prompt}
            </div>
          )}
        </Card>
      ))}

      {result && !result.concepts && (
        <Card>
          <SLabel>Raw output</SLabel>
          <pre style={{ margin: 0, fontSize: 11, color: '#555', overflow: 'auto', maxHeight: 400, whiteSpace: 'pre-wrap' }}>{JSON.stringify(result, null, 2)}</pre>
        </Card>
      )}
    </div>
  );
}
