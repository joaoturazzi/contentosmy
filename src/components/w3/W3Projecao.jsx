'use client';
import { useState } from 'react';
import { Card, SLabel, Inp } from '../ui';
import { fmtBRL } from '@/lib/utils';
import { MONTHS } from '@/lib/constants';

export default function W3Projecao({ w3, setW3 }) {
  const fixedCosts = (w3.fixed_costs || []).filter(f => f.isActive);
  const incomeSources = w3.income_sources || [];

  // Months: Jun-Dec 2026
  const months = [6, 7, 8, 9, 10, 11, 12];
  const year = 2026;

  // Editable variable estimates per month
  const [varEstimates, setVarEstimates] = useState(() => {
    const m = {};
    months.forEach(mo => { m[mo] = 2500; }); // default estimate
    return m;
  });

  // Income per month
  const getIncome = (mo) => {
    const items = incomeSources.filter(i => i.month === mo && i.year === year);
    if (items.length > 0) return items.reduce((s, i) => s + (i.actualAmount || i.expectedAmount || 0), 0);
    // Default from templates
    return 20000; // 15k + 3k + 2k
  };

  // Income breakdown
  const getIncomeBreakdown = (mo) => {
    const items = incomeSources.filter(i => i.month === mo && i.year === year);
    if (items.length > 0) return items;
    return [
      { name: 'Renda Principal', expectedAmount: 15000 },
      { name: 'Entrada Mazul', expectedAmount: 3000 },
      { name: 'Entrada Patagon', expectedAmount: 2000 },
    ];
  };

  const totalFixos = fixedCosts.reduce((s, f) => s + (f.amount || 0), 0);

  let accReserve = 0;

  const rows = months.map(mo => {
    const income = getIncome(mo);
    const fixos = totalFixos;
    const variaveis = varEstimates[mo] || 0;
    const saldo = income - fixos - variaveis;
    const reserva = saldo > 0 ? Math.round(saldo * 0.3) : 0;
    accReserve += reserva;
    return { mo, income, fixos, variaveis, saldo, reserva, accReserve };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      income: acc.income + r.income,
      fixos: acc.fixos + r.fixos,
      variaveis: acc.variaveis + r.variaveis,
      saldo: acc.saldo + r.saldo,
      reserva: acc.reserva + r.reserva,
    }),
    { income: 0, fixos: 0, variaveis: 0, saldo: 0, reserva: 0 }
  );

  const cellStyle = { padding: '8px 10px', textAlign: 'right', fontSize: 13, borderBottom: '1px solid #f5f4f1' };
  const headStyle = { ...cellStyle, fontWeight: 700, color: '#aaa', fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #eceae5' };
  const labelStyle = { ...cellStyle, textAlign: 'left', fontWeight: 600, color: '#555' };

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Projeção 2026</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>Junho — Dezembro · Estimativa baseada nos custos fixos atuais</p>

      {/* Income breakdown */}
      <Card style={{ marginBottom: 16 }}>
        <SLabel>Fontes de renda mensais</SLabel>
        <div style={{ display: 'flex', gap: 16 }}>
          {getIncomeBreakdown(months[0]).map((src, i) => (
            <div key={i} style={{ fontSize: 13 }}>
              <span style={{ color: '#888' }}>{src.name}: </span>
              <span style={{ fontWeight: 700 }}>{fmtBRL(src.actualAmount || src.expectedAmount)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ ...headStyle, textAlign: 'left' }}>Linha</th>
                {months.map(mo => <th key={mo} style={headStyle}>{MONTHS[mo - 1].slice(0, 3)}</th>)}
                <th style={{ ...headStyle, fontWeight: 800 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {/* Entradas */}
              <tr>
                <td style={{ ...labelStyle, color: '#0F9B58' }}>Entradas</td>
                {rows.map(r => <td key={r.mo} style={{ ...cellStyle, color: '#0F9B58', fontWeight: 600 }}>{fmtBRL(r.income)}</td>)}
                <td style={{ ...cellStyle, color: '#0F9B58', fontWeight: 800 }}>{fmtBRL(totals.income)}</td>
              </tr>
              {/* Fixos */}
              <tr>
                <td style={{ ...labelStyle, color: '#E74C3C' }}>Fixos</td>
                {rows.map(r => <td key={r.mo} style={{ ...cellStyle, color: '#E74C3C' }}>{fmtBRL(r.fixos)}</td>)}
                <td style={{ ...cellStyle, color: '#E74C3C', fontWeight: 800 }}>{fmtBRL(totals.fixos)}</td>
              </tr>
              {/* Variáveis (editável) */}
              <tr>
                <td style={labelStyle}>Variáveis (est.)</td>
                {rows.map(r => (
                  <td key={r.mo} style={{ ...cellStyle, padding: '4px 6px' }}>
                    <Inp
                      type="number" step="100"
                      value={varEstimates[r.mo]}
                      onChange={e => setVarEstimates(v => ({ ...v, [r.mo]: parseFloat(e.target.value) || 0 }))}
                      style={{ width: 80, textAlign: 'right', fontSize: 12, padding: '3px 6px' }}
                    />
                  </td>
                ))}
                <td style={{ ...cellStyle, fontWeight: 800 }}>{fmtBRL(totals.variaveis)}</td>
              </tr>
              {/* Saldo */}
              <tr style={{ background: '#fafaf8' }}>
                <td style={{ ...labelStyle, fontWeight: 800 }}>Saldo</td>
                {rows.map(r => (
                  <td key={r.mo} style={{ ...cellStyle, fontWeight: 700, color: r.saldo >= 0 ? '#0F9B58' : '#E74C3C' }}>{fmtBRL(r.saldo)}</td>
                ))}
                <td style={{ ...cellStyle, fontWeight: 800, color: totals.saldo >= 0 ? '#0F9B58' : '#E74C3C' }}>{fmtBRL(totals.saldo)}</td>
              </tr>
              {/* Reserva 30% */}
              <tr>
                <td style={{ ...labelStyle, color: '#F5A623' }}>Reserva (30%)</td>
                {rows.map(r => <td key={r.mo} style={{ ...cellStyle, color: '#F5A623' }}>{fmtBRL(r.reserva)}</td>)}
                <td style={{ ...cellStyle, color: '#F5A623', fontWeight: 800 }}>{fmtBRL(totals.reserva)}</td>
              </tr>
              {/* Reserva acumulada */}
              <tr style={{ background: '#fef9e7' }}>
                <td style={{ ...labelStyle, fontWeight: 800, color: '#d68910' }}>Reserva acumulada</td>
                {rows.map(r => <td key={r.mo} style={{ ...cellStyle, fontWeight: 700, color: '#d68910' }}>{fmtBRL(r.accReserve)}</td>)}
                <td style={{ ...cellStyle, fontWeight: 800, color: '#d68910' }}>{fmtBRL(accReserve)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
