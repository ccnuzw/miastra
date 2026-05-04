import { apiRequest } from '@/shared/http/client'
import type { DrawBatch } from './drawCard.types'

export async function readStoredDrawBatches() {
  return apiRequest<DrawBatch[]>('/api/draw-batches')
}

export function writeStoredDrawBatches(batches: DrawBatch[]) {
  return apiRequest<{ success: true, count: number }>('/api/draw-batches/replace', {
    method: 'PUT',
    body: { batches },
  })
}
