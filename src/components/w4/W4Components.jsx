'use client';
import { useState } from 'react';
import { Card, Txa, Sel, Btn, SLabel, toast } from '../ui';
import { uid } from '@/lib/utils';
import { W4_VIBES, W4_MODELS } from '@/lib/constants';
import { buildSystemPrompt } from '@/lib/w4-system-prompt';
import { callLLM } from '@/lib/w4-api';

export default function W4Components({ w4, setW4 }) {
  const [desc, setDesc] = useState('');
  const [vibe, setVibe] = useState('minimalist');
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [previewId, setPreviewId] = useState(null);

  const settings = w4.settings || [];
  const getKey = (k) => settings.find(s => s.key === k)?.value || '';

  const generate = async () => {
    if (!desc.trim()) { toast('Descreva o componente'); return; }
    setLoading(true);
    setError(null);
    setResult(null);

    const projectId = uid();
    const project = { id: projectId, name: `UI: ${desc.slice(0, 40)}`, type: 'ui_factory', status: 'generating', inputUrl: '', inputText: desc, inputChannel: '', vibe, brandBlueprint: {}, scrapedData: {}, outputContent: {}, errorMessage: '', notes: '', createdAt: new Date().toISOString() };
    setW4(d => ({ ...d, projects: [project, ...d.projects] }));

    try {
      const code = await callLLM({
        apiKey: getKey('openrouter_api_key'),
        model: W4_MODELS.code,
        maxTokens: 6000,
        messages: [
          { role: 'system', content: buildSystemPrompt('ui_factory', vibe) + `\n\nGenerate a COMPLETE React+Tailwind v3 component. Vibe: ${W4_VIBES[vibe]?.label || vibe}. Theme: ${theme}. Include hover/focus/active states. Mobile-first. One .tsx file. COMPLETE code, no truncation.` },
          { role: 'user', content: `Component: ${desc}` },
        ],
      });

      const outputId = uid();
      setPreviewId(outputId);
      const output = { id: outputId, projectId, type: 'component', title: `UI: ${desc.slice(0, 40)}`, content: code, language: 'tsx', metadata: { vibe, theme }, createdAt: new Date().toISOString() };
      setW4(d => ({
        ...d,
        projects: d.projects.map(p => p.id === projectId ? { ...p, outputContent: { code }, status: 'complete' } : p),
        outputs: [output, ...d.outputs],
      }));
      setResult(code);
      toast('Componente gerado');
    } catch (err) {
      const msg = err.message || 'Erro desconhecido';
      setError(msg);
      setW4(d => ({ ...d, projects: d.projects.map(p => p.id === projectId ? { ...p, status: 'error', errorMessage: msg } : p) }));
      toast('Erro: ' + msg.slice(0, 80));
    }
    setLoading(false);
  };

  const recentOutputs = (w4.outputs || []).filter(o => o.type === 'component').slice(0, 5);

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>UI Component Factory</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>Peca qualquer componente React + Tailwind com qualidade Awwwards.</p>

      <Card style={{ marginBottom: 20 }}>
        <SLabel>Descricao</SLabel>
        <Txa placeholder="Ex: Pricing table com 3 tiers, toggle mensal/anual, dark mode..." value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Sel value={vibe} onChange={e => setVibe(e.target.value)} style={{ width: 180 }}>{Object.entries(W4_VIBES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Sel>
          <Sel value={theme} onChange={e => setTheme(e.target.value)} style={{ width: 120 }}><option value="light">Light</option><option value="dark">Dark</option></Sel>
          <Btn onClick={generate} style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>{loading ? 'Gerando...' : 'Gerar Componente'}</Btn>
        </div>
        {loading && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#1a5276' }}>Gerando com Qwen 2.5 Coder...</p>}
        {error && !loading && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#c0392b', background: '#fdf2f2', padding: '8px 12px', borderRadius: 6 }}>{error}</p>}
      </Card>

      {previewId && result && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <SLabel style={{ margin: 0 }}>Preview</SLabel>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn sm onClick={() => window.open(`/api/w4/preview/${previewId}`, '_blank')}>Abrir</Btn>
              <Btn sm variant="ghost" onClick={() => window.open(`/api/w4/download/${previewId}`, '_blank')}>Download</Btn>
            </div>
          </div>
          <div style={{ border: '1px solid #eceae5', borderRadius: 8, overflow: 'hidden' }}>
            <iframe src={`/api/w4/preview/${previewId}`} style={{ width: '100%', height: 500, border: 'none' }} title="Preview" sandbox="allow-scripts allow-same-origin" />
          </div>
        </Card>
      )}

      {result && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <SLabel style={{ margin: 0 }}>Codigo</SLabel>
            <Btn sm onClick={() => { navigator.clipboard.writeText(result); toast('Copiado'); }}>Copiar</Btn>
          </div>
          <pre style={{ margin: 0, fontSize: 11, color: '#555', overflow: 'auto', maxHeight: 500, background: '#fafaf8', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{result}</pre>
        </Card>
      )}

      {recentOutputs.length > 0 && (
        <><SLabel>Recentes</SLabel>
          {recentOutputs.map(o => (
            <Card key={o.id} style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => setResult(o.content)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{o.title}</p>
                <span style={{ fontSize: 11, color: '#888' }}>{o.metadata?.vibe} / {o.metadata?.theme}</span>
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
