import { randomUUID } from 'node:crypto'
import type { StoredGenerationTask, StoredWork } from '../auth/types'

function toTimestamp(value?: string) {
  if (!value) return Date.now()
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : Date.now()
}

function resolveAssetStorage(src: string): StoredWork['assetStorage'] {
  if (src.startsWith('data:image/')) return 'inline'
  if (src.startsWith('blob:')) return 'blob'
  return 'remote'
}

function resolveAssetSyncStatus(src: string): StoredWork['assetSyncStatus'] {
  if (/^https?:\/\//i.test(src)) return 'synced'
  if (src.startsWith('blob:') || src.startsWith('data:image/')) return 'local-only'
  return 'pending-sync'
}

function resolvePromptText(task: StoredGenerationTask) {
  return task.result?.promptText || task.payload.requestPrompt || task.payload.promptText
}

export function recoverWorkFromTask(task: StoredGenerationTask): StoredWork | null {
  if (task.status !== 'succeeded') return null

  const imageUrl = task.result?.imageUrl?.trim()
  if (!imageUrl) return null

  const promptText = resolvePromptText(task).trim()
  const snapshotId = task.result?.snapshotId?.trim() || task.payload.snapshotId?.trim() || randomUUID()
  const workId = task.result?.workId?.trim() || snapshotId
  const title = task.result?.title?.trim() || task.payload.title.trim()
  const meta = task.result?.meta?.trim() || task.payload.meta.trim()
  const mode = task.result?.mode || task.payload.mode
  const size = task.result?.size?.trim() || task.payload.size.trim()
  const quality = task.result?.quality?.trim() || task.payload.quality.trim()
  const providerModel = task.result?.providerModel?.trim() || task.payload.model.trim()
  const variation = task.result?.variation?.trim() || task.payload.draw?.variation?.trim()
  const batchId = task.result?.batchId?.trim() || task.payload.draw?.batchId?.trim()
  const drawIndex = task.result?.drawIndex ?? task.payload.draw?.drawIndex
  const assetRemoteUrl = /^https?:\/\//i.test(imageUrl) ? imageUrl : undefined
  const createdAt = typeof task.result?.generationSnapshot === 'object'
    && task.result.generationSnapshot
    && 'createdAt' in task.result.generationSnapshot
    && typeof (task.result.generationSnapshot as { createdAt?: unknown }).createdAt === 'number'
    ? (task.result.generationSnapshot as { createdAt: number }).createdAt
    : toTimestamp(task.updatedAt)

  return {
    id: workId,
    userId: task.userId,
    title,
    src: imageUrl,
    meta,
    variation: variation || undefined,
    batchId: batchId || undefined,
    drawIndex,
    taskStatus: 'success',
    error: undefined,
    retryable: false,
    retryCount: task.payload.tracking?.retryAttempt ?? 0,
    createdAt,
    mode,
    providerModel,
    size,
    quality,
    snapshotId,
    generationSnapshot: task.result?.generationSnapshot,
    promptSnippet: task.result?.promptSnippet?.trim() || promptText.slice(0, 180),
    promptText,
    isFavorite: false,
    tags: [],
    assetStorage: resolveAssetStorage(imageUrl),
    assetSyncStatus: resolveAssetSyncStatus(imageUrl),
    assetRemoteUrl,
  }
}
