import type { Pool } from 'pg'
import type { StoredDrawBatch, StoredPromptTemplate, StoredWork } from '../auth/types'

export type ContentTablesRepository = {
  listPromptTemplates: () => Promise<StoredPromptTemplate[]>
  listWorks: () => Promise<StoredWork[]>
  listDrawBatches: () => Promise<StoredDrawBatch[]>
  listPromptTemplatesByUserId: (userId: string) => Promise<StoredPromptTemplate[]>
  upsertPromptTemplateForUser: (template: StoredPromptTemplate) => Promise<StoredPromptTemplate>
  deletePromptTemplateForUser: (userId: string, id: string) => Promise<boolean>
  listWorksByUserId: (userId: string) => Promise<StoredWork[]>
  replaceWorksByUserId: (userId: string, works: StoredWork[]) => Promise<void>
  insertWorkIfAbsentBySnapshot: (work: StoredWork) => Promise<void>
  listDrawBatchesByUserId: (userId: string) => Promise<StoredDrawBatch[]>
  replaceDrawBatchesByUserId: (userId: string, batches: StoredDrawBatch[]) => Promise<void>
}

async function ensureDrawBatchColumns(pool: Pool) {
  await pool.query(`ALTER TABLE draw_batches ADD COLUMN IF NOT EXISTS cancelled_count INTEGER NOT NULL DEFAULT 0`)
  await pool.query(`ALTER TABLE draw_batches ADD COLUMN IF NOT EXISTS interrupted_count INTEGER NOT NULL DEFAULT 0`)
  await pool.query(`ALTER TABLE draw_batches ADD COLUMN IF NOT EXISTS timeout_count INTEGER NOT NULL DEFAULT 0`)
}

function mapPromptTemplateRow(row: Record<string, unknown>): StoredPromptTemplate {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: row.title ? String(row.title) : undefined,
    name: row.name ? String(row.name) : undefined,
    content: String(row.content ?? ''),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  }
}

function mapWorkRow(row: Record<string, unknown>): StoredWork {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title ?? ''),
    src: row.src ? String(row.src) : undefined,
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
    tags: Array.isArray(row.tags_json) ? row.tags_json.map(String) : undefined,
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
  return [
    template.id,
    template.userId,
    template.title ?? null,
    template.name ?? null,
    template.content,
    typeof template.createdAt === 'number' ? new Date(template.createdAt).toISOString() : template.createdAt,
    template.updatedAt ? (typeof template.updatedAt === 'number' ? new Date(template.updatedAt).toISOString() : template.updatedAt) : (typeof template.createdAt === 'number' ? new Date(template.createdAt).toISOString() : template.createdAt),
  ]
}

function workValues(work: StoredWork) {
  return [
    work.id,
    work.userId,
    work.title,
    work.src ?? null,
    work.meta,
    work.variation ?? null,
    work.batchId ?? null,
    work.drawIndex ?? null,
    work.taskStatus ?? null,
    work.error ?? null,
    work.retryable ?? null,
    work.retryCount ?? null,
    work.createdAt ?? null,
    work.mode ?? null,
    work.providerModel ?? null,
    work.size ?? null,
    work.quality ?? null,
    work.snapshotId ?? null,
    work.generationSnapshot ? JSON.stringify(work.generationSnapshot) : null,
    work.promptSnippet ?? null,
    work.promptText ?? null,
    work.isFavorite ?? null,
    work.favorite ?? null,
    work.tags ? JSON.stringify(work.tags) : null,
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
      const result = await pool.query(`
        SELECT id, user_id, title, name, content, created_at, updated_at
        FROM prompt_templates
        ORDER BY updated_at DESC
      `)
      return result.rows.map(mapPromptTemplateRow)
    },
    async listWorks() {
      const result = await pool.query(`
        SELECT id, user_id, title, src, meta, variation, batch_id, draw_index, task_status, error, retryable, retry_count, created_at, mode, provider_model, size, quality, snapshot_id, generation_snapshot_json, prompt_snippet, prompt_text, is_favorite, favorite, tags_json
        FROM works
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
      const result = await pool.query(`
        SELECT id, user_id, title, name, content, created_at, updated_at
        FROM prompt_templates
        WHERE user_id = $1
        ORDER BY updated_at DESC
      `, [userId])
      return result.rows.map(mapPromptTemplateRow)
    },
    async upsertPromptTemplateForUser(template) {
      const result = await pool.query(`
        INSERT INTO prompt_templates (id, user_id, title, name, content, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id)
        DO UPDATE SET title = EXCLUDED.title, name = EXCLUDED.name, content = EXCLUDED.content, updated_at = EXCLUDED.updated_at
        RETURNING id, user_id, title, name, content, created_at, updated_at
      `, promptTemplateValues(template))
      return mapPromptTemplateRow(result.rows[0])
    },
    async deletePromptTemplateForUser(userId, id) {
      const result = await pool.query(`DELETE FROM prompt_templates WHERE user_id = $1 AND id = $2`, [userId, id])
      return result.rowCount > 0
    },
    async listWorksByUserId(userId) {
      const result = await pool.query(`
        SELECT id, user_id, title, src, meta, variation, batch_id, draw_index, task_status, error, retryable, retry_count, created_at, mode, provider_model, size, quality, snapshot_id, generation_snapshot_json, prompt_snippet, prompt_text, is_favorite, favorite, tags_json
        FROM works
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [userId])
      return result.rows.map(mapWorkRow)
    },
    async replaceWorksByUserId(userId, works) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await client.query(`DELETE FROM works WHERE user_id = $1`, [userId])
        for (const work of works) {
          await client.query(`
            INSERT INTO works (id, user_id, title, src, meta, variation, batch_id, draw_index, task_status, error, retryable, retry_count, created_at, mode, provider_model, size, quality, snapshot_id, generation_snapshot_json, prompt_snippet, prompt_text, is_favorite, favorite, tags_json)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20, $21, $22, $23, $24::jsonb)
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
    async insertWorkIfAbsentBySnapshot(work) {
      await pool.query(`
        INSERT INTO works (id, user_id, title, src, meta, variation, batch_id, draw_index, task_status, error, retryable, retry_count, created_at, mode, provider_model, size, quality, snapshot_id, generation_snapshot_json, prompt_snippet, prompt_text, is_favorite, favorite, tags_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20, $21, $22, $23, $24::jsonb)
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
