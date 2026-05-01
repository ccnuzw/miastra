export type GenerationMode = 'text2image' | 'image2image' | 'draw-text2image' | 'draw-image2image'

export type GenerationReferenceSnapshot = {
  count: number
  sources: Array<{
    source: 'upload' | 'work'
    name: string
  }>
  note: string
}

export type GenerationDrawSnapshot = {
  count: number
  strategy: 'linear' | 'smart' | 'turbo'
  concurrency: number
  delayMs: number
  retries: number
  timeoutSec: number
  safeMode: boolean
  variationStrength: 'low' | 'medium' | 'high'
  dimensions: string[]
  batchId: string
  batchSnapshotId?: string
  drawIndex: number
  variation: string
}

export type GenerationErrorCode =
  | 'abort'
  | 'invalid-input'
  | 'network'
  | 'timeout'
  | 'gateway-timeout'
  | 'provider-unsupported'
  | 'invalid-response'
  | 'http-error'
  | 'unknown'

export type GenerationError = {
  code: GenerationErrorCode
  message: string
  retryable: boolean
  cause?: unknown
}

export type GenerationRequestOptions = {
  promptText: string
  workspacePrompt?: string
  title: string
  meta: string
  mode?: GenerationMode
  variation?: string
  batchId?: string
  drawIndex?: number
  taskId?: string
  timeoutSec?: number
  qualityValue?: string
  streamValue?: boolean
  previewMode?: 'live' | 'final' | 'none'
  abortController?: AbortController
  onReceiveImage?: (src: string) => void
  snapshotId?: string
  drawSnapshot?: GenerationDrawSnapshot
}

export type GenerationSnapshot = {
  id: string
  createdAt: number
  mode: GenerationMode
  prompt: string
  requestPrompt: string
  workspacePrompt: string
  size: string
  quality: string
  model: string
  providerId: string
  apiUrl: string
  requestUrl: string
  stream: boolean
  references?: GenerationReferenceSnapshot
  draw?: GenerationDrawSnapshot
}

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error'
export type GenerationStage = 'idle' | 'queued' | 'connecting' | 'waiting' | 'receiving' | 'finalizing' | 'success' | 'error' | 'cancelled'
