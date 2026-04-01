'use client';
import { Card, SLabel, PBar, Empty } from '../ui';
import { fmtBRL, fmtDateBR } from '@/lib/utils';
import { MONTHS } from '@/lib/constants';

export default function W3Dividas({ w3, setW3 }) {
  const debts = (w3.debts || []).filter(d => d.isActive);
  const goals = (w3.goals || []).filter(g => g.category === 'debt_payoff');

  const totalDebt = debts.reduce((s, d) => s + (d.remainingAmount || 0), 0);
  const totalMonthly = debts.reduce((s, d) => s + (d.monthlyPayment || 0), 0);

  // Weighted average remaining months
  const totalPayments = debts.reduce((s, d) => s + (d.remainingInstallments || 0) * (d.monthlyPayment || 0), 0);
  const avgMonths = totalMonthly > 0 ? Math.round(totalPayments / totalMonthly) : 0;

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Dívidas Ativas</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>Visão consolidada de todas as dívidas</p>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <Card style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase' }}>Total dívidas</p>
          <p style={{ margin: '4px 0', fontSize: 22, fontWeight: 800, color: '#C0392B' }}>{fmtBRL(totalDebt)}</p>
        </Card>
        <Card style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase' }}>Comprometido mensal</p>
          <p style={{ margin: '4px 0', fontSize: 22, fontWeight: 800, color: '#E74C3C' }}>{fmtBRL(totalMonthly)}</p>
        </Card>
        <Card style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase' }}>Prazo médio ponderado</p>
          <p style={{ margin: '4px 0', fontSize: 22, fontWeight: 800 }}>{avgMonths} meses</p>
        </Card>
      </div>

      {/* Debt list */}
      <Card style={{ marginBottom: 16 }}>
        <SLabel>Detalhamento</SLabel>
        {debts.length === 0 && <Empty text="Nenhuma dívida ativa" />}
        {debts.map(debt => {
          const totalOwed = (debt.remainingInstallments || 0) * (debt.monthlyPayment || 0);
          const paidPct = debt.remainingAmount && totalOwed > 0
            ? Math.round(Math.max(0, (1 - totalOwed / debt.remainingAmount)) * 100)
            : 0;
          const estimatedEnd = debt.remainingInstallments
            ? (() => {
              const d = new Date();
              d.setMonth(d.getMonth() + debt.remainingInstallments);
              return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
            })()
            : 'A confirmar';

          return (
            <Card key={debt.id} style={{ marginBottom: 12, borderLeft: '4px solid #C0392B' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{debt.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>Credor: {debt.creditor || '—'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#C0392B' }}>{debt.remainingAmount ? fmtBRL(debt.remainingAmount) : 'A confirmar'}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#888' }}>restante</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 8 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>Parcela mensal</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{fmtBRL(debt.monthlyPayment)}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>Parcelas restantes</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{debt.remainingInstallments ?? 'A confirmar'}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>Próximo vencimento</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{debt.nextDueDate ? fmtDateBR(debt.nextDueDate) : '—'}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>Previsão de quitação</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#d68910' }}>{estimatedEnd}</p>
                </div>
              </div>

              {debt.notes && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#888', fontStyle: 'italic' }}>{debt.notes}</p>}
            </Card>
          );
        })}
      </Card>

      {/* Payoff strategy hint */}
      <Card style={{ background: '#fafaf8' }}>
        <SLabel>Estratégia de quitação</SLabel>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: '#555' }}>
          <strong>Método bola de neve:</strong> pague primeiro a menor dívida para liberar fluxo de caixa.
        </p>
        <p style={{ margin: 0, fontSize: 13, color: '#555' }}>
          <strong>Método avalanche:</strong> pague primeiro a dívida com maior taxa de juros para economizar mais.
        </p>
        {debts.length > 0 && (
          <p style={{ margin: '12px 0 0', fontSize: 12, color: '#888' }}>
            Sugestão: Com {fmtBRL(totalMonthly)}/mês comprometido em dívidas, priorize a reserva de emergência antes de antecipar parcelas.
          </p>
        )}
      </Card>

      {/* Related goals */}
      {goals.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <SLabel>Metas de quitação</SLabel>
          {goals.map(g => {
            const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
            return (
              <div key={g.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{g.name}</span>
                  <span style={{ fontSize: 12, color: '#888' }}>{pct}%</span>
                </div>
                <PBar pct={pct} color={g.color || '#E74C3C'} />
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
