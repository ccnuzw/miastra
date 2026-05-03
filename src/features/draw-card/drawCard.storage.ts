import { apiRequest } from '@/shared/http/client'
import { deleteBrowserValue, readBrowserValue, writeBrowserValue } from '@/shared/storage/browserDatabase'
import type { DrawBatch, DrawTask } from './drawCard.types'

export const drawBatchesStorageKey = 'new-pic:draw-batches:v1'
const drawTasksStorageKey = 'new-pic:draw-tasks:v1'

type ImportLocalDrawBatchesResult = {
  imported: number
  total: number
}

let importLegacyDrawBatchesInFlight: Promise<ImportLocalDrawBatchesResult> | null = null

export async function importLegacyDrawBatches() {
  if (!importLegacyDrawBatchesInFlight) {
    importLegacyDrawBatchesInFlight = (async () => {
      const legacyBatches = await readBrowserValue<DrawBatch[]>(drawBatchesStorageKey, [])
      if (!legacyBatches.length) return { imported: 0, total: 0 }

      const result = await apiRequest<ImportLocalDrawBatchesResult>('/api/migrations/import-local-draw-batches', {
        method: 'POST',
        body: { batches: legacyBatches },
      })

      await deleteBrowserValue(drawBatchesStorageKey)
      return result
    })().finally(() => {
      importLegacyDrawBatchesInFlight = null
    })
  }

  return importLegacyDrawBatchesInFlight
}

export async function readStoredDrawBatches() {
  await importLegacyDrawBatches()
  return apiRequest<DrawBatch[]>('/api/draw-batches')
}

export function writeStoredDrawBatches(batches: DrawBatch[]) {
  return apiRequest<{ success: true, count: number }>('/api/draw-batches/replace', {
    method: 'PUT',
    body: { batches },
  })
}

export function readStoredDrawTasks() {
  return readBrowserValue<DrawTask[]>(drawTasksStorageKey, [])
}

export function writeStoredDrawTasks(tasks: DrawTask[]) {
  return writeBrowserValue(drawTasksStorageKey, tasks)
}
