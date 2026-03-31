'use client';
import { Card, SLabel, PBar, Empty } from '../ui';
import { fmtBRL, fmtDateBR } from '@/lib/utils';
import { MONTHS } from '@/lib/constants';

export default function W3Parcelas({ w3, setW3 }) {
  const installments = (w3.installments || []).filter(i => i.isActive);
  const cards = w3.credit_cards || [];
  const cats = w3.categories || [];

  const cardMap = {};
  cards.forEach(c => { cardMap[c.id] = c; });
  const catMap = {};
  cats.forEach(c => { catMap[c.id] = c; });

  const totalMonthly = installments.reduce((s, i) => s + (i.installmentAmount || 0), 0);
  const totalRemaining = installments.reduce((s, i) => s + (i.installmentAmount * (i.remainingInstallments || 0)), 0);

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Parcelamentos Ativos</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>Parcelas em andamento e suas projeções</p>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <Card style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase' }}>Total mensal em parcelas</p>
          <p style={{ margin: '4px 0', fontSize: 20, fontWeight: 800, color: '#E74C3C' }}>{fmtBRL(totalMonthly)}</p>
        </Card>
        <Card style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase' }}>Total a pagar (restante)</p>
          <p style={{ margin: '4px 0', fontSize: 20, fontWeight: 800 }}>{fmtBRL(totalRemaining)}</p>
        </Card>
        <Card style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase' }}>Parcelamentos ativos</p>
          <p style={{ margin: '4px 0', fontSize: 20, fontWeight: 800 }}>{installments.length}</p>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <SLabel>Detalhamento</SLabel>
        {installments.length === 0 && <Empty text="Nenhum parcelamento ativo" />}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eceae5', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Item</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Total</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Parcela</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Pagas</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Restam</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Encerra</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Cartão</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11, width: 150 }}>Progresso</th>
            </tr>
          </thead>
          <tbody>
            {installments.map(inst => {
              const card = cardMap[inst.cardId];
              const pct = inst.totalInstallments > 0 ? Math.round((inst.paidInstallments / inst.totalInstallments) * 100) : 0;
              const endDateFormatted = inst.endDate ? (() => {
                const d = new Date(inst.endDate + 'T12:00');
                return `${MONTHS[d.getMonth()]?.slice(0, 3) || ''} ${d.getFullYear()}`;
              })() : '—';

              return (
                <tr key={inst.id} style={{ borderBottom: '1px solid #f5f4f1' }}>
                  <td style={{ padding: '8px', fontWeight: 600 }}>{inst.description}</td>
                  <td style={{ padding: '8px' }}>{fmtBRL(inst.totalAmount)}</td>
                  <td style={{ padding: '8px', fontWeight: 700 }}>{fmtBRL(inst.installmentAmount)}</td>
                  <td style={{ padding: '8px' }}>{inst.paidInstallments}/{inst.totalInstallments}</td>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#d68910' }}>{inst.remainingInstallments ?? '—'}</td>
                  <td style={{ padding: '8px', color: '#888' }}>{endDateFormatted}</td>
                  <td style={{ padding: '8px' }}>
                    {card ? (
                      <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: card.color + '18', color: card.color }}>{card.name}</span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '8px' }}><PBar pct={pct} color="#0F9B58" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Timeline */}
      <Card style={{ marginTop: 16 }}>
        <SLabel>Linha do tempo — quando cada parcelamento encerra</SLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {installments
            .filter(i => i.endDate)
            .sort((a, b) => (a.endDate || '').localeCompare(b.endDate || ''))
            .map(inst => {
              const endDate = inst.endDate ? new Date(inst.endDate + 'T12:00') : null;
              const endLabel = endDate ? `${MONTHS[endDate.getMonth()]} ${endDate.getFullYear()}` : '?';
              return (
                <div key={inst.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid #f5f4f1' }}>
                  <span style={{ width: 80, fontSize: 12, fontWeight: 700, color: '#d68910' }}>{endLabel}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{inst.description}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Libera {fmtBRL(inst.installmentAmount)}/mês</span>
                </div>
              );
            })}
        </div>
      </Card>
    </div>
  );
}
