import type { Pool } from 'pg'
import type { StoredGenerationTask, StoredWork } from '../auth/types'
import { isTerminalTaskStatus } from '../generation-tasks/state'

export type GenerationTaskTablesRepository = {
  listGenerationTasks: () => Promise<StoredGenerationTask[]>
  listGenerationTasksByUserId: (userId: string) => Promise<StoredGenerationTask[]>
  findGenerationTaskById: (taskId: string) => Promise<StoredGenerationTask | null>
  findGenerationTaskByIdForUser: (taskId: string, userId: string) => Promise<StoredGenerationTask | null>
  insertGenerationTask: (task: StoredGenerationTask) => Promise<void>
  updateGenerationTask: (taskId: string, patch: Partial<StoredGenerationTask>) => Promise<StoredGenerationTask | null>
  listQueuedGenerationTasks: (limit: number, excludedIds?: string[]) => Promise<StoredGenerationTask[]>
  claimNextQueuedGenerationTask: (updatedAt: string, excludedIds?: string[]) => Promise<StoredGenerationTask | null>
  completeGenerationTaskAndInsertWork: (taskId: string, taskPatch: Partial<StoredGenerationTask>, work: StoredWork) => Promise<boolean>
}

async function ensureWorkAssetColumns(pool: Pool) {
  await pool.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_id TEXT`)
  await pool.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_storage TEXT`)
  await pool.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_sync_status TEXT`)
  await pool.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_remote_key TEXT`)
  await pool.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_remote_url TEXT`)
  await pool.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS asset_updated_at BIGINT`)
}

function normalizeWorkTags(tags: unknown) {
  const values = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
      ? tags.split(/[,，\n]/)
      : []
  return Array.from(new Set(values.map((tag) => typeof tag === 'string' ? tag.trim() : '').filter(Boolean)))
}

function mapGenerationTaskPayload(payload: unknown): StoredGenerationTask['payload'] {
  if (!payload || typeof payload !== 'object') {
    return payload as StoredGenerationTask['payload']
  }

  const record = payload as Record<string, unknown>
  if ('tracking' in record) {
    return record as StoredGenerationTask['payload']
  }

  return {
    ...record,
    tracking: undefined,
  } as StoredGenerationTask['payload']
}

function mapGenerationTaskRow(row: Record<string, unknown>): StoredGenerationTask {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    status: row.status as StoredGenerationTask['status'],
    progress: row.progress === null || row.progress === undefined ? undefined : Number(row.progress),
    errorMessage: row.error_message ? String(row.error_message) : undefined,
    payload: mapGenerationTaskPayload(row.payload_json),
    result: (row.result_json ?? undefined) as StoredGenerationTask['result'],
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString(),
  }
}

function mapWorkValues(work: StoredWork) {
  const tags = normalizeWorkTags(work.tags)
  return [
    work.id,
    work.userId,
    work.title,
    work.src ?? null,
    work.assetId ?? null,
    work.assetStorage ?? null,
    work.assetSyncStatus ?? null,
    work.assetRemoteKey ?? null,
    work.assetRemoteUrl ?? null,
    work.assetUpdatedAt ?? null,
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
    tags.length ? JSON.stringify(tags) : null,
  ]
}

