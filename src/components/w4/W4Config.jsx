'use client';
import { useState, useEffect } from 'react';
import { Card, Inp, Btn, SLabel, FormRow, toast } from '../ui';
import { uid } from '@/lib/utils';
import { W4_MODELS } from '@/lib/constants';

export default function W4Config({ w4, setW4 }) {
  const settings = w4.settings || [];

  const getVal = (key) => settings.find(s => s.key === key)?.value || '';

  const [firecrawl, setFirecrawl] = useState(getVal('firecrawl_api_key'));
  const [openrouter, setOpenrouter] = useState(getVal('openrouter_api_key'));

  useEffect(() => {
    setFirecrawl(getVal('firecrawl_api_key'));
    setOpenrouter(getVal('openrouter_api_key'));
  }, [settings.length]); // eslint-disable-line

  const saveSetting = (key, value) => {
    const existing = settings.find(s => s.key === key);
    if (existing) {
      setW4(d => ({
        ...d,
        settings: d.settings.map(s => s.key === key ? { ...s, value } : s),
      }));
    } else {
      setW4(d => ({
        ...d,
        settings: [...d.settings, { id: uid(), key, value, createdAt: new Date().toISOString() }],
      }));
    }
    toast('Salvo');
  };

  // Test connection
  const testOpenRouter = async () => {
    if (!openrouter) { toast('Insira a API key primeiro'); return; }
    try {
      const res = await fetch('/api/w4/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: openrouter,
          model: W4_MODELS.analysis,
          maxTokens: 50,
          messages: [{ role: 'user', content: 'Reply with just "OK"' }],
        }),
      });
      const data = await res.json();
      if (data.choices?.[0]) toast('OpenRouter conectado com sucesso');
      else toast('Erro: ' + (data.error?.message || 'Resposta inesperada'));
    } catch (err) {
      toast('Erro: ' + err.message);
    }
  };

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Configuracoes</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>API keys e configuracoes do Visual OS.</p>

      <Card style={{ marginBottom: 16 }}>
        <SLabel>API Keys</SLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <FormRow label="Firecrawl API Key">
              <div style={{ display: 'flex', gap: 8 }}>
                <Inp type="password" placeholder="fc-..." value={firecrawl} onChange={e => setFirecrawl(e.target.value)} style={{ flex: 1 }} />
                <Btn sm onClick={() => saveSetting('firecrawl_api_key', firecrawl)}>Salvar</Btn>
              </div>
            </FormRow>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#aaa' }}>Necessario para Site Rebirth e Brand Audit (modo URL). Obtenha em firecrawl.dev</p>
          </div>

          <div>
            <FormRow label="OpenRouter API Key">
              <div style={{ display: 'flex', gap: 8 }}>
                <Inp type="password" placeholder="sk-or-..." value={openrouter} onChange={e => setOpenrouter(e.target.value)} style={{ flex: 1 }} />
                <Btn sm onClick={() => saveSetting('openrouter_api_key', openrouter)}>Salvar</Btn>
                <Btn sm variant="ghost" onClick={testOpenRouter}>Testar</Btn>
              </div>
            </FormRow>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#aaa' }}>Necessario para todas as funcoes de geracao. Obtenha em openrouter.ai</p>
          </div>
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <SLabel>Modelos utilizados</SLabel>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #eceae5', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Tarefa</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Modelo</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Analise / Brand / Research', W4_MODELS.analysis],
              ['Codigo / Frontend', W4_MODELS.code],
              ['Criatividade / Copy', W4_MODELS.creative],
              ['Imagem', W4_MODELS.image],
            ].map(([task, model]) => (
              <tr key={task} style={{ borderBottom: '1px solid #f5f4f1' }}>
                <td style={{ padding: '6px 8px' }}>{task}</td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 12, color: '#888' }}>{model}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card style={{ background: '#fafaf8' }}>
        <SLabel>Status</SLabel>
        <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: firecrawl ? '#1e8449' : '#c0392b' }} />
            <span>Firecrawl {firecrawl ? 'configurado' : 'pendente'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: openrouter ? '#1e8449' : '#c0392b' }} />
            <span>OpenRouter {openrouter ? 'configurado' : 'pendente'}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
