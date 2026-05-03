import type { GalleryImage } from '../works/works.types'

export type VariationStrength = 'low' | 'medium' | 'high'
export type DrawStrategy = 'linear' | 'smart' | 'turbo'
export type DrawTaskStatus = 'pending' | 'running' | 'receiving' | 'success' | 'failed' | 'retrying' | 'cancelled' | 'timeout' | 'interrupted'

export type DrawStrategyOption = {
  label: string
  value: DrawStrategy
  hint: string
  concurrency: number
  delayMs: number
  timeoutSec: number
  retries: number
  safeMode: boolean
}

export type DrawTask = {
  id: string
  index: number
  title: string
  prompt: string
  meta: string
  variation: string
  batchId: string
  status: DrawTaskStatus
  image?: GalleryImage
  error?: string
  errorCode?: string
  retryable?: boolean
  retryCount: number
  startedAt?: number
  finishedAt?: number
  updatedAt?: number
  snapshotId?: string
  generationTaskId?: string
}

export type DrawBatch = {
  id: string
  title: string
  createdAt: number
  strategy: DrawStrategy
  concurrency: number
  count: number
  successCount: number
  failedCount: number
  cancelledCount: number
  interruptedCount: number
  timeoutCount: number
  snapshotId: string
}