export function createPostgresGenerationTaskTablesRepository(pool: Pool): GenerationTaskTablesRepository {
  return {
    async listGenerationTasks() {
      const result = await pool.query(`
        SELECT id, user_id, status, progress, error_message, payload_json, result_json, created_at, updated_at
        FROM generation_tasks
        ORDER BY created_at DESC
      `)
      return result.rows.map(mapGenerationTaskRow)
    },
    async listGenerationTasksByUserId(userId) {
      const result = await pool.query(`
        SELECT id, user_id, status, progress, error_message, payload_json, result_json, created_at, updated_at
        FROM generation_tasks
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [userId])
      return result.rows.map(mapGenerationTaskRow)
    },
    async findGenerationTaskById(taskId) {
      const result = await pool.query(`
        SELECT id, user_id, status, progress, error_message, payload_json, result_json, created_at, updated_at
        FROM generation_tasks
        WHERE id = $1
        LIMIT 1
      `, [taskId])
      return result.rows[0] ? mapGenerationTaskRow(result.rows[0]) : null
    },
    async findGenerationTaskByIdForUser(taskId, userId) {
      const result = await pool.query(`
        SELECT id, user_id, status, progress, error_message, payload_json, result_json, created_at, updated_at
        FROM generation_tasks
        WHERE id = $1 AND user_id = $2
        LIMIT 1
      `, [taskId, userId])
      return result.rows[0] ? mapGenerationTaskRow(result.rows[0]) : null
    },
    async insertGenerationTask(task) {
      await pool.query(`
        INSERT INTO generation_tasks (id, user_id, status, progress, error_message, payload_json, result_json, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)
      `, [task.id, task.userId, task.status, task.progress ?? null, task.errorMessage ?? null, JSON.stringify(task.payload), task.result ? JSON.stringify(task.result) : null, task.createdAt, task.updatedAt])
    },
    async updateGenerationTask(taskId, patch) {
      const currentResult = await pool.query(`
        SELECT id, user_id, status, progress, error_message, payload_json, result_json, created_at, updated_at
        FROM generation_tasks
        WHERE id = $1
        LIMIT 1
      `, [taskId])
      const currentRow = currentResult.rows[0]
      const current = currentRow ? mapGenerationTaskRow(currentRow) : null
      if (!current) return null
      const nextStatus = patch.status ?? current.status
      if (isTerminalTaskStatus(current.status) && nextStatus !== current.status) return current
      const next = {
        ...current,
        ...patch,
        payload: patch.payload ?? current.payload,
        result: patch.result ?? current.result,
      }
      const result = await pool.query(`
        UPDATE generation_tasks
        SET status = $2,
            progress = $3,
            error_message = $4,
            payload_json = $5::jsonb,
            result_json = $6::jsonb,
            updated_at = $7
        WHERE id = $1
        RETURNING id, user_id, status, progress, error_message, payload_json, result_json, created_at, updated_at
      `, [taskId, next.status, next.progress ?? null, next.errorMessage ?? null, JSON.stringify(next.payload), next.result ? JSON.stringify(next.result) : null, next.updatedAt])
      return result.rows[0] ? mapGenerationTaskRow(result.rows[0]) : null
    },
    async listQueuedGenerationTasks(limit, excludedIds = []) {
      const result = await pool.query(`
        SELECT id, user_id, status, progress, error_message, payload_json, result_json, created_at, updated_at
        FROM generation_tasks
        WHERE status = 'queued' AND NOT (id = ANY($2::text[]))
        ORDER BY created_at ASC
        LIMIT $1
      `, [limit, excludedIds])
      return result.rows.map(mapGenerationTaskRow)
    },
    async claimNextQueuedGenerationTask(updatedAt, excludedIds = []) {
      const result = await pool.query(`
        WITH next_task AS (
          SELECT id
          FROM generation_tasks
          WHERE status = 'queued' AND NOT (id = ANY($1::text[]))
          ORDER BY created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE generation_tasks
        SET status = 'running',
            progress = GREATEST(COALESCE(progress, 0), 15),
            error_message = NULL,
            updated_at = $2
        FROM next_task
        WHERE generation_tasks.id = next_task.id
        RETURNING generation_tasks.id, generation_tasks.user_id, generation_tasks.status, generation_tasks.progress, generation_tasks.error_message, generation_tasks.payload_json, generation_tasks.result_json, generation_tasks.created_at, generation_tasks.updated_at
      `, [excludedIds, updatedAt])
      return result.rows[0] ? mapGenerationTaskRow(result.rows[0]) : null
    },
    async completeGenerationTaskAndInsertWork(taskId, taskPatch, work) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await ensureWorkAssetColumns(client as unknown as Pool)
        const currentResult = await client.query(`
          SELECT id, user_id, status, progress, error_message, payload_json, result_json, created_at, updated_at
          FROM generation_tasks
          WHERE id = $1
          LIMIT 1
        `, [taskId])
        const currentRow = currentResult.rows[0]
        if (!currentRow) {
          await client.query('ROLLBACK')
          return false
        }
        const current = mapGenerationTaskRow(currentRow)
        if (current.status !== 'running') {
          await client.query('ROLLBACK')
          return false
        }
        const next = {
          ...current,
          ...taskPatch,
          payload: taskPatch.payload ?? current.payload,
          result: taskPatch.result ?? current.result,
        }
        const updateResult = await client.query(`
          UPDATE generation_tasks
          SET status = $2,
              progress = $3,
              error_message = $4,
              payload_json = $5::jsonb,
              result_json = $6::jsonb,
              updated_at = $7
          WHERE id = $1 AND status = 'running'
          RETURNING id
        `, [taskId, next.status, next.progress ?? null, next.errorMessage ?? null, JSON.stringify(next.payload), next.result ? JSON.stringify(next.result) : null, next.updatedAt])
        if (!updateResult.rows[0]) {
          await client.query('ROLLBACK')
          return false
        }
        await client.query(`
          INSERT INTO works (id, user_id, title, src, asset_id, asset_storage, asset_sync_status, asset_remote_key, asset_remote_url, asset_updated_at, meta, variation, batch_id, draw_index, task_status, error, retryable, retry_count, created_at, mode, provider_model, size, quality, snapshot_id, generation_snapshot_json, prompt_snippet, prompt_text, is_favorite, tags_json)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25::jsonb, $26, $27, $28, $29, $30::jsonb)
          ON CONFLICT (id) DO NOTHING
        `, mapWorkValues(work))
        await client.query('COMMIT')
        return true
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },
  }
}
