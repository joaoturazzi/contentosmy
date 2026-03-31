-- =============================================
-- WORKSPACE 3: Finance
-- =============================================

CREATE TABLE IF NOT EXISTS fin_categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'expense',
  color       TEXT DEFAULT '',
  icon        TEXT DEFAULT '',
  is_fixed    BOOLEAN DEFAULT FALSE,
  is_business BOOLEAN DEFAULT FALSE,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_income_sources (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL DEFAULT '',
  expected_amount REAL NOT NULL DEFAULT 0,
  actual_amount   REAL DEFAULT NULL,
  month           INTEGER NOT NULL,
  year            INTEGER NOT NULL,
  funded_by       TEXT DEFAULT 'renda_principal',
  notes           TEXT DEFAULT '',
  received_at     TEXT DEFAULT '',
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_fixed_costs (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL DEFAULT '',
  amount                  REAL NOT NULL DEFAULT 0,
  category_id             TEXT DEFAULT '',
  payment_method          TEXT DEFAULT '',
  card_name               TEXT DEFAULT '',
  card_id                 TEXT DEFAULT '',
  due_day                 INTEGER DEFAULT NULL,
  is_active               BOOLEAN DEFAULT TRUE,
  is_business             BOOLEAN DEFAULT FALSE,
  funded_by               TEXT DEFAULT 'renda_principal',
  remaining_installments  INTEGER DEFAULT NULL,
  total_remaining_debt    REAL DEFAULT NULL,
  end_date                TEXT DEFAULT '',
  notes                   TEXT DEFAULT '',
  created_at              TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_fixed_payments (
  id              TEXT PRIMARY KEY,
  fixed_cost_id   TEXT DEFAULT '',
  month           INTEGER NOT NULL,
  year            INTEGER NOT NULL,
  budgeted_amount REAL NOT NULL DEFAULT 0,
  paid_amount     REAL DEFAULT NULL,
  status          TEXT DEFAULT 'pending',
  paid_at         TEXT DEFAULT '',
  notes           TEXT DEFAULT '',
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_transactions (
  id                TEXT PRIMARY KEY,
  description       TEXT NOT NULL DEFAULT '',
  merchant          TEXT DEFAULT '',
  amount            REAL NOT NULL DEFAULT 0,
  type              TEXT NOT NULL DEFAULT 'expense',
  category_id       TEXT DEFAULT '',
  payment_method    TEXT DEFAULT '',
  card_name         TEXT DEFAULT '',
  card_id           TEXT DEFAULT '',
  transaction_date  TEXT NOT NULL,
  month             INTEGER NOT NULL,
  year              INTEGER NOT NULL,
  is_fixed          BOOLEAN DEFAULT FALSE,
  is_business       BOOLEAN DEFAULT FALSE,
  fixed_cost_id     TEXT DEFAULT '',
  source            TEXT DEFAULT 'manual',
  external_id       TEXT DEFAULT '',
  notes             TEXT DEFAULT '',
  created_by        TEXT DEFAULT '',
  created_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_emergency_reserve (
  id                TEXT PRIMARY KEY,
  month             INTEGER NOT NULL,
  year              INTEGER NOT NULL,
  saved_amount      REAL DEFAULT 0,
  accumulated_total REAL DEFAULT 0,
  target_phase_1    REAL DEFAULT 5557,
  target_phase_2    REAL DEFAULT 16671,
  target_final      REAL DEFAULT 33342,
  notes             TEXT DEFAULT '',
  created_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_monthly_budgets (
  id              TEXT PRIMARY KEY,
  month           INTEGER NOT NULL,
  year            INTEGER NOT NULL,
  category_id     TEXT DEFAULT '',
  budgeted_amount REAL NOT NULL DEFAULT 0,
  notes           TEXT DEFAULT '',
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_credit_cards (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL DEFAULT '',
  last_four             TEXT DEFAULT '',
  bank                  TEXT DEFAULT '',
  credit_limit          REAL DEFAULT 0,
  closing_day           INTEGER DEFAULT NULL,
  due_day               INTEGER DEFAULT NULL,
  expected_monthly_bill REAL DEFAULT NULL,
  color                 TEXT DEFAULT '#888',
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_card_bills (
  id            TEXT PRIMARY KEY,
  card_id       TEXT DEFAULT '',
  month         INTEGER NOT NULL,
  year          INTEGER NOT NULL,
  total_amount  REAL DEFAULT 0,
  paid_amount   REAL DEFAULT NULL,
  status        TEXT DEFAULT 'open',
  due_date      TEXT DEFAULT '',
  paid_at       TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_installments (
  id                      TEXT PRIMARY KEY,
  description             TEXT NOT NULL DEFAULT '',
  total_amount            REAL NOT NULL DEFAULT 0,
  installment_amount      REAL NOT NULL DEFAULT 0,
  total_installments      INTEGER NOT NULL DEFAULT 1,
  paid_installments       INTEGER DEFAULT 0,
  remaining_installments  INTEGER DEFAULT NULL,
  start_date              TEXT DEFAULT '',
  end_date                TEXT DEFAULT '',
  card_id                 TEXT DEFAULT '',
  category_id             TEXT DEFAULT '',
  is_active               BOOLEAN DEFAULT TRUE,
  notes                   TEXT DEFAULT '',
  created_at              TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_debts (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL DEFAULT '',
  creditor                TEXT DEFAULT '',
  original_amount         REAL DEFAULT NULL,
  remaining_amount        REAL DEFAULT NULL,
  monthly_payment         REAL DEFAULT 0,
  interest_rate           REAL DEFAULT NULL,
  remaining_installments  INTEGER DEFAULT NULL,
  next_due_date           TEXT DEFAULT '',
  payment_method          TEXT DEFAULT '',
  is_active               BOOLEAN DEFAULT TRUE,
  notes                   TEXT DEFAULT '',
  created_at              TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_goals (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL DEFAULT '',
  target_amount   REAL NOT NULL DEFAULT 0,
  current_amount  REAL DEFAULT 0,
  target_date     TEXT DEFAULT '',
  category        TEXT DEFAULT 'custom',
  color           TEXT DEFAULT '#888',
  is_achieved     BOOLEAN DEFAULT FALSE,
  notes           TEXT DEFAULT '',
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_alerts (
  id            TEXT PRIMARY KEY,
  type          TEXT NOT NULL DEFAULT 'info',
  title         TEXT NOT NULL DEFAULT '',
  message       TEXT DEFAULT '',
  due_date      TEXT DEFAULT '',
  amount        REAL DEFAULT NULL,
  is_read       BOOLEAN DEFAULT FALSE,
  is_dismissed  BOOLEAN DEFAULT FALSE,
  created_at    TEXT NOT NULL
);
