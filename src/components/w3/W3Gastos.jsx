'use client';
import { useState } from 'react';
import { Card, Inp, Sel, Btn, SLabel, FPill, Empty, toast } from '../ui';
import { uid, fmtBRL, fmtDateBR, today, curMonth, curYear } from '@/lib/utils';
import { FIN_PAY, MONTHS } from '@/lib/constants';

export default function W3Gastos({ w3, setW3 }) {
  const [month, setMonth] = useState(curMonth());
  const [year, setYear] = useState(curYear());
  const [filterCat, setFilterCat] = useState('all');
  const [filterPay, setFilterPay] = useState('all');
  const [filterBiz, setFilterBiz] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [editId, setEditId] = useState(null);

  const cats = w3.categories || [];
  const expenseCats = cats.filter(c => c.type === 'expense');
  const cards = w3.credit_cards || [];
  const txs = (w3.transactions || []).filter(t => t.month === month && t.year === year);

  const blank = () => ({
    id: uid(), description: '', merchant: '', amount: '', type: 'expense',
    categoryId: expenseCats[0]?.id || '', paymentMethod: 'pix', cardName: '', cardId: '',
    transactionDate: today(), month, year, isFixed: false, isBusiness: false,
    fixedCostId: '', source: 'manual', externalId: '',
    notes: '', createdBy: '', createdAt: new Date().toISOString(),
  });
  const [draft, setDraft] = useState(blank());

  const save = () => {
    if (!draft.description?.trim()) { toast('Preencha a descrição'); return; }
    const amt = parseFloat(draft.amount);
    if (!amt || amt <= 0) { toast('Preencha o valor'); return; }

    // Future date warning
    if (draft.transactionDate > today()) {
      if (!confirm('Data futura detectada. Confirmar?')) return;
    }
    // High value warning
    if (amt > 2000) {
      if (!confirm(`Valor alto (${fmtBRL(amt)}). Confirmar?`)) return;
    }

    const d = new Date(draft.transactionDate + 'T12:00');
    const item = {
      ...draft, amount: amt,
      month: d.getMonth() + 1, year: d.getFullYear(),
    };
    setW3(data => ({
      ...data,
      transactions: [item, ...data.transactions.filter(t => t.id !== item.id)],
    }));
    setDraft(blank());
    setEditId(null);
    toast('Gasto salvo');
  };

  const remove = (id) => {
    setW3(data => ({ ...data, transactions: data.transactions.filter(t => t.id !== id) }));
    toast('Removido');
  };

  const startEdit = (tx) => {
    setDraft({ ...tx, amount: String(tx.amount) });
    setEditId(tx.id);
  };

  // Filters
  let visible = txs;
  if (filterCat !== 'all') visible = visible.filter(t => t.categoryId === filterCat);
  if (filterPay !== 'all') visible = visible.filter(t => t.paymentMethod === filterPay);
  if (filterBiz === 'personal') visible = visible.filter(t => !t.isBusiness);
  if (filterBiz === 'business') visible = visible.filter(t => t.isBusiness);
  if (search.trim()) {
    const q = search.toLowerCase();
    visible = visible.filter(t =>
      (t.description || '').toLowerCase().includes(q) ||
      (t.merchant || '').toLowerCase().includes(q) ||
      (t.notes || '').toLowerCase().includes(q)
    );
  }

  // Sort
  if (sortBy === 'date') visible = [...visible].sort((a, b) => (b.transactionDate || '').localeCompare(a.transactionDate || ''));
  if (sortBy === 'amount_desc') visible = [...visible].sort((a, b) => (b.amount || 0) - (a.amount || 0));
  if (sortBy === 'amount_asc') visible = [...visible].sort((a, b) => (a.amount || 0) - (b.amount || 0));

  // Group by date
  const grouped = {};
  visible.forEach(t => {
    const d = t.transactionDate || 'sem-data';
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(t);
  });

  const catMap = {};
  cats.forEach(c => { catMap[c.id] = c; });
  const cardMap = {};
  cards.forEach(c => { cardMap[c.id] = c; });

  const totalMonth = visible.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

  // Category chips
  const catBreakdown = {};
  visible.filter(t => t.type === 'expense').forEach(t => {
    const cat = catMap[t.categoryId];
    const name = cat?.name || 'Outros';
    catBreakdown[name] = (catBreakdown[name] || 0) + (t.amount || 0);
  });

  const up = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Gastos Diários</h1>
        <select value={month} onChange={e => setMonth(+e.target.value)} style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e4e0' }}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(+e.target.value)} style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e4e0' }}>
          <option value={2025}>2025</option><option value={2026}>2026</option><option value={2027}>2027</option>
        </select>
      </div>

      {/* New expense form */}
      <Card style={{ marginBottom: 16 }}>
        <SLabel>{editId ? 'Editar gasto' : 'Novo gasto'}</SLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
          <Inp type="date" value={draft.transactionDate} onChange={e => up('transactionDate', e.target.value)} />
          <Inp placeholder="Descrição" value={draft.description} onChange={e => up('description', e.target.value)} />
          <Inp placeholder="Estabelecimento" value={draft.merchant} onChange={e => up('merchant', e.target.value)} />
          <Sel value={draft.categoryId} onChange={e => up('categoryId', e.target.value)}>
            {expenseCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Sel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '100px 130px 130px 1fr auto', gap: 8, alignItems: 'start' }}>
          <Inp type="number" step="0.01" placeholder="Valor" value={draft.amount} onChange={e => up('amount', e.target.value)} />
          <Sel value={draft.paymentMethod} onChange={e => up('paymentMethod', e.target.value)}>
            {Object.entries(FIN_PAY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Sel>
          {draft.paymentMethod === 'credit_card' && (
            <Sel value={draft.cardId} onChange={e => { up('cardId', e.target.value); const c = cards.find(c => c.id === e.target.value); if (c) up('cardName', c.name); }}>
              <option value="">Selecione cartão</option>
              {cards.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Sel>
          )}
          <Inp placeholder="Observação" value={draft.notes} onChange={e => up('notes', e.target.value)} />
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={draft.isBusiness} onChange={e => up('isBusiness', e.target.checked)} /> Empresa
            </label>
            <Btn onClick={save}>{editId ? 'Atualizar' : 'Salvar'}</Btn>
            {editId && <Btn variant="ghost" onClick={() => { setDraft(blank()); setEditId(null); }}>X</Btn>}
          </div>
        </div>
      </Card>

      {/* Summary + Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Total: {fmtBRL(totalMonth)}</span>
        <Inp placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200, fontSize: 12, padding: '4px 8px' }} />
        <Sel value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 140, fontSize: 12, padding: '4px 8px' }}>
          <option value="date">Mais recente</option>
          <option value="amount_desc">Maior valor</option>
          <option value="amount_asc">Menor valor</option>
        </Sel>
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        {Object.entries(catBreakdown).slice(0, 8).map(([name, total]) => (
          <span key={name} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: '#f5f4f1', color: '#555' }}>{name}: {fmtBRL(total)}</span>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        <FPill label="Todas" active={filterCat === 'all'} onClick={() => setFilterCat('all')} />
        {expenseCats.slice(0, 8).map(c => (
          <FPill key={c.id} label={c.name} active={filterCat === c.id} color={c.color} onClick={() => setFilterCat(filterCat === c.id ? 'all' : c.id)} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        <FPill label="Todos" active={filterPay === 'all'} onClick={() => setFilterPay('all')} />
        {Object.entries(FIN_PAY).map(([k, v]) => (
          <FPill key={k} label={v.label} active={filterPay === k} color={v.color} onClick={() => setFilterPay(filterPay === k ? 'all' : k)} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        <FPill label="Todos" active={filterBiz === 'all'} onClick={() => setFilterBiz('all')} />
        <FPill label="Pessoal" active={filterBiz === 'personal'} onClick={() => setFilterBiz(filterBiz === 'personal' ? 'all' : 'personal')} />
        <FPill label="Empresa" active={filterBiz === 'business'} color="#34495E" onClick={() => setFilterBiz(filterBiz === 'business' ? 'all' : 'business')} />
      </div>

      {/* Grouped transactions */}
      {Object.keys(grouped).length === 0 && <Empty text="Nenhum gasto registrado" />}
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} style={{ marginBottom: 14 }}>
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#aaa' }}>{fmtDateBR(date)}</p>
          {items.map(tx => {
            const cat = catMap[tx.categoryId];
            const card = cardMap[tx.cardId];
            return (
              <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px', borderBottom: '1px solid #f5f4f1' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: cat?.color || '#ccc', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.description}
                    {tx.isBusiness && <span style={{ fontSize: 9, marginLeft: 4, padding: '1px 4px', borderRadius: 3, background: '#34495E', color: '#fff' }}>EMP</span>}
                    {tx.paymentMethod === 'credit_card' && <span style={{ fontSize: 9, marginLeft: 4, padding: '1px 4px', borderRadius: 3, background: '#fef9e7', color: '#d68910' }}>Crédito</span>}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>
                    {cat?.name || ''} {tx.merchant ? `· ${tx.merchant}` : ''} {FIN_PAY[tx.paymentMethod]?.label ? `· ${FIN_PAY[tx.paymentMethod].label}` : ''}
                    {card ? ` (${card.name})` : tx.cardName ? ` (${tx.cardName})` : ''}
                  </p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: tx.type === 'income' ? '#0F9B58' : '#E74C3C' }}>
                  {tx.type === 'income' ? '+' : '-'}{fmtBRL(tx.amount)}
                </span>
                <button onClick={() => startEdit(tx)} style={{ fontSize: 11, color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>Editar</button>
                <button onClick={() => remove(tx.id)} style={{ fontSize: 11, color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>Excluir</button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
