import type { Pool } from 'pg'
import type { StoredDrawBatch, StoredPromptTemplate, StoredWork } from '../auth/types'

export type ContentTablesRepository = {
  listPromptTemplates: () => Promise<StoredPromptTemplate[]>
  listWorks: () => Promise<StoredWork[]>
  listDrawBatches: () => Promise<StoredDrawBatch[]>
  listPromptTemplatesByUserId: (userId: string) => Promise<StoredPromptTemplate[]>
  upsertPromptTemplateForUser: (template: StoredPromptTemplate) => Promise<StoredPromptTemplate>
  markPromptTemplateUsedForUser: (userId: string, id: string, usedAt: string) => Promise<StoredPromptTemplate | null>
  deletePromptTemplateForUser: (userId: string, id: string) => Promise<boolean>
  listWorksByUserId: (userId: string) => Promise<StoredWork[]>
  replaceWorksByUserId: (userId: string, works: StoredWork[]) => Promise<void>
  upsertWorkForUser: (work: StoredWork) => Promise<StoredWork>
  deleteWorkForUser: (userId: string, id: string) => Promise<boolean>
  deleteWorksForUser: (userId: string, ids: string[]) => Promise<number>
  updateWorkFavoriteForUser: (userId: string, id: string, isFavorite: boolean) => Promise<StoredWork | null>
  replaceWorkTagsForUser: (userId: string, id: string, tags: string[]) => Promise<StoredWork | null>
  addTagToWorksForUser: (userId: string, ids: string[], tag: string) => Promise<StoredWork[]>
  removeTagFromWorksForUser: (userId: string, ids: string[], tag: string) => Promise<StoredWork[]>
  insertWorkIfAbsentBySnapshot: (work: StoredWork) => Promise<void>
  listDrawBatchesByUserId: (userId: string) => Promise<StoredDrawBatch[]>
  findDrawBatchByIdForUser: (userId: string, id: string) => Promise<StoredDrawBatch | null>
  upsertDrawBatchForUser: (batch: StoredDrawBatch) => Promise<StoredDrawBatch>
  replaceDrawBatchesByUserId: (userId: string, batches: StoredDrawBatch[]) => Promise<void>
}

type Queryable = Pick<Pool, 'query'>

async function ensureDrawBatchColumns(pool: Pool) {
  await pool.query(`ALTER TABLE draw_batches ADD COLUMN IF NOT EXISTS cancelled_count INTEGER NOT NULL DEFAULT 0`)
  await pool.query(`ALTER TABLE draw_batches ADD COLUMN IF NOT EXISTS interrupted_count INTEGER NOT NULL DEFAULT 0`)
  await pool.query(`ALTER TABLE draw_batches ADD COLUMN IF NOT EXISTS timeout_count INTEGER NOT NULL DEFAULT 0`)
}

async function ensurePromptTemplateColumns(pool: Pool) {
  await pool.query(`ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS category TEXT`)
  await pool.query(`ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS tags_json JSONB`)
  await pool.query(`ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ`)
}

async function ensureWorkAssetColumns(queryable: Queryable) {
  await queryable.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_id TEXT`)
  await queryable.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_storage TEXT`)
  await queryable.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_sync_status TEXT`)
  await queryable.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_remote_key TEXT`)
  await queryable.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_remote_url TEXT`)
  await queryable.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_updated_at BIGINT`)
}

const workSelectSql = `
  SELECT id, user_id, title, src, asset_id, asset_storage, asset_sync_status, asset_remote_key, asset_remote_url, asset_updated_at, meta, variation, batch_id, draw_index, task_status, error, retryable, retry_count, created_at, mode, provider_model, size, quality, snapshot_id, generation_snapshot_json, prompt_snippet, prompt_text, is_favorite, favorite, tags_json
  FROM works
`

function normalizeWorkTags(tags: unknown) {
  const values = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
      ? tags.split(/[,，\n]/)
      : []
  return Array.from(new Set(values.map((tag) => typeof tag === 'string' ? tag.trim() : '').filter(Boolean)))
}

function normalizeStoredWork(work: StoredWork): StoredWork {
  const isFavorite = Boolean(work.isFavorite ?? work.favorite)
  const tags = normalizeWorkTags(work.tags)
  return {
    ...work,
    isFavorite,
    favorite: isFavorite,
    tags,
  }
}

