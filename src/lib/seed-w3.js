import { uid } from './utils';

const ts = () => new Date().toISOString();
const mkId = () => uid() + Math.random().toString(36).slice(2, 4);

// ── Categories ──────────────────────────────────────────────────
const categories = [
  // Fixed expense categories
  { name: 'Dívidas/Financiamentos', type: 'expense', color: '#E74C3C', isFixed: true, isBusiness: false },
  { name: 'Moradia', type: 'expense', color: '#3498DB', isFixed: true, isBusiness: false },
  { name: 'Transporte', type: 'expense', color: '#2ECC71', isFixed: true, isBusiness: false },
  { name: 'Telecom', type: 'expense', color: '#9B59B6', isFixed: true, isBusiness: false },
  { name: 'Ferramentas/SaaS', type: 'expense', color: '#1ABC9C', isFixed: true, isBusiness: false },
  { name: 'Assinaturas', type: 'expense', color: '#F39C12', isFixed: true, isBusiness: false },
  { name: 'Empresa', type: 'expense', color: '#34495E', isFixed: true, isBusiness: true },
  { name: 'Pessoal', type: 'expense', color: '#E67E22', isFixed: true, isBusiness: false },
  // Variable expense categories
  { name: 'Mercado/Supermercado', type: 'expense', color: '#27AE60', isFixed: false, isBusiness: false },
  { name: 'BigJoia (supermercado)', type: 'expense', color: '#FF6B35', isFixed: false, isBusiness: false },
  { name: 'Farmácia', type: 'expense', color: '#E91E63', isFixed: false, isBusiness: false },
  { name: 'Raia Drogasil', type: 'expense', color: '#00A878', isFixed: false, isBusiness: false },
  { name: 'Delivery/Alimentação', type: 'expense', color: '#FF5722', isFixed: false, isBusiness: false },
  { name: 'iFood', type: 'expense', color: '#EA1D2C', isFixed: false, isBusiness: false },
  { name: 'Padaria', type: 'expense', color: '#D4A05C', isFixed: false, isBusiness: false },
  { name: 'Compras Online', type: 'expense', color: '#795548', isFixed: false, isBusiness: false },
  { name: 'Shopee', type: 'expense', color: '#EE4D2D', isFixed: false, isBusiness: false },
  { name: 'Posto de combustível', type: 'expense', color: '#607D8B', isFixed: false, isBusiness: false },
  { name: 'Saúde', type: 'expense', color: '#F44336', isFixed: false, isBusiness: false },
  { name: 'Lazer', type: 'expense', color: '#673AB7', isFixed: false, isBusiness: false },
  { name: 'Havan', type: 'expense', color: '#E30613', isFixed: false, isBusiness: false },
  { name: 'Facebook/Meta Ads', type: 'expense', color: '#1877F2', isFixed: false, isBusiness: true },
  { name: 'Apostas/Games', type: 'expense', color: '#9B59B6', isFixed: false, isBusiness: false },
  { name: 'Joalheria/Acessórios', type: 'expense', color: '#F1C40F', isFixed: false, isBusiness: false },
  { name: 'Uber/Transporte', type: 'expense', color: '#000000', isFixed: false, isBusiness: false },
  { name: 'Transferências diversas', type: 'expense', color: '#95A5A6', isFixed: false, isBusiness: false },
  { name: 'Outros', type: 'expense', color: '#9E9E9E', isFixed: false, isBusiness: false },
  // Income categories
  { name: 'Renda Principal', type: 'income', color: '#4CAF50', isFixed: false, isBusiness: false },
  { name: 'Renda Mazul', type: 'income', color: '#2196F3', isFixed: false, isBusiness: true },
  { name: 'Renda Patagon', type: 'income', color: '#00BCD4', isFixed: false, isBusiness: true },
].map(c => ({ id: mkId(), ...c, icon: '', createdAt: ts() }));

// Map category name → id
const catMap = {};
categories.forEach(c => { catMap[c.name] = c.id; });

