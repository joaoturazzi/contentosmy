'use client';
import { useState } from 'react';
import { Card, Btn, SLabel, PBar, Empty, Modal, FormRow, Inp, Sel, toast } from '../ui';
import { uid, fmtBRL, curMonth, curYear } from '@/lib/utils';
import { FIN_BILL_ST, MONTHS } from '@/lib/constants';

export default function W3Cartoes({ w3, setW3 }) {
  const [month, setMonth] = useState(curMonth());
  const [year, setYear] = useState(curYear());
  const [detail, setDetail] = useState(null);

  const cards = (w3.credit_cards || []).filter(c => c.isActive);
  const bills = w3.card_bills || [];
  const txs = w3.transactions || [];

  const getBill = (cardId) => bills.find(b => b.cardId === cardId && b.month === month && b.year === year);

  // Credit transactions this month for a card
  const getCardSpend = (cardId) => {
    return txs.filter(t =>
      t.cardId === cardId && t.month === month && t.year === year && t.paymentMethod === 'credit_card'
    ).reduce((s, t) => s + (t.amount || 0), 0);
  };

  const markBillPaid = (cardId) => {
    const bill = getBill(cardId);
    if (bill) {
      setW3(d => ({
        ...d,
        card_bills: d.card_bills.map(b =>
          b.id === bill.id ? { ...b, status: 'paid', paidAmount: bill.totalAmount, paidAt: new Date().toISOString().slice(0, 10) } : b
        ),
      }));
    }
    toast('Fatura marcada como paga');
  };

  // Totals
  const totalLimit = cards.reduce((s, c) => s + (c.creditLimit || 0), 0);
  const totalBilled = cards.reduce((s, c) => {
    const bill = getBill(c.id);
    return s + (bill?.totalAmount || c.expectedMonthlyBill || 0);
  }, 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Cartões de Crédito</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>{MONTHS[month - 1]} {year}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={month} onChange={e => setMonth(+e.target.value)} style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e4e0' }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(+e.target.value)} style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e4e0' }}>
            <option value={2025}>2025</option><option value={2026}>2026</option><option value={2027}>2027</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <Card style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase' }}>Limite total</p>
          <p style={{ margin: '4px 0', fontSize: 20, fontWeight: 800 }}>{fmtBRL(totalLimit)}</p>
        </Card>
        <Card style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase' }}>Total faturas do mês</p>
          <p style={{ margin: '4px 0', fontSize: 20, fontWeight: 800, color: '#E74C3C' }}>{fmtBRL(totalBilled)}</p>
        </Card>
      </div>

      {/* Card list */}
      {cards.length === 0 && <Empty text="Nenhum cartão cadastrado" />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {cards.map(card => {
          const bill = getBill(card.id);
          const billAmount = bill?.totalAmount || card.expectedMonthlyBill || 0;
          const billStatus = bill?.status || 'open';
          const stInfo = FIN_BILL_ST[billStatus] || FIN_BILL_ST.open;
          const usagePct = card.creditLimit > 0 ? Math.round((billAmount / card.creditLimit) * 100) : 0;
          const currentSpend = getCardSpend(card.id);

          return (
            <Card key={card.id} style={{ borderLeft: `4px solid ${card.color || '#888'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{card.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>
                    {card.bank ? `${card.bank}` : ''} {card.lastFour ? `•••• ${card.lastFour}` : ''}
                  </p>
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: stInfo.bg, color: stInfo.color, fontWeight: 600 }}>
                  {stInfo.label}
                </span>
              </div>

              {card.creditLimit > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginBottom: 4 }}>
                    <span>Uso: {usagePct}%</span>
                    <span>Limite: {fmtBRL(card.creditLimit)}</span>
                  </div>
                  <PBar pct={usagePct} color={usagePct > 80 ? '#c0392b' : usagePct > 50 ? '#d68910' : '#0F9B58'} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: '#888' }}>Fatura</p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#E74C3C' }}>{fmtBRL(billAmount)}</p>
                </div>
                {card.dueDay && (
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#888' }}>Fecha dia {card.closingDay} · Vence dia {card.dueDay}</p>
                    {bill?.dueDate && <p style={{ margin: 0, fontSize: 11, color: '#d68910' }}>Venc: {bill.dueDate.split('-').reverse().join('/')}</p>}
                  </div>
                )}
              </div>

              {currentSpend > 0 && (
                <p style={{ margin: '4px 0 8px', fontSize: 11, color: '#888' }}>
                  Gastos no crédito este mês: {fmtBRL(currentSpend)}
                </p>
              )}

              <div style={{ display: 'flex', gap: 6 }}>
                {billStatus !== 'paid' && (
                  <Btn sm onClick={() => markBillPaid(card.id)}>Marcar como paga</Btn>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Note about double-counting */}
      <Card style={{ background: '#fef9e7', borderColor: '#f5d89a' }}>
        <p style={{ margin: 0, fontSize: 12, color: '#8a6d3b' }}>
          <strong>Lógica de dupla contagem:</strong> Gastos no cartão de crédito são registrados como "comprometidos" mas só saem da conta quando a fatura é paga.
          O dashboard diferencia "saída real" (débito, PIX, boleto) de "comprometido no crédito" (fatura futura).
        </p>
      </Card>
    </div>
  );
}
