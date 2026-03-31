'use client';
import { useState } from 'react';
import { Card, Inp, Sel, Btn, SLabel, FPill, Empty, Modal, FormRow, toast } from '../ui';
import { uid, fmtBRL } from '@/lib/utils';
import { FIN_PAY, FIN_FUNDED } from '@/lib/constants';

export default function W3Fixos({ w3, setW3 }) {
  const [modal, setModal] = useState(null);
  const [filterCat, setFilterCat] = useState('all');
  const [filterFunded, setFilterFunded] = useState('all');
  const [filterActive, setFilterActive] = useState('active');

  const cats = w3.categories || [];
  const fixedCats = cats.filter(c => c.isFixed && c.type === 'expense');
  const catMap = {};
  cats.forEach(c => { catMap[c.id] = c; });

  const fixedCosts = w3.fixed_costs || [];

  const blank = () => ({
    id: uid(), name: '', amount: '', categoryId: fixedCats[0]?.id || '',
    paymentMethod: 'pix', cardName: '', cardId: '', dueDay: '', isActive: true,
    isBusiness: false, fundedBy: 'renda_principal',
    remainingInstallments: '', totalRemainingDebt: '', endDate: '',
    notes: '', createdAt: new Date().toISOString(),
  });
  const [draft, setDraft] = useState(blank());

  const cards = w3.credit_cards || [];

  const openNew = () => { setDraft(blank()); setModal('new'); };
  const openEdit = (fc) => { setDraft({ ...fc, amount: String(fc.amount), dueDay: fc.dueDay != null ? String(fc.dueDay) : '', remainingInstallments: fc.remainingInstallments != null ? String(fc.remainingInstallments) : '', totalRemainingDebt: fc.totalRemainingDebt != null ? String(fc.totalRemainingDebt) : '' }); setModal(fc.id); };

  const save = () => {
    if (!draft.name?.trim()) { toast('Preencha o nome'); return; }
    const item = { ...draft, amount: parseFloat(draft.amount) || 0, dueDay: draft.dueDay ? parseInt(draft.dueDay) : null, remainingInstallments: draft.remainingInstallments ? parseInt(draft.remainingInstallments) : null, totalRemainingDebt: draft.totalRemainingDebt ? parseFloat(draft.totalRemainingDebt) : null };
    setW3(d => ({
      ...d,
      fixed_costs: modal === 'new'
        ? [item, ...d.fixed_costs]
        : d.fixed_costs.map(f => f.id === modal ? item : f),
    }));
    setModal(null);
    toast('Custo fixo salvo');
  };

  const toggleActive = (fc) => {
    setW3(d => ({
      ...d,
      fixed_costs: d.fixed_costs.map(f => f.id === fc.id ? { ...f, isActive: !f.isActive } : f),
    }));
    toast(fc.isActive ? 'Desativado' : 'Ativado');
  };

  // Filters
  let visible = fixedCosts;
  if (filterActive === 'active') visible = visible.filter(f => f.isActive);
  else if (filterActive === 'inactive') visible = visible.filter(f => !f.isActive);
  if (filterCat !== 'all') visible = visible.filter(f => f.categoryId === filterCat);
  if (filterFunded !== 'all') visible = visible.filter(f => f.fundedBy === filterFunded);

  const totalActive = fixedCosts.filter(f => f.isActive && f.fundedBy === 'renda_principal').reduce((s, f) => s + (f.amount || 0), 0);
  const totalMazul = fixedCosts.filter(f => f.isActive && f.fundedBy === 'entrada_mazul').reduce((s, f) => s + (f.amount || 0), 0);
  const totalPatagon = fixedCosts.filter(f => f.isActive && f.fundedBy === 'entrada_patagon').reduce((s, f) => s + (f.amount || 0), 0);

  const up = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Custos Fixos</h1>
        <Btn onClick={openNew}>+ Novo custo fixo</Btn>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <FPill label="Ativos" active={filterActive === 'active'} onClick={() => setFilterActive(filterActive === 'active' ? 'all' : 'active')} />
        <FPill label="Inativos" active={filterActive === 'inactive'} onClick={() => setFilterActive(filterActive === 'inactive' ? 'all' : 'inactive')} />
        <FPill label="Todos" active={filterActive === 'all'} onClick={() => setFilterActive('all')} />
        <span style={{ width: 1, background: '#e5e4e0', margin: '0 4px' }} />
        {Object.entries(FIN_FUNDED).map(([k, v]) => (
          <FPill key={k} label={v} active={filterFunded === k} onClick={() => setFilterFunded(filterFunded === k ? 'all' : k)} />
        ))}
      </div>

      {/* Table */}
      <Card style={{ marginBottom: 16 }}>
        {visible.length === 0 && <Empty text="Nenhum custo fixo encontrado" />}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eceae5', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Nome</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Categoria</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Valor</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Forma</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Cartão</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Venc.</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Financiado por</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Ativo</th>
              <th style={{ padding: '6px 8px' }}></th>
            </tr>
          </thead>
          <tbody>
            {visible.map(fc => {
              const cat = catMap[fc.categoryId];
              return (
                <tr key={fc.id} style={{ borderBottom: '1px solid #f5f4f1', opacity: fc.isActive ? 1 : 0.5 }}>
                  <td style={{ padding: '7px 8px', fontWeight: 600 }}>{fc.name}</td>
                  <td style={{ padding: '7px 8px' }}>
                    <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: cat?.color ? cat.color + '18' : '#f4f4f3', color: cat?.color || '#888' }}>{cat?.name || '—'}</span>
                  </td>
                  <td style={{ padding: '7px 8px', fontWeight: 700 }}>{fmtBRL(fc.amount)}</td>
                  <td style={{ padding: '7px 8px', color: '#888' }}>{FIN_PAY[fc.paymentMethod]?.label || '—'}</td>
                  <td style={{ padding: '7px 8px', color: '#888' }}>{fc.cardName || '—'}</td>
                  <td style={{ padding: '7px 8px', color: '#888' }}>{fc.dueDay ? `Dia ${fc.dueDay}` : '—'}</td>
                  <td style={{ padding: '7px 8px', color: '#888', fontSize: 11 }}>{FIN_FUNDED[fc.fundedBy] || '—'}</td>
                  <td style={{ padding: '7px 8px' }}>
                    <button onClick={() => toggleActive(fc)} style={{ fontSize: 13, cursor: 'pointer', background: 'none', border: 'none' }}>{fc.isActive ? '✓' : '✗'}</button>
                  </td>
                  <td style={{ padding: '7px 8px' }}>
                    <button onClick={() => openEdit(fc)} style={{ fontSize: 11, color: '#555', background: 'none', border: 'none', cursor: 'pointer' }}>Editar</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Totals */}
      <Card style={{ background: '#fafaf8' }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 14 }}>
          <div><span style={{ color: '#888', fontSize: 12 }}>Total renda principal</span><p style={{ margin: '2px 0 0', fontWeight: 800 }}>{fmtBRL(totalActive)}</p></div>
          <div><span style={{ color: '#888', fontSize: 12 }}>Total Mazul</span><p style={{ margin: '2px 0 0', fontWeight: 800, color: '#2196F3' }}>{fmtBRL(totalMazul)}</p></div>
          <div><span style={{ color: '#888', fontSize: 12 }}>Total Patagon</span><p style={{ margin: '2px 0 0', fontWeight: 800, color: '#00BCD4' }}>{fmtBRL(totalPatagon)}</p></div>
        </div>
      </Card>

      {/* Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Novo custo fixo' : 'Editar custo fixo'} width={520}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormRow label="Nome"><Inp value={draft.name} onChange={e => up('name', e.target.value)} /></FormRow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormRow label="Valor (R$)"><Inp type="number" step="0.01" value={draft.amount} onChange={e => up('amount', e.target.value)} /></FormRow>
            <FormRow label="Categoria">
              <Sel value={draft.categoryId} onChange={e => up('categoryId', e.target.value)}>
                {fixedCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Sel>
            </FormRow>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <FormRow label="Forma de pagamento">
              <Sel value={draft.paymentMethod} onChange={e => up('paymentMethod', e.target.value)}>
                {Object.entries(FIN_PAY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Sel>
            </FormRow>
            <FormRow label="Cartão">
              {draft.paymentMethod === 'credit_card' ? (
                <Sel value={draft.cardId} onChange={e => { up('cardId', e.target.value); const c = cards.find(c => c.id === e.target.value); if (c) up('cardName', c.name); }}>
                  <option value="">Selecione</option>
                  {cards.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Sel>
              ) : (
                <Inp value={draft.cardName} onChange={e => up('cardName', e.target.value)} />
              )}
            </FormRow>
            <FormRow label="Dia vencimento"><Inp type="number" min="1" max="31" value={draft.dueDay} onChange={e => up('dueDay', e.target.value)} /></FormRow>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <FormRow label="Financiado por">
              <Sel value={draft.fundedBy} onChange={e => up('fundedBy', e.target.value)}>
                {Object.entries(FIN_FUNDED).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Sel>
            </FormRow>
            <FormRow label="Parcelas restantes"><Inp type="number" value={draft.remainingInstallments} onChange={e => up('remainingInstallments', e.target.value)} placeholder="Indeterminado" /></FormRow>
            <FormRow label="Encerra em"><Inp type="date" value={draft.endDate} onChange={e => up('endDate', e.target.value)} /></FormRow>
          </div>
          <FormRow label="Débito total restante (R$)"><Inp type="number" step="0.01" value={draft.totalRemainingDebt} onChange={e => up('totalRemainingDebt', e.target.value)} placeholder="Se aplicável" /></FormRow>
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={draft.isBusiness} onChange={e => up('isBusiness', e.target.checked)} /> Custo de empresa
            </label>
          </div>
          <FormRow label="Notas"><Inp value={draft.notes} onChange={e => up('notes', e.target.value)} /></FormRow>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={save}>Salvar</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
