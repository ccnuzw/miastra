CREATE TABLE IF NOT EXISTS prompt_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS prompt_templates_user_id_idx ON prompt_templates(user_id);
CREATE INDEX IF NOT EXISTS prompt_templates_updated_at_idx ON prompt_templates(updated_at DESC);
CREATE INDEX IF NOT EXISTS prompt_templates_user_updated_at_idx ON prompt_templates(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS works (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  src TEXT,
  meta TEXT NOT NULL,
  variation TEXT,
  batch_id TEXT,
  draw_index INTEGER,
  task_status TEXT,
  error TEXT,
  retryable BOOLEAN,
  retry_count INTEGER,
  created_at BIGINT,
  mode TEXT,
  provider_model TEXT,
  size TEXT,
  quality TEXT,
  snapshot_id TEXT,
  generation_snapshot_json JSONB,
  prompt_snippet TEXT,
  prompt_text TEXT,
  is_favorite BOOLEAN,
  favorite BOOLEAN,
  tags_json JSONB
);

CREATE INDEX IF NOT EXISTS works_user_id_idx ON works(user_id);
CREATE INDEX IF NOT EXISTS works_created_at_idx ON works(created_at DESC);
CREATE INDEX IF NOT EXISTS works_snapshot_id_idx ON works(snapshot_id);
CREATE INDEX IF NOT EXISTS works_user_created_at_idx ON works(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS works_user_snapshot_id_idx ON works(user_id, snapshot_id);

CREATE TABLE IF NOT EXISTS draw_batches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  strategy TEXT NOT NULL,
  concurrency INTEGER NOT NULL,
  count INTEGER NOT NULL,
  success_count INTEGER NOT NULL,
  failed_count INTEGER NOT NULL,
  snapshot_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS draw_batches_user_id_idx ON draw_batches(user_id);
CREATE INDEX IF NOT EXISTS draw_batches_created_at_idx ON draw_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS draw_batches_user_created_at_idx ON draw_batches(user_id, created_at DESC);
