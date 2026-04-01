'use client';
import { Card, SLabel, Empty, Btn, FPill, toast } from '../ui';
import { useState } from 'react';
import { W4_FUNC, W4_STATUS } from '@/lib/constants';

export default function W4Projects({ w4, setW4, setPage }) {
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const projects = w4.projects || [];
  let visible = [...projects].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  if (filterType !== 'all') visible = visible.filter(p => p.type === filterType);
  if (filterStatus !== 'all') visible = visible.filter(p => p.status === filterStatus);

  const outputs = w4.outputs || [];

  const removeProject = (id) => {
    setW4(d => ({
      ...d,
      projects: d.projects.filter(p => p.id !== id),
      outputs: d.outputs.filter(o => o.projectId !== id),
    }));
    toast('Projeto removido');
  };

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Projetos</h1>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#888' }}>{projects.length} projeto{projects.length !== 1 ? 's' : ''} criado{projects.length !== 1 ? 's' : ''}</p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        <FPill label="Todos" active={filterType === 'all'} onClick={() => setFilterType('all')} />
        {Object.entries(W4_FUNC).map(([k, v]) => (
          <FPill key={k} label={v.label} active={filterType === k} onClick={() => setFilterType(filterType === k ? 'all' : k)} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(W4_STATUS).map(([k, v]) => (
          <FPill key={k} label={v.label} active={filterStatus === k} color={v.color} onClick={() => setFilterStatus(filterStatus === k ? 'all' : k)} />
        ))}
      </div>

      {visible.length === 0 && <Empty text="Nenhum projeto encontrado" />}
      {visible.map(p => {
        const st = W4_STATUS[p.status] || W4_STATUS.draft;
        const func = W4_FUNC[p.type] || {};
        const projOutputs = outputs.filter(o => o.projectId === p.id);

        return (
          <Card key={p.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{func.icon || '?'}</span>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{p.name || 'Sem nome'}</p>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#aaa' }}>{func.label || p.type} {p.vibe ? `/ ${p.vibe}` : ''}</p>
              </div>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: st.bg, color: st.color, fontWeight: 600 }}>{st.label}</span>
            </div>

            {p.inputUrl && <p style={{ margin: '0 0 4px', fontSize: 12, color: '#888' }}>URL: {p.inputUrl}</p>}
            {p.errorMessage && <p style={{ margin: '0 0 4px', fontSize: 12, color: '#c0392b' }}>Erro: {p.errorMessage}</p>}

            {projOutputs.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#aaa' }}>Outputs ({projOutputs.length})</p>
                {projOutputs.map(o => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 12 }}>
                    <span style={{ padding: '1px 5px', borderRadius: 3, background: '#f4f4f3', fontSize: 10, color: '#888' }}>{o.language}</span>
                    <span style={{ color: '#555', flex: 1 }}>{o.title}</span>
                    {(o.type === 'site_code' || o.type === 'component') && (
                      <>
                        <button onClick={() => window.open(`/api/w4/preview/${o.id}`, '_blank')} style={{ fontSize: 11, color: '#1a5276', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Preview</button>
                        <button onClick={() => window.open(`/api/w4/download/${o.id}`, '_blank')} style={{ fontSize: 11, color: '#1e8449', background: 'none', border: 'none', cursor: 'pointer' }}>Download</button>
                      </>
                    )}
                    <button onClick={() => { navigator.clipboard.writeText(o.content); toast('Copiado'); }} style={{ fontSize: 11, color: '#555', background: 'none', border: 'none', cursor: 'pointer' }}>Copiar</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <Btn sm variant="danger" onClick={() => removeProject(p.id)}>Remover</Btn>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
