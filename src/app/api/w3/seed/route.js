import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSQL } from '@/lib/db';
import { SEED_W3 } from '@/lib/seed-w3';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const sql = getSQL();

    // Check if already seeded
    const check = await sql`SELECT COUNT(*)::int as count FROM fin_categories`;
    if (check[0].count > 0) {
      return NextResponse.json({ message: 'Already seeded', seeded: false });
    }

    // Categories
    for (const c of SEED_W3.categories) {
      await sql`INSERT INTO fin_categories (id, name, type, color, icon, is_fixed, is_business, created_at)
        VALUES (${c.id}, ${c.name}, ${c.type}, ${c.color}, ${c.icon}, ${c.isFixed}, ${c.isBusiness}, ${c.createdAt})`;
    }

    // Credit Cards
    for (const c of SEED_W3.creditCards) {
      await sql`INSERT INTO fin_credit_cards (id, name, last_four, bank, credit_limit, closing_day, due_day, expected_monthly_bill, color, is_active, created_at)
        VALUES (${c.id}, ${c.name}, ${c.lastFour}, ${c.bank}, ${c.creditLimit}, ${c.closingDay}, ${c.dueDay}, ${c.expectedMonthlyBill}, ${c.color}, ${c.isActive}, ${c.createdAt})`;
    }

    // Fixed Costs
    for (const fc of SEED_W3.fixedCosts) {
      await sql`INSERT INTO fin_fixed_costs (id, name, amount, category_id, payment_method, card_name, card_id, due_day, is_active, is_business, funded_by, remaining_installments, total_remaining_debt, end_date, notes, created_at)
        VALUES (${fc.id}, ${fc.name}, ${fc.amount}, ${fc.categoryId}, ${fc.paymentMethod}, ${fc.cardName}, ${fc.cardId}, ${fc.dueDay}, ${fc.isActive}, ${fc.isBusiness}, ${fc.fundedBy}, ${fc.remainingInstallments}, ${fc.totalRemainingDebt}, ${fc.endDate}, ${fc.notes}, ${fc.createdAt})`;
    }

    // Income Sources
    for (const i of SEED_W3.incomeSources) {
      await sql`INSERT INTO fin_income_sources (id, name, expected_amount, actual_amount, month, year, funded_by, notes, received_at, created_at)
        VALUES (${i.id}, ${i.name}, ${i.expectedAmount}, ${i.actualAmount}, ${i.month}, ${i.year}, ${i.fundedBy}, ${i.notes}, ${i.receivedAt}, ${i.createdAt})`;
    }

    // Debts
    for (const d of SEED_W3.debts) {
      await sql`INSERT INTO fin_debts (id, name, creditor, original_amount, remaining_amount, monthly_payment, interest_rate, remaining_installments, next_due_date, payment_method, is_active, notes, created_at)
        VALUES (${d.id}, ${d.name}, ${d.creditor}, ${d.originalAmount}, ${d.remainingAmount}, ${d.monthlyPayment}, ${d.interestRate}, ${d.remainingInstallments}, ${d.nextDueDate}, ${d.paymentMethod}, ${d.isActive}, ${d.notes}, ${d.createdAt})`;
    }

    // Installments
    for (const inst of SEED_W3.installments) {
      await sql`INSERT INTO fin_installments (id, description, total_amount, installment_amount, total_installments, paid_installments, remaining_installments, start_date, end_date, card_id, category_id, is_active, notes, created_at)
        VALUES (${inst.id}, ${inst.description}, ${inst.totalAmount}, ${inst.installmentAmount}, ${inst.totalInstallments}, ${inst.paidInstallments}, ${inst.remainingInstallments}, ${inst.startDate}, ${inst.endDate}, ${inst.cardId}, ${inst.categoryId}, ${inst.isActive}, ${inst.notes}, ${inst.createdAt})`;
    }

    // Goals
    for (const g of SEED_W3.goals) {
      await sql`INSERT INTO fin_goals (id, name, target_amount, current_amount, target_date, category, color, is_achieved, notes, created_at)
        VALUES (${g.id}, ${g.name}, ${g.targetAmount}, ${g.currentAmount}, ${g.targetDate}, ${g.category}, ${g.color}, ${g.isAchieved}, ${g.notes}, ${g.createdAt})`;
    }

    // Card Bills
    for (const b of SEED_W3.cardBills) {
      await sql`INSERT INTO fin_card_bills (id, card_id, month, year, total_amount, paid_amount, status, due_date, paid_at, notes, created_at)
        VALUES (${b.id}, ${b.cardId}, ${b.month}, ${b.year}, ${b.totalAmount}, ${b.paidAmount}, ${b.status}, ${b.dueDate}, ${b.paidAt}, ${b.notes}, ${b.createdAt})`;
    }

    // Monthly Budgets
    for (const mb of SEED_W3.monthlyBudgets) {
      await sql`INSERT INTO fin_monthly_budgets (id, month, year, category_id, budgeted_amount, notes, created_at)
        VALUES (${mb.id}, ${mb.month}, ${mb.year}, ${mb.categoryId}, ${mb.budgetedAmount}, ${mb.notes}, ${mb.createdAt})`;
    }

    return NextResponse.json({
      message: 'Finance seed complete',
      seeded: true,
      counts: {
        categories: SEED_W3.categories.length,
        creditCards: SEED_W3.creditCards.length,
        fixedCosts: SEED_W3.fixedCosts.length,
        incomeSources: SEED_W3.incomeSources.length,
        debts: SEED_W3.debts.length,
        installments: SEED_W3.installments.length,
        goals: SEED_W3.goals.length,
        cardBills: SEED_W3.cardBills.length,
        monthlyBudgets: SEED_W3.monthlyBudgets.length,
      }
    });
  } catch (err) {
    console.error('[API] Finance seed error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