// ── Credit Cards ────────────────────────────────────────────────
const creditCards = [
  { name: 'Itaú Black', lastFour: '3977', bank: 'Itaú', creditLimit: 4200, closingDay: 6, dueDay: 15, expectedMonthlyBill: null, color: '#1A1A2E' },
  { name: 'Magalu (Luizacred)', lastFour: '7900', bank: 'Magazine Luiza', creditLimit: 2930, closingDay: 9, dueDay: 16, expectedMonthlyBill: null, color: '#0066CC' },
  { name: 'Pão de Açúcar (Itaú CBD)', lastFour: '8636', bank: 'Itaú CBD', creditLimit: 2601, closingDay: 10, dueDay: 17, expectedMonthlyBill: null, color: '#E30613' },
  { name: 'Itaú Platinum', lastFour: '6592', bank: 'Itaú', creditLimit: 3538, closingDay: 9, dueDay: 16, expectedMonthlyBill: null, color: '#C0C0C0' },
  { name: 'Cartão GPU', lastFour: '', bank: '', creditLimit: 0, closingDay: null, dueDay: null, expectedMonthlyBill: 460, color: '#76B900' },
  { name: 'Cartão Click', lastFour: '', bank: '', creditLimit: 0, closingDay: null, dueDay: null, expectedMonthlyBill: 418, color: '#FF6B00' },
].map(c => ({ id: mkId(), ...c, isActive: true, createdAt: ts() }));

const cardMap = {};
creditCards.forEach(c => { cardMap[c.name] = c.id; });

// ── Fixed Costs ─────────────────────────────────────────────────
const fixedCosts = [
  // DÍVIDAS
  { name: 'Renegociação Itaú (4 débitos automáticos)', amount: 1516.09, category: 'Dívidas/Financiamentos', paymentMethod: 'debit_auto', dueDay: 10, fundedBy: 'renda_principal', remainingInstallments: 27, totalRemainingDebt: 40934.43, notes: '4 débitos: R$410,11 + R$283,88 + R$392,87 + R$429,23. Encerra ~ago/2028.' },
  { name: 'Financiamento Carro — Banco PAN', amount: 613.86, category: 'Dívidas/Financiamentos', paymentMethod: 'boleto', dueDay: 5, fundedBy: 'renda_principal', notes: 'AUTO PAN' },
  // MORADIA
  { name: 'Container / Aluguel (GSS LOC)', amount: 360, category: 'Moradia', paymentMethod: 'pix', dueDay: 26, fundedBy: 'renda_principal' },
  { name: 'Energia Elétrica (média)', amount: 550, category: 'Moradia', paymentMethod: 'boleto', dueDay: 15, fundedBy: 'renda_principal', notes: 'Varia R$400–R$700' },
  // TRANSPORTE
  { name: 'Sem Parar (pedágio)', amount: 250, category: 'Transporte', paymentMethod: 'debit', dueDay: null, fundedBy: 'renda_principal', notes: 'Semi-fixo — varia conforme uso' },
  // TELECOM
  { name: 'RMS Telecom (internet) — débito 1', amount: 79.90, category: 'Telecom', paymentMethod: 'debit', dueDay: 6, fundedBy: 'renda_principal' },
  { name: 'RMS Telecom (internet) — débito 2', amount: 79.90, category: 'Telecom', paymentMethod: 'debit', dueDay: 31, fundedBy: 'renda_principal' },
  // EMPRESA
  { name: 'Ayres & Balta (contador)', amount: 300, category: 'Empresa', paymentMethod: 'pix', dueDay: 1, fundedBy: 'renda_principal', isBusiness: true },
  { name: 'Google Workspace Mazul', amount: 87.50, category: 'Empresa', paymentMethod: 'credit_card', cardName: 'Itaú Platinum', dueDay: null, fundedBy: 'renda_principal', isBusiness: true, notes: 'Idealmente Mazul deveria reembolsar' },
  // PESSOAL
  { name: 'Erva mate (Yahn Ho)', amount: 280, category: 'Pessoal', paymentMethod: 'pix', dueDay: null, fundedBy: 'renda_principal' },
  { name: 'Gudang (cigarro)', amount: 300, category: 'Pessoal', paymentMethod: 'pix', dueDay: null, fundedBy: 'renda_principal', notes: 'PAY NovoO no extrato' },
  // FERRAMENTAS (cartão)
  { name: 'Make.com', amount: 117, category: 'Ferramentas/SaaS', paymentMethod: 'credit_card', fundedBy: 'renda_principal' },
  { name: 'Contabo (servidor VPS)', amount: 245, category: 'Ferramentas/SaaS', paymentMethod: 'credit_card', fundedBy: 'renda_principal' },
  { name: 'Netlify (hospedagem)', amount: 115, category: 'Ferramentas/SaaS', paymentMethod: 'credit_card', fundedBy: 'renda_principal' },
  { name: 'RSS.app', amount: 112, category: 'Ferramentas/SaaS', paymentMethod: 'credit_card', cardName: 'Magalu', fundedBy: 'renda_principal' },
  { name: 'OpenRouter (LLM API)', amount: 118, category: 'Ferramentas/SaaS', paymentMethod: 'credit_card', fundedBy: 'renda_principal' },
  { name: 'Hostinger', amount: 30, category: 'Ferramentas/SaaS', paymentMethod: 'credit_card', fundedBy: 'renda_principal' },
  { name: 'Canva', amount: 35, category: 'Ferramentas/SaaS', paymentMethod: 'credit_card', fundedBy: 'renda_principal' },
  { name: 'Workana (parcela — encerra jul/2026)', amount: 59.86, category: 'Ferramentas/SaaS', paymentMethod: 'credit_card', cardName: 'Magalu', fundedBy: 'renda_principal', remainingInstallments: 3, endDate: '2026-07-31', notes: 'Parcela 9/12 em março. Encerra julho/2026.' },
  { name: 'Demerge Brasil (infra/software)', amount: 250, category: 'Ferramentas/SaaS', paymentMethod: 'pix', fundedBy: 'renda_principal', notes: 'Valor varia R$130–360/mês. A confirmar serviço.' },
  // ASSINATURAS
  { name: 'Google One', amount: 97, category: 'Assinaturas', paymentMethod: 'credit_card', fundedBy: 'renda_principal' },
  { name: 'YouTube Premium', amount: 29, category: 'Assinaturas', paymentMethod: 'credit_card', fundedBy: 'renda_principal' },
  { name: 'Netflix', amount: 60, category: 'Assinaturas', paymentMethod: 'credit_card', fundedBy: 'renda_principal' },
  // OPERACIONAL (entradas extras)
  { name: 'PROSP — Outbound Mazul', amount: 2159, category: 'Ferramentas/SaaS', paymentMethod: 'credit_card', fundedBy: 'entrada_mazul', isBusiness: true, notes: 'Coberto pela entrada Mazul de R$3.000' },
  { name: 'Anthropic / Claude API', amount: 1100, category: 'Ferramentas/SaaS', paymentMethod: 'credit_card', fundedBy: 'entrada_patagon', isBusiness: true, notes: 'Coberto pela entrada Patagon de R$2.000' },
].map(fc => ({
  id: mkId(),
  name: fc.name, amount: fc.amount,
  categoryId: catMap[fc.category] || '',
  paymentMethod: fc.paymentMethod || '',
  cardName: fc.cardName || '',
  cardId: fc.cardName ? (cardMap[fc.cardName] || '') : '',
  dueDay: fc.dueDay ?? null,
  isActive: true,
  isBusiness: fc.isBusiness || false,
  fundedBy: fc.fundedBy || 'renda_principal',
  remainingInstallments: fc.remainingInstallments ?? null,
  totalRemainingDebt: fc.totalRemainingDebt ?? null,
  endDate: fc.endDate || '',
  notes: fc.notes || '',
  createdAt: ts(),
}));

