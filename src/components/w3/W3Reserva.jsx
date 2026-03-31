'use client';
import { useState } from 'react';
import { Card, Btn, Inp, SLabel, PBar, Modal, FormRow, Empty, toast } from '../ui';
import { uid, fmtBRL, curMonth, curYear } from '@/lib/utils';
import { MONTHS } from '@/lib/constants';

export default function W3Reserva({ w3, setW3 }) {
  const [modal, setModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [selMonth, setSelMonth] = useState(curMonth());
  const [selYear, setSelYear] = useState(curYear());

  const reserves = (w3.emergency_reserve || []).sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month));

  const targetP1 = 5557;
  const targetP2 = 16671;
  const targetFinal = 33342;

  // Current accumulated
  const accumulated = reserves.length > 0 ? reserves[reserves.length - 1].accumulatedTotal || 0 : 0;

  const pctP1 = Math.min(100, Math.round((accumulated / targetP1) * 100));
  const pctP2 = Math.min(100, Math.round((accumulated / targetP2) * 100));
  const pctFinal = Math.min(100, Math.round((accumulated / targetFinal) * 100));

  const saveReserve = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast('Informe um valor'); return; }

    const existing = reserves.find(r => r.month === selMonth && r.year === selYear);
    const prevAccumulated = reserves
      .filter(r => (r.year * 100 + r.month) < (selYear * 100 + selMonth))
      .reduce((s, r) => s + (r.savedAmount || 0), 0);
    const newAccumulated = prevAccumulated + val;

    if (existing) {
      setW3(d => ({
        ...d,
        emergency_reserve: d.emergency_reserve.map(r =>
          r.id === existing.id
            ? { ...r, savedAmount: val, accumulatedTotal: newAccumulated }
            : r
        ),
      }));
    } else {
      const newEntry = {
        id: uid(), month: selMonth, year: selYear,
        savedAmount: val, accumulatedTotal: newAccumulated,
        targetPhase1: targetP1, targetPhase2: targetP2, targetFinal,
        notes: '', createdAt: new Date().toISOString(),
      };
      setW3(d => ({ ...d, emergency_reserve: [...d.emergency_reserve, newEntry] }));
    }
    setModal(false);
    setAmount('');
    toast('Reserva registrada');
  };

  const gauge = (label, target, pct, color) => (
    <Card style={{ flex: 1, minWidth: 200 }}>
      <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
      <p style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color }}>{pct}%</p>
      <PBar pct={pct} color={color} />
      <p style={{ margin: '6px 0 0', fontSize: 11, color: '#888' }}>{fmtBRL(accumulated)} de {fmtBRL(target)}</p>
    </Card>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Reserva de Emergência</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>Meta: 6 meses de custos fixos</p>
        </div>
        <Btn onClick={() => setModal(true)}>+ Registrar valor</Btn>
      </div>

      {/* Phase gauges */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {gauge('Fase 1 — 1 mês', targetP1, pctP1, '#F5A623')}
        {gauge('Fase 2 — 3 meses', targetP2, pctP2, '#d68910')}
        {gauge('Meta final — 6 meses', targetFinal, pctFinal, '#0F9B58')}
      </div>

      {/* Monthly tracker */}
      <Card>
        <SLabel>Histórico mensal</SLabel>
        {reserves.length === 0 && <Empty text="Nenhum registro de reserva" />}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eceae5', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Mês</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Guardado</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>Acumulado</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11 }}>% Fase 1</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, color: '#aaa', fontSize: 11, width: 200 }}>Progresso</th>
            </tr>
          </thead>
          <tbody>
            {reserves.map(r => {
              const p = Math.min(100, Math.round((r.accumulatedTotal / targetP1) * 100));
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #f5f4f1' }}>
                  <td style={{ padding: '8px' }}>{MONTHS[r.month - 1]} {r.year}</td>
                  <td style={{ padding: '8px', fontWeight: 600 }}>{fmtBRL(r.savedAmount)}</td>
                  <td style={{ padding: '8px', fontWeight: 700 }}>{fmtBRL(r.accumulatedTotal)}</td>
                  <td style={{ padding: '8px', color: '#d68910' }}>{p}%</td>
                  <td style={{ padding: '8px' }}><PBar pct={p} color="#F5A623" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Registrar valor na reserva" width={400}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormRow label="Mês">
              <select value={selMonth} onChange={e => setSelMonth(+e.target.value)} style={{ fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e4e0', width: '100%' }}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </FormRow>
            <FormRow label="Ano">
              <select value={selYear} onChange={e => setSelYear(+e.target.value)} style={{ fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e4e0', width: '100%' }}>
                <option value={2025}>2025</option><option value={2026}>2026</option><option value={2027}>2027</option>
              </select>
            </FormRow>
          </div>
          <FormRow label="Valor guardado (R$)">
            <Inp type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
          </FormRow>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={saveReserve}>Salvar</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
