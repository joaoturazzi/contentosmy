import { getSQL } from './db';

// ── camelCase ↔ snake_case mappers ───────────────────────────────
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// ── Table configurations ─────────────────────────────────────────
const TABLE_CONFIG = {
  w1_tasks:    { columns: ['id','title','channel','priority','due_date','notes','done','created_at'], order: 'created_at DESC' },
  w1_ideas:    { columns: ['id','title','channel','description','tags','priority','scheduled','score_thumbnail','score_loop','score_original','status','created_at'], order: 'created_at DESC' },
  w1_notes:    { columns: ['id','title','content','category','event_id','created_at','updated_at'], order: 'updated_at DESC' },
  w1_events:   { columns: ['id','title','channel','type','description','link','date','status','alt_title','thumbnail_concept','open_loop','interviewee','checklist','views','ctr','avg_retention','new_subs','winning_thumb','score_thumbnail','score_loop','score_original','idea_id','is_production','guest_id','structure','questions','cta','strategic_notes','created_at'], order: 'date ASC', jsonb: ['checklist'] },
  w1_guests:   { columns: ['id','name','company','role','linkedin','email','phone','status','notes','created_at'], order: 'name ASC' },
  w1_goals:    { columns: ['id','title','description','category','status','progress','deadline','progress_mode','key_results','created_at'], order: 'created_at DESC', jsonb: ['key_results'] },
  w2_projects: { columns: ['id','name','area','status','description','notes','goal_id','client_id','created_at'], order: 'created_at ASC' },
  w2_tasks:    { columns: ['id','title','project_id','priority','due_date','notes','done','goal_id','is_recurring','frequency','next_due','created_at'], order: 'created_at DESC' },
  w2_goals:    { columns: ['id','title','description','category','status','progress','deadline','progress_mode','key_results','created_at'], order: 'created_at ASC', jsonb: ['key_results'] },
  w2_content:  { columns: ['id','title','channel','type','status','scheduled_date','description','created_at'], order: 'created_at DESC' },
  w2_tools:    { columns: ['id','name','category','status','url','description'], order: 'name ASC', jsFieldMap: { desc: 'description' } },
  w2_clients:  { columns: ['id','name','company','contact','email','phone','area','deal_value','status','notes','created_at'], order: 'created_at DESC' },
  w2_notes:    { columns: ['id','title','content','project_id','category','created_at','updated_at'], order: 'updated_at DESC' },
  w2_personal: { columns: ['id','title','done','date','notes','created_at'], order: 'date ASC, created_at ASC' },
  // W3: Finance
  fin_categories:       { columns: ['id','name','type','color','icon','is_fixed','is_business','created_at'], order: 'name ASC' },
  fin_income_sources:   { columns: ['id','name','expected_amount','actual_amount','month','year','funded_by','notes','received_at','created_at'], order: 'year DESC, month DESC' },
  fin_fixed_costs:      { columns: ['id','name','amount','category_id','payment_method','card_name','card_id','due_day','is_active','is_business','funded_by','remaining_installments','total_remaining_debt','end_date','notes','created_at'], order: 'name ASC' },
  fin_fixed_payments:   { columns: ['id','fixed_cost_id','month','year','budgeted_amount','paid_amount','status','paid_at','notes','created_at'], order: 'year DESC, month DESC' },
  fin_transactions:     { columns: ['id','description','merchant','amount','type','category_id','payment_method','card_name','card_id','transaction_date','month','year','is_fixed','is_business','fixed_cost_id','source','external_id','notes','created_by','created_at'], order: 'transaction_date DESC, created_at DESC' },
  fin_emergency_reserve:{ columns: ['id','month','year','saved_amount','accumulated_total','target_phase_1','target_phase_2','target_final','notes','created_at'], order: 'year ASC, month ASC' },
  fin_monthly_budgets:  { columns: ['id','month','year','category_id','budgeted_amount','notes','created_at'], order: 'year DESC, month DESC' },
  fin_credit_cards:     { columns: ['id','name','last_four','bank','credit_limit','closing_day','due_day','expected_monthly_bill','color','is_active','created_at'], order: 'name ASC' },
  fin_card_bills:       { columns: ['id','card_id','month','year','total_amount','paid_amount','status','due_date','paid_at','notes','created_at'], order: 'year DESC, month DESC' },
  fin_installments:     { columns: ['id','description','total_amount','installment_amount','total_installments','paid_installments','remaining_installments','start_date','end_date','card_id','category_id','is_active','notes','created_at'], order: 'end_date ASC' },
  fin_debts:            { columns: ['id','name','creditor','original_amount','remaining_amount','monthly_payment','interest_rate','remaining_installments','next_due_date','payment_method','is_active','notes','created_at'], order: 'remaining_amount DESC' },
  fin_goals:            { columns: ['id','name','target_amount','current_amount','target_date','category','color','is_achieved','notes','created_at'], order: 'created_at DESC' },
  fin_alerts:           { columns: ['id','type','title','message','due_date','amount','is_read','is_dismissed','created_at'], order: 'created_at DESC' },
};

