'use client';
import { useState } from 'react';
import { Card, Inp, Sel, Btn, SLabel, Modal, FormRow, Empty, toast } from '../ui';
import { uid, fmtBRL, curMonth, curYear } from '@/lib/utils';
import { FIN_TX_TYPES, MONTHS } from '@/lib/constants';

export default function W3Config({ w3, setW3 }) {
  const [catModal, setCatModal] = useState(null);
  const [budgetMonth, setBudgetMonth] = useState(curMonth());
  const [budgetYear, setBudgetYear] = useState(curYear());

  const cats = w3.categories || [];
  const budgets = (w3.monthly_budgets || []).filter(b => b.month === budgetMonth && b.year === budgetYear);

  // Category form
  const blankCat = () => ({ id: uid(), name: '', type: 'expense', color: '#888', icon: '', isFixed: false, createdAt: new Date().toISOString() });
  const [catDraft, setCatDraft] = useState(blankCat());

  const openNewCat = () => { setCatDraft(blankCat()); setCatModal('new'); };
  const openEditCat = (c) => { setCatDraft({ ...c }); setCatModal(c.id); };

  const saveCat = () => {
    if (!catDraft.name?.trim()) { toast('Preencha o nome'); return; }
    setW3(d => ({
      ...d,
      categories: catModal === 'new'
        ? [...d.categories, catDraft]
        : d.categories.map(c => c.id === catModal ? catDraft : c),
    }));
    setCatModal(null);
    toast('Categoria salva');
  };

  const removeCat = (id) => {
    setW3(d => ({ ...d, categories: d.categories.filter(c => c.id !== id) }));
    toast('Categoria removida');
  };

  // Budget handling
  const setBudgetAmount = (catId, val) => {
    const existing = budgets.find(b => b.categoryId === catId);
    if (existing) {
      setW3(d => ({
        ...d,
        monthly_budgets: d.monthly_budgets.map(b =>
          b.id === existing.id ? { ...b, budgetedAmount: parseFloat(val) || 0 } : b
        ),
      }));
    } else {
      const newBudget = {
        id: uid(), month: budgetMonth, year: budgetYear,
        categoryId: catId, budgetedAmount: parseFloat(val) || 0,
        notes: '', createdAt: new Date().toISOString(),
      };
      setW3(d => ({ ...d, monthly_budgets: [...d.monthly_budgets, newBudget] }));
    }
  };

  // Export CSV
  const exportCSV = () => {
    const txs = w3.transactions || [];
    const catMap = {};
    cats.forEach(c => { catMap[c.id] = c.name; });
    const header = 'Data,Descrição,Categoria,Valor,Tipo,Forma Pagamento,Cartão,Observação\n';
    const rows = txs.map(t =>
      `${t.transactionDate},"${t.description}","${catMap[t.categoryId] || ''}",${t.amount},${t.type},${t.paymentMethod},${t.cardName || ''},"${t.notes || ''}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exportado');
  };

  const variableCats = cats.filter(c => c.type === 'expense' && !c.isFixed);
  const budgetMap = {};
  budgets.forEach(b => { budgetMap[b.categoryId] = b; });

  const upCat = (k, v) => setCatDraft(d => ({ ...d, [k]: v }));

  return (
    <div>
      <h1 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 800 }}>Configurações</h1>

      {/* Categories */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <SLabel style={{ margin: 0 }}>Categorias</SLabel>
          <Btn sm onClick={openNewCat}>+ Nova categoria</Btn>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #eceae5', textAlign: 'left' }}>
              <th style={{ padding: '4px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Cor</th>
              <th style={{ padding: '4px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Nome</th>
              <th style={{ padding: '4px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Tipo</th>
              <th style={{ padding: '4px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Fixa</th>
              <th style={{ padding: '4px 8px' }}></th>
            </tr>
          </thead>
          <tbody>
            {cats.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f5f4f1' }}>
                <td style={{ padding: '6px 8px' }}>
                  <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: c.color }} />
                </td>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: '6px 8px', color: '#888' }}>{FIN_TX_TYPES[c.type]?.label || c.type}</td>
                <td style={{ padding: '6px 8px', color: '#888' }}>{c.isFixed ? 'Sim' : 'Não'}</td>
                <td style={{ padding: '6px 8px', display: 'flex', gap: 6 }}>
                  <button onClick={() => openEditCat(c)} style={{ fontSize: 11, color: '#555', background: 'none', border: 'none', cursor: 'pointer' }}>Editar</button>
                  <button onClick={() => removeCat(c.id)} style={{ fontSize: 11, color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer' }}>Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Budget per category */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <SLabel style={{ margin: 0 }}>Orçamento por categoria</SLabel>
          <select value={budgetMonth} onChange={e => setBudgetMonth(+e.target.value)} style={{ fontSize: 12, padding: '3px 6px', borderRadius: 6, border: '1px solid #e5e4e0' }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={budgetYear} onChange={e => setBudgetYear(+e.target.value)} style={{ fontSize: 12, padding: '3px 6px', borderRadius: 6, border: '1px solid #e5e4e0' }}>
            <option value={2025}>2025</option><option value={2026}>2026</option><option value={2027}>2027</option>
          </select>
        </div>
        {variableCats.length === 0 && <Empty text="Nenhuma categoria variável" />}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {variableCats.map(cat => (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12 }}>{cat.name}</span>
              <Inp
                type="number" step="50" placeholder="R$"
                value={budgetMap[cat.id]?.budgetedAmount || ''}
                onChange={e => setBudgetAmount(cat.id, e.target.value)}
                style={{ width: 100, fontSize: 12, padding: '3px 6px' }}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Export */}
      <Card>
        <SLabel>Exportar dados</SLabel>
        <Btn onClick={exportCSV}>Exportar transações como CSV</Btn>
      </Card>

      {/* Category Modal */}
      <Modal open={!!catModal} onClose={() => setCatModal(null)} title={catModal === 'new' ? 'Nova categoria' : 'Editar categoria'} width={400}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormRow label="Nome"><Inp value={catDraft.name} onChange={e => upCat('name', e.target.value)} /></FormRow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormRow label="Tipo">
              <Sel value={catDraft.type} onChange={e => upCat('type', e.target.value)}>
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </Sel>
            </FormRow>
            <FormRow label="Cor">
              <Inp type="color" value={catDraft.color} onChange={e => upCat('color', e.target.value)} style={{ height: 34, padding: 2 }} />
            </FormRow>
          </div>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={catDraft.isFixed} onChange={e => upCat('isFixed', e.target.checked)} /> Categoria fixa
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setCatModal(null)}>Cancelar</Btn>
            <Btn onClick={saveCat}>Salvar</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
