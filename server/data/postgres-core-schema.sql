CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'operator', 'admin')),
  password_hash TEXT NOT NULL,
  password_reset_token TEXT,
  password_reset_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS sessions_user_created_at_idx ON sessions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS provider_configs (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  api_url TEXT NOT NULL,
  model TEXT NOT NULL,
  api_key TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS generation_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'queued', 'running', 'succeeded', 'failed', 'cancelled', 'timeout')),
  progress INTEGER,
  error_message TEXT,
  payload_json JSONB NOT NULL,
  result_json JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS generation_tasks_user_id_idx ON generation_tasks(user_id);
CREATE INDEX IF NOT EXISTS generation_tasks_status_idx ON generation_tasks(status);
CREATE INDEX IF NOT EXISTS generation_tasks_created_at_idx ON generation_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS generation_tasks_user_created_at_idx ON generation_tasks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS generation_tasks_status_created_at_idx ON generation_tasks(status, created_at ASC);