async function listWorksByIdsForUser(queryable: Queryable, userId: string, ids: string[]) {
  if (!ids.length) return []
  await ensureWorkAssetColumns(queryable)
  const result = await queryable.query(`
    ${workSelectSql}
    WHERE user_id = $1 AND id = ANY($2::text[])
  `, [userId, ids])
  return result.rows.map(mapWorkRow)
}

function mapPromptTemplateRow(row: Record<string, unknown>): StoredPromptTemplate {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: row.title ? String(row.title) : undefined,
    name: row.name ? String(row.name) : undefined,
    content: String(row.content ?? ''),
    category: row.category ? String(row.category) : undefined,
    tags: normalizeWorkTags(row.tags_json),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    lastUsedAt: row.last_used_at ? (row.last_used_at instanceof Date ? row.last_used_at.toISOString() : String(row.last_used_at)) : null,
  }
}

function mapWorkRow(row: Record<string, unknown>): StoredWork {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title ?? ''),
    src: row.src ? String(row.src) : undefined,
    assetId: row.asset_id ? String(row.asset_id) : undefined,
    assetStorage: row.asset_storage ? String(row.asset_storage) as StoredWork['assetStorage'] : undefined,
    assetSyncStatus: row.asset_sync_status ? String(row.asset_sync_status) as StoredWork['assetSyncStatus'] : undefined,
    assetRemoteKey: row.asset_remote_key ? String(row.asset_remote_key) : undefined,
    assetRemoteUrl: row.asset_remote_url ? String(row.asset_remote_url) : undefined,
    assetUpdatedAt: row.asset_updated_at === null || row.asset_updated_at === undefined ? undefined : Number(row.asset_updated_at),
    meta: String(row.meta ?? ''),
    variation: row.variation ? String(row.variation) : undefined,
    batchId: row.batch_id ? String(row.batch_id) : undefined,
    drawIndex: row.draw_index === null || row.draw_index === undefined ? undefined : Number(row.draw_index),
    taskStatus: row.task_status ? String(row.task_status) as StoredWork['taskStatus'] : undefined,
    error: row.error ? String(row.error) : undefined,
    retryable: row.retryable === null || row.retryable === undefined ? undefined : Boolean(row.retryable),
    retryCount: row.retry_count === null || row.retry_count === undefined ? undefined : Number(row.retry_count),
    createdAt: row.created_at === null || row.created_at === undefined ? undefined : Number(row.created_at),
    mode: row.mode ? String(row.mode) as StoredWork['mode'] : undefined,
    providerModel: row.provider_model ? String(row.provider_model) : undefined,
    size: row.size ? String(row.size) : undefined,
    quality: row.quality ? String(row.quality) : undefined,
    snapshotId: row.snapshot_id ? String(row.snapshot_id) : undefined,
    generationSnapshot: row.generation_snapshot_json ?? undefined,
    promptSnippet: row.prompt_snippet ? String(row.prompt_snippet) : undefined,
    promptText: row.prompt_text ? String(row.prompt_text) : undefined,
    isFavorite: row.is_favorite === null || row.is_favorite === undefined ? undefined : Boolean(row.is_favorite),
    favorite: row.favorite === null || row.favorite === undefined ? undefined : Boolean(row.favorite),
    tags: normalizeWorkTags(row.tags_json),
  }
}

function mapDrawBatchRow(row: Record<string, unknown>): StoredDrawBatch {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title ?? ''),
    createdAt: Number(row.created_at),
    strategy: String(row.strategy) as StoredDrawBatch['strategy'],
    concurrency: Number(row.concurrency),
    count: Number(row.count),
    successCount: Number(row.success_count),
    failedCount: Number(row.failed_count),
    cancelledCount: Number(row.cancelled_count ?? 0),
    interruptedCount: Number(row.interrupted_count ?? 0),
    timeoutCount: Number(row.timeout_count ?? 0),
    snapshotId: String(row.snapshot_id),
  }
}