// ── Resolve table name ───────────────────────────────────────────
function resolveTable(workspace, entity) {
  const table = `${workspace}_${entity}`;
  return TABLE_CONFIG[table] ? table : null;
}

// ── Factory: create GET/PUT handlers ─────────────────────────────
export function createEntityHandler(workspace, entity) {
  const table = resolveTable(workspace, entity);
  if (!table) return null;
  const config = TABLE_CONFIG[table];
  const jsonbCols = new Set(config.jsonb || []);
  const jsFieldMap = config.jsFieldMap || {};
  // Reverse map: db col name -> js field name override
  const reverseFieldMap = {};
  for (const [jsKey, dbCol] of Object.entries(jsFieldMap)) {
    reverseFieldMap[dbCol] = jsKey;
  }

  return {
    async GET() {
      const sql = getSQL();
      const rows = await sql(`SELECT * FROM ${table} ORDER BY ${config.order}`);
      return rows.map(row => {
        const obj = {};
        for (const [k, v] of Object.entries(row)) {
          const jsKey = reverseFieldMap[k] || snakeToCamel(k);
          obj[jsKey] = v;
        }
        return obj;
      });
    },

    async PUT(items) {
      const sql = getSQL();
      const incomingIds = items.map(i => i.id).filter(Boolean);

      // Delete orphans
      if (incomingIds.length > 0) {
        const placeholders = incomingIds.map((_, i) => `$${i + 1}`).join(',');
        await sql(`DELETE FROM ${table} WHERE id NOT IN (${placeholders})`, incomingIds);
      } else {
        await sql(`DELETE FROM ${table}`);
      }

      // Upsert each item
      for (const item of items) {
        const vals = config.columns.map(col => {
          // Find the JS key for this column
          const jsKey = reverseFieldMap[col] || snakeToCamel(col);
          let val = item[jsKey];
          if (val === undefined) val = null;
          // JSONB: stringify if not already string
          if (jsonbCols.has(col) && val !== null && typeof val !== 'string') {
            val = JSON.stringify(val);
          }
          return val;
        });

        const placeholders = vals.map((_, i) => `$${i + 1}`).join(',');
        const updateCols = config.columns.filter(c => c !== 'id');
        const updateSet = updateCols.map(c => {
          const idx = config.columns.indexOf(c) + 1;
          return `${c} = $${idx}`;
        }).join(', ');

        await sql(
          `INSERT INTO ${table} (${config.columns.join(',')}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateSet}`,
          vals
        );
      }

      return { ok: true, count: items.length };
    },

    async PATCH({ upsert = [], delete: deleteIds = [] }) {
      const sql = getSQL();
      if (deleteIds.length > 0) {
        const ph = deleteIds.map((_, i) => `$${i + 1}`).join(',');
        await sql(`DELETE FROM ${table} WHERE id IN (${ph})`, deleteIds);
      }
      for (const item of upsert) {
        const vals = config.columns.map(col => {
          const jsKey = reverseFieldMap[col] || snakeToCamel(col);
          let val = item[jsKey];
          if (val === undefined) val = null;
          if (jsonbCols.has(col) && val !== null && typeof val !== 'string') val = JSON.stringify(val);
          return val;
        });
        const placeholders = vals.map((_, i) => `$${i + 1}`).join(',');
        const updateCols = config.columns.filter(c => c !== 'id');
        const updateSet = updateCols.map(c => `${c} = $${config.columns.indexOf(c) + 1}`).join(', ');
        await sql(`INSERT INTO ${table} (${config.columns.join(',')}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateSet}`, vals);
      }
      return { ok: true, upserted: upsert.length, deleted: deleteIds.length };
    }
  };
}

export const VALID_W1_ENTITIES = ['tasks', 'ideas', 'notes', 'events', 'goals', 'guests'];
export const VALID_W2_ENTITIES = ['projects', 'tasks', 'goals', 'content', 'tools', 'clients', 'notes', 'personal'];
export const VALID_FIN_ENTITIES = ['categories', 'income_sources', 'fixed_costs', 'fixed_payments', 'transactions', 'emergency_reserve', 'monthly_budgets', 'credit_cards', 'card_bills', 'installments', 'debts', 'goals', 'alerts'];
