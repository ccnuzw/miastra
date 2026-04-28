import { readBrowserValue, writeBrowserValue } from '@/shared/storage/browserDatabase'
import type { DrawBatch } from './drawCard.types'

const drawBatchesStorageKey = 'new-pic:draw-batches:v1'

export function readStoredDrawBatches() {
  return readBrowserValue<DrawBatch[]>(drawBatchesStorageKey, [])
}

export function writeStoredDrawBatches(batches: DrawBatch[]) {
  return writeBrowserValue(drawBatchesStorageKey, batches)
}