// ── Income Sources (May-Dec 2026) ───────────────────────────────
const incomeTemplates = [
  { name: 'Renda Principal', expectedAmount: 15000, fundedBy: 'renda_principal', notes: 'Fonte base — cobre todos os fixos pessoais' },
  { name: 'Entrada Mazul (Prosp)', expectedAmount: 3000, fundedBy: 'entrada_mazul', notes: 'Cobre PROSP R$2.159 → sobra ~R$841' },
  { name: 'Entrada Patagon (IA)', expectedAmount: 2000, fundedBy: 'entrada_patagon', notes: 'Cobre Anthropic R$1.100 → sobra ~R$900' },
];

const incomeSources = [];
for (let m = 5; m <= 12; m++) {
  for (const t of incomeTemplates) {
    incomeSources.push({
      id: mkId(), name: t.name, expectedAmount: t.expectedAmount,
      actualAmount: null, month: m, year: 2026,
      fundedBy: t.fundedBy, notes: t.notes, receivedAt: '', createdAt: ts(),
    });
  }
}

// ── Debts ────────────────────────────────────────────────────────
const debts = [
  {
    id: mkId(), name: 'Renegociação Itaú', creditor: 'Itaú Unibanco',
    originalAmount: null, remainingAmount: 40934.43, monthlyPayment: 1516.09,
    interestRate: null, remainingInstallments: 27, nextDueDate: '2026-05-10',
    paymentMethod: 'debit_auto', isActive: true,
    notes: '4 débitos automáticos: R$410,11 + R$283,88 + R$392,87 + R$429,23', createdAt: ts(),
  },
  {
    id: mkId(), name: 'Financiamento Carro', creditor: 'Banco PAN',
    originalAmount: null, remainingAmount: null, monthlyPayment: 613.86,
    interestRate: null, remainingInstallments: null, nextDueDate: '2026-05-05',
    paymentMethod: 'boleto', isActive: true,
    notes: 'PAG BOLETO BANCO PAN SA - AUTO PAN', createdAt: ts(),
  },
];

