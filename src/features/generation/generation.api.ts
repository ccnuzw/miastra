import { apiRequest } from '@/shared/http/client'
import type { DrawStrategy, VariationStrength } from '@/features/draw-card/drawCard.types'
import type { GenerationMode } from './generation.types'
import { editEndpoint, generationEndpoint } from './generation.constants'
import { extractGenerationError, extractImageSrc, readGenerationResponse, responseDebugHeaders } from './generation.parser'

export type GenerationTaskStatus = 'pending' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'timeout'

export type GenerationTaskRecord = {
  id: string
  userId: string
  status: GenerationTaskStatus
  batchId?: string
  drawIndex?: number
  variation?: string
  retryAttempt: number
  rootTaskId: string
  parentTaskId?: string
  retryable: boolean
  progress?: number
  createdAt: string
  updatedAt: string
  errorMessage?: string
  payload: {
    mode: GenerationMode
    title: string
    meta: string
    promptText: string
    workspacePrompt: string
    requestPrompt: string
    snapshotId?: string
    size: string
    quality: string
    model: string
    providerId: string
    stream: boolean
    referenceImages?: Array<{
      source: 'upload' | 'work'
      name: string
      src: string
      assetId?: string
      assetRemoteKey?: string
    }>
    draw?: {
      count: number
      strategy: DrawStrategy
      concurrency: number
      delayMs: number
      retries: number
      timeoutSec: number
      safeMode: boolean
      variationStrength: VariationStrength
      dimensions: string[]
      batchId: string
      batchSnapshotId?: string
      drawIndex: number
      variation: string
    }
  }
  result?: {
    workId?: string
    imageUrl?: string
    meta?: string
    title?: string
    promptText?: string
    promptSnippet?: string
    size?: string
    quality?: string
    providerModel?: string
    snapshotId?: string
    mode?: GenerationMode
    batchId?: string
    drawIndex?: number
    variation?: string
    generationSnapshot?: unknown
  }
}

export type GenerationBatchRecord = {
  id: string
  title: string
  createdAt: number
  strategy: 'linear' | 'smart' | 'turbo'
  concurrency: number
  count: number
  successCount: number
  failedCount: number
  cancelledCount: number
  interruptedCount: number
  timeoutCount: number
  snapshotId: string
}

export type GenerationBatchRerunResult = {
  batch: GenerationBatchRecord
  sourceBatchId: string
  queuedTaskIds: string[]
  slotCount: number
}

export type CreateGenerationTaskInput = GenerationTaskRecord['payload']

export type UpdateGenerationTaskInput = {
  status: GenerationTaskStatus
  progress?: number
  result?: GenerationTaskRecord['result']
  errorMessage?: string
}

type GenerationRequestBody = {
  model: string
  prompt: string
  size?: string
  quality?: string
  n?: number
  stream?: boolean
}

type GenerationFormResult = {
  response: Response
  debugHeaders: string
  text: string
  latestImageSrc: string
}

export async function postJsonImageGeneration(params: {
  requestUrl: string
  apiKey: string
  signal: AbortSignal
  body: GenerationRequestBody
  onImage?: (src: string) => void
  chargeQuota?: boolean
}): Promise<GenerationFormResult> {
  const response = await fetch(params.requestUrl || generationEndpoint, {
    method: 'POST',
    signal: params.signal,
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
      'x-miastra-charge-quota': params.chargeQuota === false ? '0' : '1',
    },
    body: JSON.stringify(params.body),
  })

  const text = await readGenerationResponse(response, (src) => params.onImage?.(src))
  return {
    response,
    debugHeaders: responseDebugHeaders(response),
    text,
    latestImageSrc: extractImageSrc(text),
  }
}

export async function postFormImageGeneration(params: {
  requestUrl: string
  apiKey: string
  signal: AbortSignal
  formData: FormData
  onImage?: (src: string) => void
  chargeQuota?: boolean
}): Promise<GenerationFormResult> {
  const response = await fetch(params.requestUrl || editEndpoint, {
    method: 'POST',
    signal: params.signal,
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'x-miastra-charge-quota': params.chargeQuota === false ? '0' : '1',
    },
    body: params.formData,
  })

  const text = await readGenerationResponse(response, (src) => params.onImage?.(src))
  return {
    response,
    debugHeaders: responseDebugHeaders(response),
    text,
    latestImageSrc: extractImageSrc(text),
  }
}

export { extractGenerationError, extractImageSrc, readGenerationResponse, responseDebugHeaders }

export async function listGenerationTasks() {
  return apiRequest<GenerationTaskRecord[]>('/api/generation-tasks')
}

export async function listDrawBatches() {
  return apiRequest<GenerationBatchRecord[]>('/api/draw-batches')
}

export async function createGenerationTask(payload: CreateGenerationTaskInput) {
  return apiRequest<{ id: string; status: 'pending' }>('/api/generation-tasks', {
    method: 'POST',
    body: payload,
  })
}

export async function updateGenerationTask(id: string, payload: UpdateGenerationTaskInput) {
  return apiRequest<GenerationTaskRecord>(`/api/generation-tasks/${id}`, {
    method: 'POST',
    body: payload,
  })
}

export async function cancelGenerationTask(id: string) {
  return apiRequest<GenerationTaskRecord>(`/api/generation-tasks/${id}/cancel`, { method: 'POST' })
}

export async function retryGenerationTask(id: string) {
  return apiRequest<GenerationTaskRecord>(`/api/generation-tasks/${id}/retry`, { method: 'POST' })
}

export async function rerunDrawBatch(id: string) {
  return apiRequest<GenerationBatchRerunResult>(`/api/draw-batches/${id}/rerun`, { method: 'POST' })
}