function promptTemplateValues(template: StoredPromptTemplate) {
  const tags = Array.isArray(template.tags) ? Array.from(new Set(template.tags.map((tag) => tag.trim()).filter(Boolean))) : []
  return [
    template.id,
    template.userId,
    template.title ?? null,
    template.name ?? null,
    template.content,
    template.category?.trim() || null,
    tags.length ? JSON.stringify(tags) : null,
    typeof template.createdAt === 'number' ? new Date(template.createdAt).toISOString() : template.createdAt,
    template.updatedAt ? (typeof template.updatedAt === 'number' ? new Date(template.updatedAt).toISOString() : template.updatedAt) : (typeof template.createdAt === 'number' ? new Date(template.createdAt).toISOString() : template.createdAt),
    template.lastUsedAt ? (typeof template.lastUsedAt === 'number' ? new Date(template.lastUsedAt).toISOString() : template.lastUsedAt) : null,
  ]
}

function workValues(work: StoredWork) {
  const normalized = normalizeStoredWork(work)
  return [
    normalized.id,
    normalized.userId,
    normalized.title,
    normalized.src ?? null,
    normalized.assetId ?? null,
    normalized.assetStorage ?? null,
    normalized.assetSyncStatus ?? null,
    normalized.assetRemoteKey ?? null,
    normalized.assetRemoteUrl ?? null,
    normalized.assetUpdatedAt ?? null,
    normalized.meta,
    normalized.variation ?? null,
    normalized.batchId ?? null,
    normalized.drawIndex ?? null,
    normalized.taskStatus ?? null,
    normalized.error ?? null,
    normalized.retryable ?? null,
    normalized.retryCount ?? null,
    normalized.createdAt ?? null,
    normalized.mode ?? null,
    normalized.providerModel ?? null,
    normalized.size ?? null,
    normalized.quality ?? null,
    normalized.snapshotId ?? null,
    normalized.generationSnapshot ? JSON.stringify(normalized.generationSnapshot) : null,
    normalized.promptSnippet ?? null,
    normalized.promptText ?? null,
    normalized.isFavorite ?? null,
    normalized.favorite ?? null,
    normalized.tags.length ? JSON.stringify(normalized.tags) : null,
  ]
}

function drawBatchValues(batch: StoredDrawBatch) {
  return [
    batch.id,
    batch.userId,
    batch.title,
    batch.createdAt,
    batch.strategy,
    batch.concurrency,
    batch.count,
    batch.successCount,
    batch.failedCount,
    batch.cancelledCount,
    batch.interruptedCount,
    batch.timeoutCount,
    batch.snapshotId,
  ]
}

