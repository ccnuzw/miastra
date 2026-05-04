import type { DataStore, StoredWork } from '../auth/types'
import { randomUUID } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { Pool } from 'pg'
import { createPostgresAuthTablesRepository } from './auth-tables.repository'
import { createPostgresGenerationTaskTablesRepository } from './generation-task-tables.repository'
import { createPostgresContentTablesRepository } from './content-tables.repository'
import { createPostgresAuditLogTablesRepository } from './audit-log-tables.repository'

export type StoreRepository = {
  read: () => Promise<DataStore>
  write: (store: DataStore) => Promise<void>
  mutate: <T>(updater: (store: DataStore) => T | Promise<T>) => Promise<T>
  createId: () => string
  close?: () => Promise<void>
}

export type JsonStoreRepositoryOptions = {
  filePath?: string
}

export type PostgresStoreRepositoryOptions = {
  connectionString: string
}

const defaultDataFilePath = resolve(__dirname, '../../data/auth.json')
let postgresSchemaReady: Promise<void> | null = null

const emptyStore: DataStore = {
  users: [],
  sessions: [],
  promptTemplates: [],
  works: [],
  providerConfigs: [],
  managedProviders: [],
  drawBatches: [],
  generationTasks: [],
  auditLogs: [],
  quotaProfiles: [],
  billingInvoices: [],
}

function normalizeStore(value: Partial<DataStore> | null | undefined): DataStore {
  const works = Array.isArray(value?.works)
    ? value.works.map((item) => normalizeStoredWork(item)).filter((item): item is StoredWork => Boolean(item))
    : []

  return {
    users: Array.isArray(value?.users) ? value.users : [],
    sessions: Array.isArray(value?.sessions) ? value.sessions : [],
    promptTemplates: Array.isArray(value?.promptTemplates) ? value.promptTemplates : [],
    works,
    providerConfigs: Array.isArray(value?.providerConfigs) ? value.providerConfigs : [],
    managedProviders: Array.isArray(value?.managedProviders) ? value.managedProviders : [],
    drawBatches: Array.isArray(value?.drawBatches) ? value.drawBatches : [],
    generationTasks: Array.isArray(value?.generationTasks) ? value.generationTasks : [],
    auditLogs: Array.isArray(value?.auditLogs) ? value.auditLogs : [],
    quotaProfiles: Array.isArray(value?.quotaProfiles) ? value.quotaProfiles : [],
    billingInvoices: Array.isArray(value?.billingInvoices) ? value.billingInvoices : [],
  }
}

function normalizeOptionalString(value: unknown) {
  return typeof value === 'string' ? value.trim() || undefined : undefined
}

function normalizeWorkTags(tags: unknown) {
  const values = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
      ? tags.split(/[,，\n]/)
      : []

  return Array.from(new Set(values.map((tag) => typeof tag === 'string' ? tag.trim() : '').filter(Boolean)))
}

function normalizeStoredWork(work: unknown): StoredWork | null {
  if (!work || typeof work !== 'object') return null
  const record = work as Record<string, unknown>
  const id = normalizeOptionalString(record.id)
  const userId = normalizeOptionalString(record.userId)
  if (!id || !userId) return null

  const isFavorite = Boolean(record.isFavorite)
  const src = normalizeOptionalString(record.src) ?? normalizeOptionalString(record.assetRemoteUrl)

  return {
    ...(record as StoredWork),
    id,
    userId,
    title: normalizeOptionalString(record.title) ?? '',
    src,
    assetId: normalizeOptionalString(record.assetId),
    assetRemoteKey: normalizeOptionalString(record.assetRemoteKey),
    assetRemoteUrl: normalizeOptionalString(record.assetRemoteUrl),
    meta: normalizeOptionalString(record.meta) ?? '',
    isFavorite,
    tags: normalizeWorkTags(record.tags),
  }
}

export function createJsonStoreRepository(options: JsonStoreRepositoryOptions = {}): StoreRepository {
  const filePath = options.filePath ?? defaultDataFilePath

  async function readJsonStore() {
    try {
      const content = await readFile(filePath, 'utf8')
      return normalizeStore(JSON.parse(content) as Partial<DataStore>)
    } catch {
      await writeJsonStore(emptyStore)
      return emptyStore
    }
  }

  async function writeJsonStore(store: DataStore) {
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, JSON.stringify(normalizeStore(store), null, 2), 'utf8')
  }

  return {
    async read() {
      return await readJsonStore()
    },
    async write(store) {
      await writeJsonStore(store)
    },
    async mutate(updater) {
      const store = await readJsonStore()
      const result = await updater(store)
      await writeJsonStore(store)
      return result
    },
    createId() {
      return randomUUID()
    },
  }
}

