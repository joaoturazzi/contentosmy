'use client';
import { Card, SLabel, Empty } from '../ui';
import { W4_FUNC, W4_STATUS, W4_VIBES } from '@/lib/constants';

export default function W4Home({ w4, setW4, setPage }) {
  const projects = w4.projects || [];
  const recent = [...projects].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5);

  const settings = w4.settings || [];
  const hasFirecrawl = settings.some(s => s.key === 'firecrawl_api_key' && s.value);
  const hasOpenRouter = settings.some(s => s.key === 'openrouter_api_key' && s.value);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>Cinematic Agency Engine</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#888' }}>Transforme inputs simples em produtos digitais premium.</p>
      </div>

      {/* API status */}
      {(!hasFirecrawl || !hasOpenRouter) && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: '#fef9e7', border: '1px solid #f5d89a', marginBottom: 20, fontSize: 12, color: '#8a6d3b' }}>
          <strong>Configure suas API keys</strong> para ativar todas as funcoes.
          {!hasFirecrawl && <span style={{ display: 'block', marginTop: 4 }}>Firecrawl API key nao configurada</span>}
          {!hasOpenRouter && <span style={{ display: 'block', marginTop: 4 }}>OpenRouter API key nao configurada</span>}
          <button onClick={() => setPage('config')} style={{ marginTop: 8, fontSize: 12, padding: '4px 12px', borderRadius: 6, background: '#1a1a1a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Configurar</button>
        </div>
      )}

      {/* Function cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
        {Object.entries(W4_FUNC).map(([key, func]) => (
          <Card
            key={key}
            onClick={() => setPage(key === 'site_rebirth' ? 'rebirth' : key === 'brand_audit' ? 'brand' : key === 'ad_generator' ? 'ads' : 'components')}
            style={{ cursor: 'pointer', transition: 'transform .1s, box-shadow .1s' }}
            className="hover-card"
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 16, color: '#fff' }}>{func.icon}</span>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{func.label}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888', lineHeight: 1.5 }}>{func.desc}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Vibes reference */}
      <div style={{ marginBottom: 28 }}>
        <SLabel>Vibe Archetypes</SLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(W4_VIBES).map(([key, vibe]) => (
            <div key={key} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #eceae5', fontSize: 12, flex: 1, minWidth: 150 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>{vibe.label}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#888' }}>{vibe.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stack info */}
      <Card style={{ background: '#fafaf8', marginBottom: 20 }}>
        <SLabel>Stack</SLabel>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
          <span style={{ padding: '3px 8px', borderRadius: 4, background: '#eaf2fb', color: '#1a5276' }}>Firecrawl (Scraping)</span>
          <span style={{ padding: '3px 8px', borderRadius: 4, background: '#f5eef8', color: '#8e44ad' }}>DeepSeek (Analysis)</span>
          <span style={{ padding: '3px 8px', borderRadius: 4, background: '#eafaf1', color: '#1e8449' }}>Qwen 2.5 (Code)</span>
          <span style={{ padding: '3px 8px', borderRadius: 4, background: '#fef9e7', color: '#d68910' }}>Llama 3.3 (Creative)</span>
          <span style={{ padding: '3px 8px', borderRadius: 4, background: '#fdf2f2', color: '#c0392b' }}>FLUX Schnell (Image)</span>
          <span style={{ padding: '3px 8px', borderRadius: 4, background: '#f4f4f3', color: '#555' }}>Remotion (Video)</span>
        </div>
      </Card>

      {/* Recent projects */}
      <SLabel>Projetos recentes</SLabel>
      {recent.length === 0 && <Empty text="Nenhum projeto criado ainda" />}
      {recent.map(p => {
        const st = W4_STATUS[p.status] || W4_STATUS.draft;
        const func = W4_FUNC[p.type] || {};
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f4f1' }}>
            <span style={{ fontSize: 12, opacity: 0.5 }}>{func.icon || '?'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || 'Sem nome'}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>{func.label || p.type}</p>
            </div>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: st.bg, color: st.color, fontWeight: 600 }}>{st.label}</span>
          </div>
        );
      })}
    </div>
  );
}
