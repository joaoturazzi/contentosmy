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
