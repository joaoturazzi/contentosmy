'use client';
import { useState } from 'react';
import { Card, Txa, Sel, Btn, SLabel, Empty, toast } from '../ui';
import { uid } from '@/lib/utils';
import { W4_VIBES, W4_MODELS } from '@/lib/constants';
import { buildSystemPrompt } from '@/lib/w4-system-prompt';

export default function W4Components({ w4, setW4 }) {
  const [desc, setDesc] = useState('');
  const [vibe, setVibe] = useState('minimalist');
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const settings = w4.settings || [];
  const openrouterKey = settings.find(s => s.key === 'openrouter_api_key')?.value || '';

  const generate = async () => {
    if (!desc.trim()) { toast('Descreva o componente'); return; }
    if (!openrouterKey) { toast('Configure a OpenRouter API key'); return; }

    const projectId = uid();
    const project = {
      id: projectId, name: `UI: ${desc.slice(0, 40)}`,
      type: 'ui_factory', status: 'generating',
      inputUrl: '', inputText: desc, inputChannel: '', vibe,
      brandBlueprint: {}, scrapedData: {}, outputContent: {},
      errorMessage: '', notes: '', createdAt: new Date().toISOString(),
    };
    setW4(d => ({ ...d, projects: [project, ...d.projects] }));
    setLoading(true);

    try {
      const res = await fetch('/api/w4/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: openrouterKey,
          model: W4_MODELS.code,
          maxTokens: 8192,
          messages: [
            { role: 'system', content: buildSystemPrompt('ui_factory', vibe) + `\n\nTASK: Generate a complete, isolated React + Tailwind v3 component. Apply ${W4_VIBES[vibe]?.label || vibe} vibe. Theme: ${theme}. Include all mandatory states (Loading shimmer, Empty with guidance, Error with recovery). Include hover/focus/active micro-interactions. Mobile-first responsive. Output a single complete .tsx file ready to import. Include CSS variables needed in globals.css as a comment at the top.` },
            { role: 'user', content: `Component request: ${desc}\nVibe: ${vibe}\nTheme: ${theme}` },
          ],
        }),
      });
      const data = await res.json();
      const code = data.choices?.[0]?.message?.content || '';

      const output = {
        id: uid(), projectId, type: 'component',
        title: `UI: ${desc.slice(0, 40)}`, content: code,
        language: 'tsx', metadata: { vibe, theme },
        createdAt: new Date().toISOString(),
      };

      setW4(d => ({
        ...d,
        projects: d.projects.map(p => p.id === projectId ? { ...p, outputContent: { code }, status: 'complete' } : p),
        outputs: [output, ...d.outputs],
      }));

      setResult(code);
      toast('Componente gerado');
    } catch (err) {
      setW4(d => ({ ...d, projects: d.projects.map(p => p.id === projectId ? { ...p, status: 'error', errorMessage: err.message } : p) }));
      toast('Erro: ' + err.message);
    }
    setLoading(false);
  };

  // Recent outputs
  const recentOutputs = (w4.outputs || []).filter(o => o.type === 'component').slice(0, 5);

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>UI Component Factory</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>Peca qualquer componente React + Tailwind com qualidade Awwwards.</p>

      <Card style={{ marginBottom: 20 }}>
        <SLabel>Descricao do componente</SLabel>
        <Txa placeholder="Ex: Pricing table com 3 tiers, toggle mensal/anual, destaque no tier do meio, dark mode..." value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Sel value={vibe} onChange={e => setVibe(e.target.value)} style={{ width: 180 }}>
            {Object.entries(W4_VIBES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Sel>
          <Sel value={theme} onChange={e => setTheme(e.target.value)} style={{ width: 120 }}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Sel>
          <Btn onClick={generate} style={{ opacity: loading ? 0.6 : 1 }}>{loading ? 'Gerando...' : 'Gerar Componente'}</Btn>
        </div>
      </Card>

      {result && (
        <Card style={{ marginBottom: 20 }}>
          <SLabel>Codigo gerado</SLabel>
          <pre style={{ margin: 0, fontSize: 11, color: '#555', overflow: 'auto', maxHeight: 500, background: '#fafaf8', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {result}
          </pre>
          <Btn style={{ marginTop: 12 }} onClick={() => { navigator.clipboard.writeText(result); toast('Codigo copiado'); }}>Copiar codigo</Btn>
        </Card>
      )}

      {recentOutputs.length > 0 && (
        <>
          <SLabel>Componentes recentes</SLabel>
          {recentOutputs.map(o => (
            <Card key={o.id} style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => setResult(o.content)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{o.title}</p>
                <span style={{ fontSize: 11, color: '#888' }}>{o.metadata?.vibe || ''} / {o.metadata?.theme || ''}</span>
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
