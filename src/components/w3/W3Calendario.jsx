'use client';
import { useState } from 'react';
import { Card, SLabel, Empty } from '../ui';
import { fmtBRL, curMonth, curYear } from '@/lib/utils';
import { MONTHS, WDAYS, FIN_PAY } from '@/lib/constants';

export default function W3Calendario({ w3, setW3 }) {
  const [month, setMonth] = useState(curMonth());
  const [year, setYear] = useState(curYear());

  const fixedCosts = (w3.fixed_costs || []).filter(f => f.isActive);
  const cards = (w3.credit_cards || []).filter(c => c.isActive);
  const bills = (w3.card_bills || []).filter(b => b.month === month && b.year === year);
  const cats = w3.categories || [];
  const catMap = {};
  cats.forEach(c => { catMap[c.id] = c; });
  const cardMap = {};
  cards.forEach(c => { cardMap[c.id] = c; });

  // Build calendar events by day
  const events = {};
  const addEvent = (day, item) => {
    if (!day || day < 1 || day > 31) return;
    if (!events[day]) events[day] = [];
    events[day].push(item);
  };

  // Fixed costs by due_day
  fixedCosts.forEach(fc => {
    if (fc.dueDay) {
      addEvent(fc.dueDay, {
        type: 'fixed',
        label: fc.name,
        amount: fc.amount,
        color: catMap[fc.categoryId]?.color || '#888',
        method: FIN_PAY[fc.paymentMethod]?.label || fc.paymentMethod,
      });
    }
  });

  // Card closing days
  cards.forEach(card => {
    if (card.closingDay) {
      addEvent(card.closingDay, {
        type: 'card_close',
        label: `Fechamento ${card.name}`,
        amount: null,
        color: card.color || '#888',
        method: '',
      });
    }
    if (card.dueDay) {
      const bill = bills.find(b => b.cardId === card.id);
      addEvent(card.dueDay, {
        type: 'card_due',
        label: `Fatura ${card.name}`,
        amount: bill?.totalAmount || card.expectedMonthlyBill || null,
        color: card.color || '#888',
        method: 'Cartão Crédito',
      });
    }
  });

  // Calendar grid
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayDay = new Date().getDate();
  const isCurrentMonth = month === curMonth() && year === curYear();

  const dayTotals = {};
  Object.entries(events).forEach(([day, items]) => {
    dayTotals[day] = items.reduce((s, e) => s + (e.amount || 0), 0);
  });
  const maxDayTotal = Math.max(...Object.values(dayTotals), 1);

  const cells = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Calendário Financeiro</h1>
        <select value={month} onChange={e => setMonth(+e.target.value)} style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e4e0' }}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(+e.target.value)} style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e4e0' }}>
          <option value={2025}>2025</option><option value={2026}>2026</option><option value={2027}>2027</option>
        </select>
      </div>

      {/* Calendar grid */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: '#eceae5' }}>
          {/* Header */}
          {WDAYS.map(d => (
            <div key={d} style={{ padding: '6px 4px', background: '#fafaf8', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#aaa' }}>{d}</div>
          ))}

          {/* Days */}
          {cells.map((day, idx) => {
            if (!day) return <div key={`e${idx}`} style={{ background: '#fafaf8', minHeight: 80 }} />;
            const dayEvents = events[day] || [];
            const total = dayTotals[day] || 0;
            const intensity = total > 0 ? Math.min(1, total / maxDayTotal) : 0;
            const bg = intensity > 0
              ? `rgba(231, 76, 60, ${intensity * 0.15})`
              : '#fff';

            return (
              <div key={day} style={{
                background: bg,
                minHeight: 80,
                padding: '4px 6px',
                border: isCurrentMonth && day === todayDay ? '2px solid #0F9B58' : 'none',
                borderRadius: isCurrentMonth && day === todayDay ? 4 : 0,
              }}>
                <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 700, color: isCurrentMonth && day === todayDay ? '#0F9B58' : '#555' }}>{day}</p>
                {dayEvents.slice(0, 3).map((ev, i) => (
                  <div key={i} style={{ fontSize: 10, lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: ev.color, marginRight: 3, verticalAlign: 'middle' }} />
                    <span style={{ color: ev.type === 'card_close' ? '#d68910' : '#555' }}>
                      {ev.label.length > 18 ? ev.label.slice(0, 18) + '…' : ev.label}
                    </span>
                    {ev.amount && <span style={{ color: '#E74C3C', fontWeight: 600 }}> {fmtBRL(ev.amount)}</span>}
                  </div>
                ))}
                {dayEvents.length > 3 && <p style={{ margin: 0, fontSize: 10, color: '#aaa' }}>+{dayEvents.length - 3} mais</p>}
                {total > 0 && (
                  <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 700, color: '#E74C3C' }}>{fmtBRL(total)}</p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Day-by-day list */}
      <Card style={{ marginTop: 16 }}>
        <SLabel>Eventos do mês</SLabel>
        {Object.keys(events).length === 0 && <Empty text="Nenhum evento financeiro neste mês" />}
        {Object.entries(events)
          .sort((a, b) => +a[0] - +b[0])
          .map(([day, items]) => (
            <div key={day} style={{ marginBottom: 12 }}>
              <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#888' }}>Dia {day}</p>
              {items.map((ev, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: ev.type === 'card_close' ? '#d68910' : '#555' }}>{ev.label}</span>
                  {ev.amount && <span style={{ fontSize: 12, fontWeight: 700, color: '#E74C3C' }}>{fmtBRL(ev.amount)}</span>}
                  {ev.method && <span style={{ fontSize: 10, color: '#aaa' }}>{ev.method}</span>}
                </div>
              ))}
            </div>
          ))}
      </Card>
    </div>
  );
}
