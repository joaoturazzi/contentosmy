'use client';
import { Card } from '../ui';

export default function W3Importar() {
  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Importar Extratos</h1>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: '#888' }}>Importe extratos bancários para lançamento automático</p>

      <Card style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>↑</div>
        <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#555' }}>Em breve</p>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#888' }}>
          Importação de extratos OFX e CSV dos principais bancos brasileiros.
        </p>
        <p style={{ margin: 0, fontSize: 12, color: '#aaa' }}>
          As transações importadas serão marcadas com a fonte de origem e um ID externo para evitar duplicatas.
        </p>
      </Card>

      <Card style={{ marginTop: 16, background: '#fafaf8' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 8 }}>Formatos planejados:</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: '#eaf2fb', color: '#1a5276' }}>OFX (Itaú, Banco PAN)</span>
          <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: '#eafaf1', color: '#1e8449' }}>CSV (Nubank, Inter)</span>
          <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: '#f5eef8', color: '#8e44ad' }}>PDF (em análise)</span>
        </div>
      </Card>
    </div>
  );
}
