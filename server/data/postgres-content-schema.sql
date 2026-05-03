CREATE TABLE IF NOT EXISTS prompt_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  name TEXT,
  content TEXT NOT NULL,
  category TEXT,
  tags_json JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ
);

ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS tags_json JSONB;
ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS prompt_templates_user_id_idx ON prompt_templates(user_id);
CREATE INDEX IF NOT EXISTS prompt_templates_updated_at_idx ON prompt_templates(updated_at DESC);
CREATE INDEX IF NOT EXISTS prompt_templates_user_updated_at_idx ON prompt_templates(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS prompt_templates_user_last_used_at_idx ON prompt_templates(user_id, last_used_at DESC);

CREATE TABLE IF NOT EXISTS works (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  src TEXT,
  asset_id TEXT,
  asset_storage TEXT,
  asset_sync_status TEXT,
  asset_remote_key TEXT,
  asset_remote_url TEXT,
  asset_updated_at BIGINT,
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

ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_id TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_storage TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_sync_status TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_remote_key TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_remote_url TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_updated_at BIGINT;

CREATE INDEX IF NOT EXISTS works_user_id_idx ON works(user_id);
CREATE INDEX IF NOT EXISTS works_created_at_idx ON works(created_at DESC);
CREATE INDEX IF NOT EXISTS works_snapshot_id_idx ON works(snapshot_id);
CREATE INDEX IF NOT EXISTS works_asset_id_idx ON works(asset_id);
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

ALTER TABLE draw_batches ADD COLUMN IF NOT EXISTS cancelled_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE draw_batches ADD COLUMN IF NOT EXISTS interrupted_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE draw_batches ADD COLUMN IF NOT EXISTS timeout_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS draw_batches_user_id_idx ON draw_batches(user_id);
CREATE INDEX IF NOT EXISTS draw_batches_created_at_idx ON draw_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS draw_batches_user_created_at_idx ON draw_batches(user_id, created_at DESC);
