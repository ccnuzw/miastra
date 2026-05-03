import type { GenerationErrorCode, GenerationMode, GenerationSnapshot } from './generation.types'

export type LocalGenerationTaskStatus = 'queued' | 'running' | 'receiving' | 'retrying' | 'succeeded' | 'failed' | 'cancelled' | 'timeout' | 'interrupted'

export type LocalGenerationTaskRecord = {
  id: string
  parentTaskId?: string
  batchId?: string
  drawIndex?: number
  mode: GenerationMode
  title: string
  meta: string
  promptText: string
  workspacePrompt: string
  requestPrompt: string
  snapshotId?: string
  generationTaskId?: string
  status: LocalGenerationTaskStatus
  createdAt: number
  updatedAt: number
  startedAt?: number
  finishedAt?: number
  retryCount: number
  retryable?: boolean
  errorCode?: GenerationErrorCode | string
  errorMessage?: string
  progress?: number
  result?: {
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
    generationSnapshot?: GenerationSnapshot
  }
}
