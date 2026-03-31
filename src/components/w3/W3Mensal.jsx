'use client';
import { useState } from 'react';
import { Card, Btn, SLabel, Empty, PBar, toast } from '../ui';
import { uid, fmtBRL, curMonth, curYear } from '@/lib/utils';
import { FIN_ST, FIN_PAY, MONTHS } from '@/lib/constants';

export default function W3Mensal({ w3, setW3 }) {
  const [month, setMonth] = useState(curMonth());
  const [year, setYear] = useState(curYear());

  const cats = w3.categories || [];
  const catMap = {};
  cats.forEach(c => { catMap[c.id] = c; });

  const income = (w3.income_sources || []).filter(i => i.month === month && i.year === year);
  const fixedCosts = (w3.fixed_costs || []).filter(f => f.isActive);
  const payments = (w3.fixed_payments || []).filter(p => p.month === month && p.year === year);
  const txs = (w3.transactions || []).filter(t => t.month === month && t.year === year);
  const budgets = (w3.monthly_budgets || []).filter(b => b.month === month && b.year === year);

  // Payment map: fixed_cost_id -> payment
  const payMap = {};
  payments.forEach(p => { payMap[p.fixedCostId] = p; });

  // Mark income as received
  const markReceived = (inc, val) => {
    setW3(d => ({
      ...d,
      income_sources: d.income_sources.map(i => i.id === inc.id
        ? { ...i, actualAmount: parseFloat(val) || inc.expectedAmount, receivedAt: new Date().toISOString().slice(0, 10) }
        : i
      ),
    }));
    toast('Receita atualizada');
  };

  // Mark fixed as paid
  const markPaid = (fc) => {
    const existing = payMap[fc.id];
    if (existing) {
      setW3(d => ({
        ...d,
        fixed_payments: d.fixed_payments.map(p => p.id === existing.id
          ? { ...p, status: 'paid', paidAmount: fc.amount, paidAt: new Date().toISOString().slice(0, 10) }
          : p
        ),
      }));
    } else {
      const newPayment = {
        id: uid(), fixedCostId: fc.id, month, year,
        budgetedAmount: fc.amount, paidAmount: fc.amount,
        status: 'paid', paidAt: new Date().toISOString().slice(0, 10),
        notes: '', createdAt: new Date().toISOString(),
      };
      setW3(d => ({ ...d, fixed_payments: [...d.fixed_payments, newPayment] }));
    }
    toast('Marcado como pago');
  };

  // Group fixedCosts by category
  const fixedByCat = {};
  fixedCosts.forEach(fc => {
    const cat = catMap[fc.categoryId];
    const name = cat?.name || 'Outros';
    if (!fixedByCat[name]) fixedByCat[name] = { items: [], color: cat?.color || '#ccc' };
    fixedByCat[name].items.push(fc);
  });

  // Variable categories
  const variableCats = cats.filter(c => c.type === 'expense' && !c.isFixed);
  const variableTxs = txs.filter(t => !t.isFixed && t.type === 'expense');

  // Totals
  const totalEntradas = income.reduce((s, i) => s + (i.actualAmount || i.expectedAmount || 0), 0);
  const totalFixos = fixedCosts.reduce((s, f) => s + (f.amount || 0), 0);
  const totalVariaveis = variableTxs.reduce((s, t) => s + (t.amount || 0), 0);
  const saldo = totalEntradas - totalFixos - totalVariaveis;
  const reservaSugerida = saldo > 0 ? Math.round(saldo * 0.3) : 0;

  const monthOpts = [];
  for (let m = 1; m <= 12; m++) monthOpts.push(m);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Visão Mensal</h1>
        <select value={month} onChange={e => setMonth(+e.target.value)} style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e4e0', background: '#fff' }}>
          {monthOpts.map(m => <option key={m} value={m}>{MONTHS[m - 1]}</option>)}
        </select>
        <select value={year} onChange={e => setYear(+e.target.value)} style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e4e0', background: '#fff' }}>
          <option value={2025}>2025</option><option value={2026}>2026</option><option value={2027}>2027</option>
        </select>
      </div>

      {/* ENTRADAS */}
      <Card style={{ marginBottom: 16 }}>
        <SLabel>Entradas</SLabel>
        {income.length === 0 && <Empty text="Nenhuma fonte de renda cadastrada para este mês" />}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #eceae5', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Nome</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Esperado</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Recebido</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Status</th>
              <th style={{ padding: '6px 8px' }}></th>
            </tr>
          </thead>
          <tbody>
            {income.map(inc => (
              <tr key={inc.id} style={{ borderBottom: '1px solid #f5f4f1' }}>
                <td style={{ padding: '8px' }}>{inc.name}</td>
                <td style={{ padding: '8px' }}>{fmtBRL(inc.expectedAmount)}</td>
                <td style={{ padding: '8px', fontWeight: 600 }}>{inc.actualAmount ? fmtBRL(inc.actualAmount) : '—'}</td>
                <td style={{ padding: '8px' }}>
                  {inc.receivedAt
                    ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#eafaf1', color: '#1e8449', fontWeight: 600 }}>Recebido</span>
                    : <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#fef9e7', color: '#d68910', fontWeight: 600 }}>Pendente</span>
                  }
                </td>
                <td style={{ padding: '8px' }}>
                  {!inc.receivedAt && (
                    <Btn sm onClick={() => markReceived(inc, inc.expectedAmount)}>Recebido</Btn>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* FIXOS */}
      <Card style={{ marginBottom: 16 }}>
        <SLabel>Custos Fixos</SLabel>
        {Object.entries(fixedByCat).map(([catName, { items, color }]) => (
          <div key={catName} style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color }}>{catName}</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eceae5', textAlign: 'left' }}>
                  <th style={{ padding: '4px 8px', fontWeight: 600, color: '#aaa', fontSize: 11 }}>Item</th>
                  <th style={{ padding: '4px 8px', fontWeight: 600, color: '#aaa', fontSize: 11 }}>Venc.</th>
                  <th style={{ padding: '4px 8px', fontWeight: 600, color: '#aaa', fontSize: 11 }}>Valor</th>
                  <th style={{ padding: '4px 8px', fontWeight: 600, color: '#aaa', fontSize: 11 }}>Forma</th>
                  <th style={{ padding: '4px 8px', fontWeight: 600, color: '#aaa', fontSize: 11 }}>Status</th>
                  <th style={{ padding: '4px 8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map(fc => {
                  const pay = payMap[fc.id];
                  const st = pay?.status || 'pending';
                  const stInfo = FIN_ST[st];
                  return (
                    <tr key={fc.id} style={{ borderBottom: '1px solid #f5f4f1' }}>
                      <td style={{ padding: '6px 8px' }}>{fc.name}</td>
                      <td style={{ padding: '6px 8px', color: '#888' }}>{fc.dueDay ? `Dia ${fc.dueDay}` : '—'}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{fmtBRL(fc.amount)}</td>
                      <td style={{ padding: '6px 8px', color: '#888' }}>{FIN_PAY[fc.paymentMethod]?.label || fc.paymentMethod}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: stInfo.bg, color: stInfo.color, fontWeight: 600 }}>{stInfo.label}</span>
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        {st !== 'paid' && <Btn sm onClick={() => markPaid(fc)}>Pagar</Btn>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </Card>

      {/* VARIÁVEIS */}
      <Card style={{ marginBottom: 16 }}>
        <SLabel>Gastos Variáveis</SLabel>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #eceae5', textAlign: 'left' }}>
              <th style={{ padding: '4px 8px', fontWeight: 600, color: '#aaa', fontSize: 11 }}>Categoria</th>
              <th style={{ padding: '4px 8px', fontWeight: 600, color: '#aaa', fontSize: 11 }}>Orçado</th>
              <th style={{ padding: '4px 8px', fontWeight: 600, color: '#aaa', fontSize: 11 }}>Gasto real</th>
              <th style={{ padding: '4px 8px', fontWeight: 600, color: '#aaa', fontSize: 11 }}>Saldo</th>
              <th style={{ padding: '4px 8px', fontWeight: 600, color: '#aaa', fontSize: 11, width: 200 }}>Progresso</th>
            </tr>
          </thead>
          <tbody>
            {variableCats.map(cat => {
              const budget = budgets.find(b => b.categoryId === cat.id);
              const budgeted = budget?.budgetedAmount || 0;
              const spent = variableTxs.filter(t => t.categoryId === cat.id).reduce((s, t) => s + (t.amount || 0), 0);
              const remaining = budgeted - spent;
              const pct = budgeted > 0 ? (spent / budgeted) * 100 : 0;
              const barColor = pct > 100 ? '#c0392b' : pct > 80 ? '#d68910' : '#0F9B58';
              return (
                <tr key={cat.id} style={{ borderBottom: '1px solid #f5f4f1' }}>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 2, background: cat.color, flexShrink: 0 }} />{cat.name}
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px', color: '#888' }}>{budgeted ? fmtBRL(budgeted) : '—'}</td>
                  <td style={{ padding: '6px 8px', fontWeight: 600 }}>{fmtBRL(spent)}</td>
                  <td style={{ padding: '6px 8px', color: remaining >= 0 ? '#0F9B58' : '#c0392b', fontWeight: 600 }}>{fmtBRL(remaining)}</td>
                  <td style={{ padding: '6px 8px' }}><PBar pct={pct} color={barColor} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* RODAPÉ */}
      <Card style={{ background: '#fafaf8' }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 14 }}>
          <div><span style={{ color: '#888', fontSize: 12 }}>Total entradas</span><p style={{ margin: '2px 0 0', fontWeight: 800, color: '#0F9B58' }}>{fmtBRL(totalEntradas)}</p></div>
          <div><span style={{ color: '#888', fontSize: 12 }}>Total saídas</span><p style={{ margin: '2px 0 0', fontWeight: 800, color: '#E74C3C' }}>{fmtBRL(totalFixos + totalVariaveis)}</p></div>
          <div><span style={{ color: '#888', fontSize: 12 }}>Saldo</span><p style={{ margin: '2px 0 0', fontWeight: 800, color: saldo >= 0 ? '#0F9B58' : '#E74C3C' }}>{fmtBRL(saldo)}</p></div>
          <div><span style={{ color: '#888', fontSize: 12 }}>Reserva sugerida (30%)</span><p style={{ margin: '2px 0 0', fontWeight: 800, color: '#F5A623' }}>{fmtBRL(reservaSugerida)}</p></div>
        </div>
      </Card>
    </div>
  );
}