export function createPostgresContentTablesRepository(pool: Pool): ContentTablesRepository {
  return {
    async listPromptTemplates() {
      await ensurePromptTemplateColumns(pool)
      const result = await pool.query(`
        SELECT id, user_id, title, name, content, category, tags_json, created_at, updated_at, last_used_at
        FROM prompt_templates
        ORDER BY updated_at DESC
      `)
      return result.rows.map(mapPromptTemplateRow)
    },
    async listWorks() {
      await ensureWorkAssetColumns(pool)
      const result = await pool.query(`
        ${workSelectSql}
        ORDER BY created_at DESC
      `)
      return result.rows.map(mapWorkRow)
    },
    async listDrawBatches() {
      await ensureDrawBatchColumns(pool)
      const result = await pool.query(`
        SELECT id, user_id, title, created_at, strategy, concurrency, count, success_count, failed_count, cancelled_count, interrupted_count, timeout_count, snapshot_id
        FROM draw_batches
        ORDER BY created_at DESC
      `)
      return result.rows.map(mapDrawBatchRow)
    },
    async listPromptTemplatesByUserId(userId) {
      await ensurePromptTemplateColumns(pool)
      const result = await pool.query(`
        SELECT id, user_id, title, name, content, category, tags_json, created_at, updated_at, last_used_at
        FROM prompt_templates
        WHERE user_id = $1
        ORDER BY updated_at DESC
      `, [userId])
      return result.rows.map(mapPromptTemplateRow)
    },
    async upsertPromptTemplateForUser(template) {
      await ensurePromptTemplateColumns(pool)
      const result = await pool.query(`
        INSERT INTO prompt_templates (id, user_id, title, name, content, category, tags_json, created_at, updated_at, last_used_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
        ON CONFLICT (id)
        DO UPDATE SET title = EXCLUDED.title, name = EXCLUDED.name, content = EXCLUDED.content, category = EXCLUDED.category, tags_json = EXCLUDED.tags_json, updated_at = EXCLUDED.updated_at
        WHERE prompt_templates.user_id = EXCLUDED.user_id
        RETURNING id, user_id, title, name, content, category, tags_json, created_at, updated_at, last_used_at
      `, promptTemplateValues(template))
      if (result.rows[0]) return mapPromptTemplateRow(result.rows[0])
      throw new Error('模板 ID 已被占用')
    },
    async markPromptTemplateUsedForUser(userId, id, usedAt) {
      await ensurePromptTemplateColumns(pool)
      const result = await pool.query(`
        UPDATE prompt_templates
        SET last_used_at = $3
        WHERE user_id = $1 AND id = $2
        RETURNING id, user_id, title, name, content, category, tags_json, created_at, updated_at, last_used_at
      `, [userId, id, usedAt])
      return result.rows[0] ? mapPromptTemplateRow(result.rows[0]) : null
    },
    async deletePromptTemplateForUser(userId, id) {
      const result = await pool.query(`DELETE FROM prompt_templates WHERE user_id = $1 AND id = $2`, [userId, id])
      return result.rowCount > 0
    },
    async listWorksByUserId(userId) {
      await ensureWorkAssetColumns(pool)
      const result = await pool.query(`
        ${workSelectSql}
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [userId])
      return result.rows.map(mapWorkRow)
    },
    async replaceWorksByUserId(userId, works) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await ensureWorkAssetColumns(client)
        await client.query(`DELETE FROM works WHERE user_id = $1`, [userId])
        for (const work of works) {
          await client.query(`
            INSERT INTO works (id, user_id, title, src, asset_id, asset_storage, asset_sync_status, asset_remote_key, asset_remote_url, asset_updated_at, meta, variation, batch_id, draw_index, task_status, error, retryable, retry_count, created_at, mode, provider_model, size, quality, snapshot_id, generation_snapshot_json, prompt_snippet, prompt_text, is_favorite, favorite, tags_json)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25::jsonb, $26, $27, $28, $29, $30::jsonb)
          `, workValues(work))
        }
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },
    async upsertWorkForUser(work) {
      await ensureWorkAssetColumns(pool)
      const result = await pool.query(`
        INSERT INTO works (id, user_id, title, src, asset_id, asset_storage, asset_sync_status, asset_remote_key, asset_remote_url, asset_updated_at, meta, variation, batch_id, draw_index, task_status, error, retryable, retry_count, created_at, mode, provider_model, size, quality, snapshot_id, generation_snapshot_json, prompt_snippet, prompt_text, is_favorite, favorite, tags_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25::jsonb, $26, $27, $28, $29, $30::jsonb)
        ON CONFLICT (id)
        DO UPDATE SET
          title = EXCLUDED.title,
          src = EXCLUDED.src,
          asset_id = EXCLUDED.asset_id,
          asset_storage = EXCLUDED.asset_storage,
          asset_sync_status = EXCLUDED.asset_sync_status,
          asset_remote_key = EXCLUDED.asset_remote_key,
          asset_remote_url = EXCLUDED.asset_remote_url,
          asset_updated_at = EXCLUDED.asset_updated_at,
          meta = EXCLUDED.meta,
          variation = EXCLUDED.variation,
          batch_id = EXCLUDED.batch_id,
          draw_index = EXCLUDED.draw_index,
          task_status = EXCLUDED.task_status,
          error = EXCLUDED.error,
          retryable = EXCLUDED.retryable,
          retry_count = EXCLUDED.retry_count,
          created_at = EXCLUDED.created_at,
          mode = EXCLUDED.mode,
          provider_model = EXCLUDED.provider_model,
          size = EXCLUDED.size,
          quality = EXCLUDED.quality,
          snapshot_id = EXCLUDED.snapshot_id,
          generation_snapshot_json = EXCLUDED.generation_snapshot_json,
          prompt_snippet = EXCLUDED.prompt_snippet,
          prompt_text = EXCLUDED.prompt_text,
          is_favorite = EXCLUDED.is_favorite,
          favorite = EXCLUDED.favorite,
          tags_json = EXCLUDED.tags_json
        WHERE works.user_id = EXCLUDED.user_id
        RETURNING id, user_id, title, src, asset_id, asset_storage, asset_sync_status, asset_remote_key, asset_remote_url, asset_updated_at, meta, variation, batch_id, draw_index, task_status, error, retryable, retry_count, created_at, mode, provider_model, size, quality, snapshot_id, generation_snapshot_json, prompt_snippet, prompt_text, is_favorite, favorite, tags_json
      `, workValues(work))

      if (result.rows[0]) return mapWorkRow(result.rows[0])
      throw new Error('作品 ID 已被占用')
    },
    async deleteWorkForUser(userId, id) {
      const result = await pool.query(`DELETE FROM works WHERE user_id = $1 AND id = $2`, [userId, id])
      return result.rowCount > 0
    },
    async deleteWorksForUser(userId, ids) {
      if (!ids.length) return 0
      const result = await pool.query(`DELETE FROM works WHERE user_id = $1 AND id = ANY($2::text[])`, [userId, ids])
      return result.rowCount
    },
    async updateWorkFavoriteForUser(userId, id, isFavorite) {
      await ensureWorkAssetColumns(pool)
      const result = await pool.query(`
        UPDATE works
        SET is_favorite = $3, favorite = $3
        WHERE user_id = $1 AND id = $2
        RETURNING id, user_id, title, src, asset_id, asset_storage, asset_sync_status, asset_remote_key, asset_remote_url, asset_updated_at, meta, variation, batch_id, draw_index, task_status, error, retryable, retry_count, created_at, mode, provider_model, size, quality, snapshot_id, generation_snapshot_json, prompt_snippet, prompt_text, is_favorite, favorite, tags_json
      `, [userId, id, isFavorite])
      return result.rows[0] ? mapWorkRow(result.rows[0]) : null
    },
    async replaceWorkTagsForUser(userId, id, tags) {
      const nextTags = normalizeWorkTags(tags)
      await ensureWorkAssetColumns(pool)
      const result = await pool.query(`
        UPDATE works
        SET tags_json = $3::jsonb
        WHERE user_id = $1 AND id = $2
        RETURNING id, user_id, title, src, asset_id, asset_storage, asset_sync_status, asset_remote_key, asset_remote_url, asset_updated_at, meta, variation, batch_id, draw_index, task_status, error, retryable, retry_count, created_at, mode, provider_model, size, quality, snapshot_id, generation_snapshot_json, prompt_snippet, prompt_text, is_favorite, favorite, tags_json
      `, [userId, id, nextTags.length ? JSON.stringify(nextTags) : null])
      return result.rows[0] ? mapWorkRow(result.rows[0]) : null
    },
    async addTagToWorksForUser(userId, ids, tag) {
      const nextTag = tag.trim()
      if (!nextTag || !ids.length) return []
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await ensureWorkAssetColumns(client)
        const works = await listWorksByIdsForUser(client, userId, ids)
        const updatedWorks: StoredWork[] = []
        for (const work of works) {
          const nextTags = normalizeWorkTags([...(work.tags ?? []), nextTag])
          const result = await client.query(`
            UPDATE works
            SET tags_json = $3::jsonb
            WHERE user_id = $1 AND id = $2
            RETURNING id, user_id, title, src, asset_id, asset_storage, asset_sync_status, asset_remote_key, asset_remote_url, asset_updated_at, meta, variation, batch_id, draw_index, task_status, error, retryable, retry_count, created_at, mode, provider_model, size, quality, snapshot_id, generation_snapshot_json, prompt_snippet, prompt_text, is_favorite, favorite, tags_json
          `, [userId, work.id, nextTags.length ? JSON.stringify(nextTags) : null])
          if (result.rows[0]) updatedWorks.push(mapWorkRow(result.rows[0]))
        }
        await client.query('COMMIT')
        return updatedWorks
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },
    async removeTagFromWorksForUser(userId, ids, tag) {
      const nextTag = tag.trim()
      if (!nextTag || !ids.length) return []
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await ensureWorkAssetColumns(client)
        const works = await listWorksByIdsForUser(client, userId, ids)
        const updatedWorks: StoredWork[] = []
        for (const work of works) {
          const nextTags = normalizeWorkTags((work.tags ?? []).filter((currentTag) => currentTag !== nextTag))
          const result = await client.query(`
            UPDATE works
            SET tags_json = $3::jsonb
            WHERE user_id = $1 AND id = $2
            RETURNING id, user_id, title, src, asset_id, asset_storage, asset_sync_status, asset_remote_key, asset_remote_url, asset_updated_at, meta, variation, batch_id, draw_index, task_status, error, retryable, retry_count, created_at, mode, provider_model, size, quality, snapshot_id, generation_snapshot_json, prompt_snippet, prompt_text, is_favorite, favorite, tags_json
          `, [userId, work.id, nextTags.length ? JSON.stringify(nextTags) : null])
          if (result.rows[0]) updatedWorks.push(mapWorkRow(result.rows[0]))
        }
        await client.query('COMMIT')
        return updatedWorks
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },
    async insertWorkIfAbsentBySnapshot(work) {
      await ensureWorkAssetColumns(pool)
      await pool.query(`
        INSERT INTO works (id, user_id, title, src, asset_id, asset_storage, asset_sync_status, asset_remote_key, asset_remote_url, asset_updated_at, meta, variation, batch_id, draw_index, task_status, error, retryable, retry_count, created_at, mode, provider_model, size, quality, snapshot_id, generation_snapshot_json, prompt_snippet, prompt_text, is_favorite, favorite, tags_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25::jsonb, $26, $27, $28, $29, $30::jsonb)
        ON CONFLICT (id) DO NOTHING
      `, workValues(work))
    },
    async listDrawBatchesByUserId(userId) {
      await ensureDrawBatchColumns(pool)
      const result = await pool.query(`
        SELECT id, user_id, title, created_at, strategy, concurrency, count, success_count, failed_count, cancelled_count, interrupted_count, timeout_count, snapshot_id
        FROM draw_batches
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [userId])
      return result.rows.map(mapDrawBatchRow)
    },
    async findDrawBatchByIdForUser(userId, id) {
      await ensureDrawBatchColumns(pool)
      const result = await pool.query(`
        SELECT id, user_id, title, created_at, strategy, concurrency, count, success_count, failed_count, cancelled_count, interrupted_count, timeout_count, snapshot_id
        FROM draw_batches
        WHERE user_id = $1 AND id = $2
        LIMIT 1
      `, [userId, id])
      return result.rows[0] ? mapDrawBatchRow(result.rows[0]) : null
    },
    async upsertDrawBatchForUser(batch) {
      await ensureDrawBatchColumns(pool)
      const result = await pool.query(`
        INSERT INTO draw_batches (id, user_id, title, created_at, strategy, concurrency, count, success_count, failed_count, cancelled_count, interrupted_count, timeout_count, snapshot_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id)
        DO UPDATE SET
          title = EXCLUDED.title,
          created_at = EXCLUDED.created_at,
          strategy = EXCLUDED.strategy,
          concurrency = EXCLUDED.concurrency,
          count = EXCLUDED.count,
          success_count = EXCLUDED.success_count,
          failed_count = EXCLUDED.failed_count,
          cancelled_count = EXCLUDED.cancelled_count,
          interrupted_count = EXCLUDED.interrupted_count,
          timeout_count = EXCLUDED.timeout_count,
          snapshot_id = EXCLUDED.snapshot_id
        RETURNING id, user_id, title, created_at, strategy, concurrency, count, success_count, failed_count, cancelled_count, interrupted_count, timeout_count, snapshot_id
      `, drawBatchValues(batch))
      return mapDrawBatchRow(result.rows[0])
    },
    async replaceDrawBatchesByUserId(userId, batches) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await ensureDrawBatchColumns(client as unknown as Pool)
        await client.query(`DELETE FROM draw_batches WHERE user_id = $1`, [userId])
        for (const batch of batches) {
          await client.query(`
            INSERT INTO draw_batches (id, user_id, title, created_at, strategy, concurrency, count, success_count, failed_count, cancelled_count, interrupted_count, timeout_count, snapshot_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, drawBatchValues(batch))
        }
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },
  }
}