// ── Installments ────────────────────────────────────────────────
const installments = [
  {
    id: mkId(), description: 'Workana (freelancer)',
    totalAmount: 718.32, installmentAmount: 59.86,
    totalInstallments: 12, paidInstallments: 9, remainingInstallments: 3,
    startDate: '2025-08-01', endDate: '2026-07-31',
    cardId: cardMap['Magalu (Luizacred)'] || '', categoryId: catMap['Ferramentas/SaaS'] || '',
    isActive: true, notes: 'Encerra julho/2026', createdAt: ts(),
  },
];

// ── Goals ────────────────────────────────────────────────────────
const goals = [
  {
    id: mkId(), name: 'Reserva de Emergência — Fase 1',
    targetAmount: 5557, currentAmount: 0, targetDate: '2026-08-31',
    category: 'emergency_reserve', color: '#F5A623', isAchieved: false,
    notes: '1 mês de custos fixos. Guardando ~R$1.850/mês → 3 meses.', createdAt: ts(),
  },
  {
    id: mkId(), name: 'Reserva de Emergência — Fase 2',
    targetAmount: 16671, currentAmount: 0, targetDate: '2027-05-31',
    category: 'emergency_reserve', color: '#E67E22', isAchieved: false,
    notes: '3 meses de custos fixos.', createdAt: ts(),
  },
  {
    id: mkId(), name: 'Quitar Renegociação Itaú',
    targetAmount: 40934.43, currentAmount: 0, targetDate: '2028-08-31',
    category: 'debt_payoff', color: '#E74C3C', isAchieved: false,
    notes: 'Prioridade máxima assim que tiver liquidez extra.', createdAt: ts(),
  },
];

// ── Card Bills (May 2026 - already committed) ───────────────────
const cardBills = [
  { id: mkId(), cardId: cardMap['Itaú Black'] || '', month: 5, year: 2026, totalAmount: 398, paidAmount: null, status: 'open', dueDate: '2026-05-15', paidAt: '', notes: '', createdAt: ts() },
  { id: mkId(), cardId: cardMap['Magalu (Luizacred)'] || '', month: 5, year: 2026, totalAmount: 553, paidAmount: null, status: 'open', dueDate: '2026-05-16', paidAt: '', notes: '', createdAt: ts() },
  { id: mkId(), cardId: cardMap['Cartão GPU'] || '', month: 5, year: 2026, totalAmount: 460, paidAmount: null, status: 'open', dueDate: '', paidAt: '', notes: '', createdAt: ts() },
  { id: mkId(), cardId: cardMap['Cartão Click'] || '', month: 5, year: 2026, totalAmount: 418, paidAmount: null, status: 'open', dueDate: '', paidAt: '', notes: '', createdAt: ts() },
];

// ── Monthly Budgets (May 2026 base) ─────────────────────────────
const budgetItems = [
  { cat: 'Mercado/Supermercado', amount: 900 },
  { cat: 'BigJoia (supermercado)', amount: 400 },
  { cat: 'Farmácia', amount: 300 },
  { cat: 'Delivery/Alimentação', amount: 250 },
  { cat: 'Padaria', amount: 200 },
  { cat: 'Posto de combustível', amount: 150 },
  { cat: 'Shopee', amount: 150 },
  { cat: 'Facebook/Meta Ads', amount: 500 },
  { cat: 'Outros', amount: 200 },
];
const monthlyBudgets = budgetItems.map(b => ({
  id: mkId(), month: 5, year: 2026,
  categoryId: catMap[b.cat] || '', budgetedAmount: b.amount,
  notes: '', createdAt: ts(),
}));

export const SEED_W3 = {
  categories, creditCards, fixedCosts, incomeSources,
  debts, installments, goals, cardBills, monthlyBudgets,
};
