'use client';
import { useState } from 'react';
import { Card, SLabel, PBar, Empty } from '../ui';
import { fmtBRL, fmtDateBR, curMonth, curYear } from '@/lib/utils';
import { FIN_ST, FIN_PAY, MONTHS, FIN_FUNDED } from '@/lib/constants';

export default function W3Dashboard({ w3, setW3 }) {
  const [month] = useState(curMonth());
  const [year] = useState(curYear());

  const cats = w3.categories || [];
  const income = (w3.income_sources || []).filter(i => i.month === month && i.year === year);
  const fixedCosts = (w3.fixed_costs || []).filter(f => f.isActive);
  const payments = (w3.fixed_payments || []).filter(p => p.month === month && p.year === year);
  const txs = (w3.transactions || []).filter(t => t.month === month && t.year === year);
  const reserve = (w3.emergency_reserve || []).find(r => r.month === month && r.year === year);
  const cards = w3.credit_cards || [];
  const bills = (w3.card_bills || []).filter(b => b.month === month && b.year === year);
  const debts = (w3.debts || []).filter(d => d.isActive);
  const goals = (w3.goals || []).filter(g => !g.isAchieved);
  const alerts = (w3.alerts || []).filter(a => !a.isDismissed && !a.isRead);

  const catMap = {};
  cats.forEach(c => { catMap[c.id] = c; });

  // Income
  const totalExpectedIncome = income.reduce((s, i) => s + (i.expectedAmount || 0), 0);
  const totalReceivedIncome = income.reduce((s, i) => s + (i.actualAmount || 0), 0);

  // Fixed costs
  const totalFixedsPaid = payments.filter(p => p.status === 'paid').length;
  const totalFixeds = fixedCosts.length;
  const totalFixedAmount = fixedCosts.reduce((s, f) => s + (f.amount || 0), 0);
  const paidFixedAmount = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.paidAmount || 0), 0);

  // DOUBLE-COUNTING LOGIC
  // Real outflows: PIX, debit, debit_auto, boleto + paid card bills
  const realOutflows = txs
    .filter(t => t.type === 'expense' && t.paymentMethod !== 'credit_card')
    .reduce((s, t) => s + (t.amount || 0), 0);
  const paidBillsAmount = bills.filter(b => b.status === 'paid').reduce((s, b) => s + (b.paidAmount || b.totalAmount || 0), 0);
  const totalRealOut = realOutflows + paidBillsAmount;

  // Committed on credit (future)
  const creditCommitted = txs
    .filter(t => t.type === 'expense' && t.paymentMethod === 'credit_card')
    .reduce((s, t) => s + (t.amount || 0), 0);

  // Variable expenses (non-fixed, non-credit)
  const variableTxs = txs.filter(t => !t.isFixed && t.type === 'expense' && t.paymentMethod !== 'credit_card');
  const totalVariable = variableTxs.reduce((s, t) => s + (t.amount || 0), 0);

  // Business vs personal split
  const businessExpenses = txs.filter(t => t.isBusiness && t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
  const personalExpenses = txs.filter(t => !t.isBusiness && t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

  const effectiveIncome = totalReceivedIncome || totalExpectedIncome;
  const saldoDisponivel = effectiveIncome - totalRealOut;

  // Reserve
  const accReserve = reserve?.accumulatedTotal || 0;
  const targetPhase1 = reserve?.targetPhase1 || 5557;
  const reservePct = targetPhase1 > 0 ? Math.round((accReserve / targetPhase1) * 100) : 0;

  // Debts
  const totalDebt = debts.reduce((s, d) => s + (d.remainingAmount || 0), 0);
  const totalDebtMonthly = debts.reduce((s, d) => s + (d.monthlyPayment || 0), 0);

  // Extra income allocation
  const incomeByFund = {};
  income.forEach(i => {
    const fb = i.fundedBy || 'renda_principal';
    incomeByFund[fb] = (incomeByFund[fb] || 0) + (i.actualAmount || i.expectedAmount || 0);
  });
  const fixedByFund = {};
  fixedCosts.forEach(f => {
    const fb = f.fundedBy || 'renda_principal';
    fixedByFund[fb] = (fixedByFund[fb] || 0) + (f.amount || 0);
  });

  // Category breakdown
  const catTotals = {};
  variableTxs.forEach(t => {
    const cid = t.categoryId || 'outros';
    catTotals[cid] = (catTotals[cid] || 0) + (t.amount || 0);
  });

  const last10 = [...txs].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 10);

  const mc = (label, value, sub, color) => (
    <Card style={{ flex: 1, minWidth: 150 }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '6px 0 2px', fontSize: 20, fontWeight: 800, color: color || '#1a1a1a' }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: 11, color: '#888' }}>{sub}</p>}
    </Card>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Dashboard Financeiro</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>{MONTHS[month - 1]} {year}</p>
        </div>
        {alerts.length > 0 && (
          <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 12, background: '#fdf2f2', color: '#c0392b', fontWeight: 700 }}>
            {alerts.length} alerta{alerts.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Primary metrics */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {mc('Entradas do mês', fmtBRL(totalReceivedIncome || totalExpectedIncome), totalReceivedIncome ? `Recebido de ${fmtBRL(totalExpectedIncome)}` : 'Esperado', '#0F9B58')}
        {mc('Saiu da conta', fmtBRL(totalRealOut), 'Débito + PIX + boleto + faturas pagas', '#E74C3C')}
        {mc('Comprometido crédito', fmtBRL(creditCommitted), 'Sairá nas próximas faturas', '#d68910')}
        {mc('Saldo disponível', fmtBRL(saldoDisponivel), saldoDisponivel >= 0 ? 'Positivo' : 'Negativo', saldoDisponivel >= 0 ? '#0F9B58' : '#E74C3C')}
        {mc('Reserva emergência', fmtBRL(accReserve), `${reservePct}% da Fase 1`, '#F5A623')}
      </div>

      {/* Business vs Personal + Debts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <Card>
          <SLabel>Pessoal vs Empresa</SLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#E67E22' }} />
            <span style={{ flex: 1, fontSize: 12 }}>Pessoal</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtBRL(personalExpenses)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#34495E' }} />
            <span style={{ flex: 1, fontSize: 12 }}>Empresa</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtBRL(businessExpenses)}</span>
          </div>
        </Card>

        <Card>
          <SLabel>Dívidas ativas</SLabel>
          <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#C0392B' }}>{fmtBRL(totalDebt)}</p>
          <p style={{ margin: 0, fontSize: 11, color: '#888' }}>Comprometido: {fmtBRL(totalDebtMonthly)}/mês</p>
        </Card>

        <Card>
          <SLabel>Alocação entradas extras</SLabel>
          {Object.entries(FIN_FUNDED).filter(([k]) => k !== 'renda_principal').map(([key, label]) => {
            const received = incomeByFund[key] || 0;
            const spent = fixedByFund[key] || 0;
            const sobra = received - spent;
            return (
              <div key={key} style={{ marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: '#888' }}>{label}: </span>
                <span style={{ fontWeight: 600 }}>{fmtBRL(received)}</span>
                <span style={{ color: '#888' }}> → gasto {fmtBRL(spent)}</span>
                <span style={{ color: sobra >= 0 ? '#0F9B58' : '#E74C3C', fontWeight: 600 }}> · sobra {fmtBRL(sobra)}</span>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Fixos + Category breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <Card>
          <SLabel>Fixos pagos</SLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <PBar pct={totalFixeds > 0 ? (totalFixedsPaid / totalFixeds) * 100 : 0} color="#0F9B58" />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{totalFixedsPaid}/{totalFixeds}</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#888' }}>{fmtBRL(paidFixedAmount)} de {fmtBRL(totalFixedAmount)} pagos</p>
        </Card>

        <Card>
          <SLabel>Gastos variáveis por categoria</SLabel>
          {Object.keys(catTotals).length === 0 && <Empty text="Nenhum gasto variável" />}
          {Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([cid, total]) => {
            const cat = catMap[cid];
            return (
              <div key={cid} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 2, background: cat?.color || '#ccc', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: '#555' }}>{cat?.name || 'Outros'}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{fmtBRL(total)}</span>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Goals */}
      {goals.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <SLabel>Metas financeiras</SLabel>
          {goals.map(g => {
            const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
            return (
              <div key={g.id} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{g.name}</span>
                  <span style={{ fontSize: 11, color: '#888' }}>{fmtBRL(g.currentAmount)} / {fmtBRL(g.targetAmount)}</span>
                </div>
                <PBar pct={pct} color={g.color || '#0F9B58'} />
              </div>
            );
          })}
        </Card>
      )}

      {/* Last transactions */}
      <Card>
        <SLabel>Últimas transações</SLabel>
        {last10.length === 0 && <Empty text="Nenhuma transação registrada" />}
        {last10.map(tx => {
          const cat = catMap[tx.categoryId];
          return (
            <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #f5f4f1' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: cat?.color || '#ccc', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.description}
                  {tx.isBusiness && <span style={{ fontSize: 10, marginLeft: 6, padding: '1px 4px', borderRadius: 3, background: '#34495E', color: '#fff' }}>Empresa</span>}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>
                  {fmtDateBR(tx.transactionDate)} {tx.merchant ? `· ${tx.merchant}` : ''}
                  {tx.paymentMethod === 'credit_card' && <span style={{ color: '#d68910' }}> · Crédito</span>}
                </p>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: tx.type === 'income' ? '#0F9B58' : '#E74C3C' }}>
                {tx.type === 'income' ? '+' : '-'}{fmtBRL(tx.amount)}
              </span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