const postgresSchemaSql = `
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

  CREATE TABLE IF NOT EXISTS provider_configs (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL DEFAULT 'custom',
    provider_id TEXT NOT NULL,
    managed_provider_id TEXT,
    api_url TEXT NOT NULL,
    model TEXT NOT NULL,
    api_key TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  );

  ALTER TABLE provider_configs ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'custom';
  ALTER TABLE provider_configs ADD COLUMN IF NOT EXISTS managed_provider_id TEXT;

  CREATE TABLE IF NOT EXISTS managed_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    api_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    models_json JSONB NOT NULL,
    default_model TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
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
    asset_id TEXT,
    asset_storage TEXT,
    asset_sync_status TEXT,
    asset_remote_key TEXT,
    asset_remote_url TEXT,
    asset_updated_at BIGINT,
    tags_json JSONB
  );

  CREATE INDEX IF NOT EXISTS works_user_id_idx ON works(user_id);
  CREATE INDEX IF NOT EXISTS works_created_at_idx ON works(created_at DESC);
  CREATE INDEX IF NOT EXISTS works_snapshot_id_idx ON works(snapshot_id);

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
    cancelled_count INTEGER NOT NULL DEFAULT 0,
    interrupted_count INTEGER NOT NULL DEFAULT 0,
    timeout_count INTEGER NOT NULL DEFAULT 0,
    snapshot_id TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS draw_batches_user_id_idx ON draw_batches(user_id);
  CREATE INDEX IF NOT EXISTS draw_batches_created_at_idx ON draw_batches(created_at DESC);

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_role TEXT NOT NULL CHECK (actor_role IN ('user', 'operator', 'admin')),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    payload_json JSONB,
    ip TEXT,
    request_id TEXT,
    created_at TIMESTAMPTZ NOT NULL
  );

  CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id_idx ON audit_logs(actor_user_id);
  CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);
  CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);

  CREATE TABLE IF NOT EXISTS quota_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    quota_total INTEGER NOT NULL,
    quota_used INTEGER NOT NULL,
    quota_remaining INTEGER NOT NULL,
    renews_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL
  );

  CREATE INDEX IF NOT EXISTS quota_profiles_updated_at_idx ON quota_profiles(updated_at DESC);

  CREATE TABLE IF NOT EXISTS billing_invoices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    provider TEXT NOT NULL,
    provider_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  );

  CREATE INDEX IF NOT EXISTS billing_invoices_user_id_idx ON billing_invoices(user_id);
  CREATE INDEX IF NOT EXISTS billing_invoices_status_idx ON billing_invoices(status);
  CREATE INDEX IF NOT EXISTS billing_invoices_created_at_idx ON billing_invoices(created_at DESC);
`

async function ensurePostgresSchema(pool: Pool) {
  if (postgresSchemaReady) {
    return postgresSchemaReady
  }

  postgresSchemaReady = (async () => {
  await pool.query(postgresSchemaSql)
  await pool.query(`ALTER TABLE draw_batches ADD COLUMN IF NOT EXISTS cancelled_count INTEGER NOT NULL DEFAULT 0`)
  await pool.query(`ALTER TABLE draw_batches ADD COLUMN IF NOT EXISTS interrupted_count INTEGER NOT NULL DEFAULT 0`)
  await pool.query(`ALTER TABLE draw_batches ADD COLUMN IF NOT EXISTS timeout_count INTEGER NOT NULL DEFAULT 0`)
  await pool.query(`ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS category TEXT`)
  await pool.query(`ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS name TEXT`)
  await pool.query(`ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS tags_json JSONB`)
  await pool.query(`ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ`)
  await pool.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS favorite BOOLEAN`)
  await pool.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_id TEXT`)
  await pool.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_storage TEXT`)
  await pool.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_sync_status TEXT`)
  await pool.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_remote_key TEXT`)
  await pool.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_remote_url TEXT`)
  await pool.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_updated_at BIGINT`)
  await pool.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS request_id TEXT`)
  await pool.query(`CREATE INDEX IF NOT EXISTS prompt_templates_user_updated_at_idx ON prompt_templates(user_id, updated_at DESC)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS prompt_templates_user_last_used_at_idx ON prompt_templates(user_id, last_used_at DESC)`)
  })().catch((error) => {
    postgresSchemaReady = null
    throw error
  })

  return postgresSchemaReady
}

