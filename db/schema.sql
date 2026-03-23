-- =============================================
-- WORKSPACE 1: Content OS
-- =============================================

CREATE TABLE IF NOT EXISTS w1_tasks (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL DEFAULT '',
  channel       TEXT NOT NULL DEFAULT 'geral',
  priority      TEXT NOT NULL DEFAULT 'media',
  due_date      TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  done          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS w1_ideas (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL DEFAULT '',
  channel           TEXT NOT NULL DEFAULT 'youtube',
  description       TEXT DEFAULT '',
  tags              TEXT DEFAULT '',
  priority          TEXT NOT NULL DEFAULT 'media',
  scheduled         BOOLEAN NOT NULL DEFAULT FALSE,
  score_thumbnail   BOOLEAN NOT NULL DEFAULT FALSE,
  score_loop        BOOLEAN NOT NULL DEFAULT FALSE,
  score_original    BOOLEAN NOT NULL DEFAULT FALSE,
  status            TEXT NOT NULL DEFAULT 'ideia',
  created_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS w1_notes (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL DEFAULT '',
  content       TEXT DEFAULT '',
  category      TEXT NOT NULL DEFAULT 'geral',
  event_id      TEXT DEFAULT '',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS w1_events (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL DEFAULT '',
  channel           TEXT NOT NULL DEFAULT 'youtube',
  type              TEXT NOT NULL DEFAULT 'Vídeo',
  description       TEXT DEFAULT '',
  link              TEXT DEFAULT '',
  date              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'ideia',
  alt_title         TEXT DEFAULT '',
  thumbnail_concept TEXT DEFAULT '',
  open_loop         TEXT DEFAULT '',
  interviewee       TEXT DEFAULT '',
  checklist         JSONB DEFAULT '[]',
  views             INTEGER DEFAULT NULL,
  ctr               REAL DEFAULT NULL,
  avg_retention     REAL DEFAULT NULL,
  new_subs          INTEGER DEFAULT NULL,
  winning_thumb     TEXT DEFAULT '',
  score_thumbnail   BOOLEAN DEFAULT NULL,
  score_loop        BOOLEAN DEFAULT NULL,
  score_original    BOOLEAN DEFAULT NULL,
  idea_id           TEXT DEFAULT NULL,
  is_production     BOOLEAN DEFAULT FALSE,
  guest_id          TEXT DEFAULT NULL,
  structure         TEXT DEFAULT '',
  questions         TEXT DEFAULT '',
  cta               TEXT DEFAULT '',
  strategic_notes   TEXT DEFAULT '',
  created_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS w1_guests (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL DEFAULT '',
  company     TEXT DEFAULT '',
  role        TEXT DEFAULT '',
  linkedin    TEXT DEFAULT '',
  email       TEXT DEFAULT '',
  phone       TEXT DEFAULT '',
  status      TEXT DEFAULT 'potencial',
  notes       TEXT DEFAULT '',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS w1_goals (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL DEFAULT '',
  description     TEXT DEFAULT '',
  category        TEXT NOT NULL DEFAULT 'Canal',
  status          TEXT NOT NULL DEFAULT 'ativo',
  progress        REAL NOT NULL DEFAULT 0,
  deadline        TEXT DEFAULT '',
  progress_mode   TEXT NOT NULL DEFAULT 'manual',
  key_results     JSONB DEFAULT '[]',
  created_at      TEXT NOT NULL
);

-- =============================================
-- WORKSPACE 2: One Person Business
-- =============================================

CREATE TABLE IF NOT EXISTS w2_projects (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL DEFAULT '',
  area          TEXT NOT NULL DEFAULT 'Patagon AI',
  status        TEXT NOT NULL DEFAULT 'todo',
  description   TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  goal_id       TEXT DEFAULT NULL,
  client_id     TEXT DEFAULT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS w2_tasks (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL DEFAULT '',
  project_id    TEXT DEFAULT '',
  priority      TEXT NOT NULL DEFAULT 'media',
  due_date      TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  done          BOOLEAN NOT NULL DEFAULT FALSE,
  goal_id       TEXT DEFAULT NULL,
  is_recurring  BOOLEAN NOT NULL DEFAULT FALSE,
  frequency     TEXT DEFAULT '',
  next_due      TEXT DEFAULT '',
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS w2_goals (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL DEFAULT '',
  description     TEXT DEFAULT '',
  category        TEXT NOT NULL DEFAULT 'Produto',
  status          TEXT NOT NULL DEFAULT 'ativo',
  progress        REAL NOT NULL DEFAULT 0,
  deadline        TEXT DEFAULT '',
  progress_mode   TEXT NOT NULL DEFAULT 'manual',
  key_results     JSONB DEFAULT '[]',
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS w2_content (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL DEFAULT '',
  channel         TEXT NOT NULL DEFAULT 'linkedin',
  type            TEXT NOT NULL DEFAULT 'Post',
  status          TEXT NOT NULL DEFAULT 'idea',
  scheduled_date  TEXT DEFAULT '',
  description     TEXT DEFAULT '',
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS w2_tools (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL DEFAULT '',
  category      TEXT DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'on',
  url           TEXT DEFAULT '',
  description   TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS w2_clients (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL DEFAULT '',
  company       TEXT DEFAULT '',
  contact       TEXT DEFAULT '',
  email         TEXT DEFAULT '',
  phone         TEXT DEFAULT '',
  area          TEXT NOT NULL DEFAULT 'Patagon AI',
  deal_value    REAL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'lead',
  notes         TEXT DEFAULT '',
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS w2_notes (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL DEFAULT '',
  content       TEXT DEFAULT '',
  project_id    TEXT DEFAULT '',
  category      TEXT NOT NULL DEFAULT 'Geral',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS w2_personal (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL DEFAULT '',
  done          BOOLEAN NOT NULL DEFAULT FALSE,
  date          TEXT NOT NULL,
  notes         TEXT DEFAULT '',
  created_at    TEXT NOT NULL
);
