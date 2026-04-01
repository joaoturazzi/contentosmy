-- =============================================
-- WORKSPACE 4: Cinematic Agency Engine
-- =============================================

CREATE TABLE IF NOT EXISTS w4_projects (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL DEFAULT '',
  type            TEXT NOT NULL DEFAULT 'site_rebirth',
  status          TEXT NOT NULL DEFAULT 'draft',
  input_url       TEXT DEFAULT '',
  input_text      TEXT DEFAULT '',
  input_channel   TEXT DEFAULT '',
  vibe            TEXT DEFAULT 'ethereal_glass',
  brand_blueprint JSONB DEFAULT '{}',
  scraped_data    JSONB DEFAULT '{}',
  output_content  JSONB DEFAULT '{}',
  error_message   TEXT DEFAULT '',
  notes           TEXT DEFAULT '',
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS w4_outputs (
  id          TEXT PRIMARY KEY,
  project_id  TEXT DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'component',
  title       TEXT NOT NULL DEFAULT '',
  content     TEXT DEFAULT '',
  language    TEXT DEFAULT 'tsx',
  metadata    JSONB DEFAULT '{}',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS w4_settings (
  id          TEXT PRIMARY KEY,
  key         TEXT NOT NULL DEFAULT '',
  value       TEXT DEFAULT '',
  created_at  TEXT NOT NULL
);
