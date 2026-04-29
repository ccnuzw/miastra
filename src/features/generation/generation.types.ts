export type GenerationRequestOptions = {
  promptText: string
  title: string
  meta: string
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
}

export type GenerationSnapshot = {
  id: string
  createdAt: number
  mode: 'text2image' | 'image2image' | 'draw-text2image' | 'draw-image2image'
  prompt: string
  size: string
  quality: string
  model: string
  draw?: {
    count: number
    strategy: string
    concurrency: number
    delayMs: number
    retries: number
    timeoutSec: number
    safeMode: boolean
    variationStrength: string
    dimensions: string[]
  }
}

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error'
export type GenerationStage = 'idle' | 'queued' | 'connecting' | 'waiting' | 'receiving' | 'finalizing' | 'success' | 'error' | 'cancelled'