async function writeCoreTables(pool: Pool, store: DataStore) {
  await pool.query('BEGIN')
  try {
    await pool.query('DELETE FROM billing_invoices')
    await pool.query('DELETE FROM quota_profiles')
    await pool.query('DELETE FROM audit_logs')
    await pool.query('DELETE FROM generation_tasks')
    await pool.query('DELETE FROM managed_providers')
    await pool.query('DELETE FROM provider_configs')
    await pool.query('DELETE FROM sessions')
    await pool.query('DELETE FROM prompt_templates')
    await pool.query('DELETE FROM works')
    await pool.query('DELETE FROM draw_batches')
    await pool.query('DELETE FROM users')

    for (const user of store.users) {
      await pool.query(`INSERT INTO users (id, email, nickname, role, password_hash, password_reset_token, password_reset_expires_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [user.id, user.email, user.nickname, user.role, user.passwordHash, user.passwordResetToken ?? null, user.passwordResetExpiresAt ?? null, user.createdAt, user.updatedAt])
    }

    for (const session of store.sessions) {
      await pool.query(`INSERT INTO sessions (id, user_id, created_at, expires_at, revoked_at) VALUES ($1, $2, $3, $4, $5)`, [session.id, session.userId, session.createdAt, session.expiresAt, session.revokedAt ?? null])
    }

    for (const config of store.providerConfigs) {
      await pool.query(`INSERT INTO provider_configs (user_id, mode, provider_id, managed_provider_id, api_url, model, api_key, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [config.userId, config.mode, config.providerId, config.managedProviderId ?? null, config.apiUrl, config.model, config.apiKey, config.updatedAt])
    }

    for (const provider of store.managedProviders) {
      await pool.query(`INSERT INTO managed_providers (id, name, description, api_url, api_key, models_json, default_model, enabled, updated_at) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)`, [provider.id, provider.name, provider.description ?? null, provider.apiUrl, provider.apiKey, JSON.stringify(provider.models), provider.defaultModel, provider.enabled, provider.updatedAt])
    }

    for (const task of store.generationTasks) {
      await pool.query(`INSERT INTO generation_tasks (id, user_id, status, progress, error_message, payload_json, result_json, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)`, [task.id, task.userId, task.status, task.progress ?? null, task.errorMessage ?? null, JSON.stringify(task.payload), task.result ? JSON.stringify(task.result) : null, task.createdAt, task.updatedAt])
    }

    for (const template of store.promptTemplates) {
      const tags = Array.isArray(template.tags) ? Array.from(new Set(template.tags.map((tag) => tag.trim()).filter(Boolean))) : []
      await pool.query(`INSERT INTO prompt_templates (id, user_id, title, name, content, category, tags_json, created_at, updated_at, last_used_at) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)`, [template.id, template.userId, template.title ?? null, template.name ?? null, template.content, template.category ?? null, tags.length ? JSON.stringify(tags) : null, typeof template.createdAt === 'number' ? new Date(template.createdAt).toISOString() : template.createdAt, template.updatedAt ? (typeof template.updatedAt === 'number' ? new Date(template.updatedAt).toISOString() : template.updatedAt) : (typeof template.createdAt === 'number' ? new Date(template.createdAt).toISOString() : template.createdAt), template.lastUsedAt ? (typeof template.lastUsedAt === 'number' ? new Date(template.lastUsedAt).toISOString() : template.lastUsedAt) : null])
    }

    for (const work of store.works) {
      const isFavorite = work.isFavorite ?? work.favorite ?? false
      const tags = Array.isArray(work.tags) ? Array.from(new Set(work.tags.map((tag) => tag.trim()).filter(Boolean))) : []
      await pool.query(`INSERT INTO works (id, user_id, title, src, meta, variation, batch_id, draw_index, task_status, error, retryable, retry_count, created_at, mode, provider_model, size, quality, snapshot_id, generation_snapshot_json, prompt_snippet, prompt_text, is_favorite, favorite, tags_json, asset_id, asset_storage, asset_sync_status, asset_remote_key, asset_remote_url, asset_updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20, $21, $22, $23, $24::jsonb, $25, $26, $27, $28, $29, $30)`, [work.id, work.userId, work.title, work.src ?? null, work.meta, work.variation ?? null, work.batchId ?? null, work.drawIndex ?? null, work.taskStatus ?? null, work.error ?? null, work.retryable ?? null, work.retryCount ?? null, work.createdAt ?? null, work.mode ?? null, work.providerModel ?? null, work.size ?? null, work.quality ?? null, work.snapshotId ?? null, work.generationSnapshot ? JSON.stringify(work.generationSnapshot) : null, work.promptSnippet ?? null, work.promptText ?? null, isFavorite, isFavorite, tags.length ? JSON.stringify(tags) : null, work.assetId ?? null, work.assetStorage ?? null, work.assetSyncStatus ?? null, work.assetRemoteKey ?? null, work.assetRemoteUrl ?? null, work.assetUpdatedAt ?? null])
    }

    for (const batch of store.drawBatches) {
      await pool.query(`INSERT INTO draw_batches (id, user_id, title, created_at, strategy, concurrency, count, success_count, failed_count, cancelled_count, interrupted_count, timeout_count, snapshot_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [batch.id, batch.userId, batch.title, batch.createdAt, batch.strategy, batch.concurrency, batch.count, batch.successCount, batch.failedCount, batch.cancelledCount ?? 0, batch.interruptedCount ?? 0, batch.timeoutCount ?? 0, batch.snapshotId])
    }

    for (const log of store.auditLogs) {
      await pool.query(`INSERT INTO audit_logs (id, actor_user_id, actor_role, action, target_type, target_id, payload_json, ip, request_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)`, [log.id, log.actorUserId, log.actorRole, log.action, log.targetType, log.targetId, JSON.stringify(log.payload ?? {}), log.ip ?? null, log.requestId ?? null, log.createdAt])
    }

    for (const profile of store.quotaProfiles) {
      await pool.query(`INSERT INTO quota_profiles (user_id, plan_name, quota_total, quota_used, quota_remaining, renews_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [profile.userId, profile.planName, profile.quotaTotal, profile.quotaUsed, profile.quotaRemaining, profile.renewsAt ?? null, profile.updatedAt])
    }

    for (const invoice of store.billingInvoices) {
      await pool.query(`INSERT INTO billing_invoices (id, user_id, plan_name, amount_cents, currency, status, provider, provider_ref, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [invoice.id, invoice.userId, invoice.planName, invoice.amountCents, invoice.currency, invoice.status, invoice.provider, invoice.providerRef ?? null, invoice.createdAt, invoice.updatedAt])
    }

    await pool.query('COMMIT')
  } catch (error) {
    await pool.query('ROLLBACK')
    throw error
  }
}

export function createPostgresStoreRepository(options: PostgresStoreRepositoryOptions): StoreRepository {
  const pool = new Pool({ connectionString: options.connectionString })
  const authRepository = createPostgresAuthTablesRepository(pool)
  const generationTaskRepository = createPostgresGenerationTaskTablesRepository(pool)
  const contentRepository = createPostgresContentTablesRepository(pool)
  const auditRepository = createPostgresAuditLogTablesRepository(pool)

  async function readPostgresStore() {
    await ensurePostgresSchema(pool)
    const [users, sessions, providerConfigs, managedProviders, generationTasks, promptTemplates, works, drawBatches, auditLogs, quotaProfiles, billingInvoices] = await Promise.all([
      authRepository.listUsers(),
      authRepository.listSessions(),
      authRepository.listProviderConfigs(),
      pool.query(`
        SELECT id, name, description, api_url, api_key, models_json, default_model, enabled, updated_at
        FROM managed_providers
        ORDER BY updated_at DESC
      `).then((result) => result.rows.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        description: row.description ? String(row.description) : undefined,
        apiUrl: String(row.api_url),
        apiKey: String(row.api_key),
        models: Array.isArray(row.models_json) ? row.models_json.map(String) : [],
        defaultModel: String(row.default_model),
        enabled: Boolean(row.enabled),
        updatedAt: new Date(row.updated_at as string | Date).toISOString(),
      }))),
      generationTaskRepository.listGenerationTasks(),
      contentRepository.listPromptTemplates(),
      contentRepository.listWorks(),
      contentRepository.listDrawBatches(),
      auditRepository.listAuditLogs(),
      authRepository.listQuotaProfiles(),
      authRepository.listBillingInvoices(),
    ])

    return normalizeStore({
      users,
      sessions,
      providerConfigs,
      managedProviders,
      generationTasks,
      promptTemplates,
      works,
      drawBatches,
      auditLogs,
      quotaProfiles,
      billingInvoices,
    })
  }

  async function writePostgresStore(store: DataStore) {
    const normalized = normalizeStore(store)
    await ensurePostgresSchema(pool)
    await writeCoreTables(pool, normalized)
  }

  return {
    async read() {
      return await readPostgresStore()
    },
    async write(store) {
      await writePostgresStore(store)
    },
    async mutate(updater) {
      const store = await readPostgresStore()
      const result = await updater(store)
      await writePostgresStore(store)
      return result
    },
    createId() {
      return randomUUID()
    },
    async close() {
      await pool.end()
    },
  }
}
