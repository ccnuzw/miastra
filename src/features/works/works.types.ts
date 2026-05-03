import type { DrawTaskStatus } from '../draw-card/drawCard.types'
import type { GenerationErrorCode, GenerationMode, GenerationSnapshot } from '../generation/generation.types'

export type GalleryImage = {
  id: string
  title: string
  src?: string
  meta: string
  variation?: string
  batchId?: string
  drawIndex?: number
  taskStatus?: DrawTaskStatus
  error?: string
  errorCode?: GenerationErrorCode | string
  retryable?: boolean
  retryCount?: number
  createdAt?: number
  mode?: GenerationMode
  providerModel?: string
  size?: string
  quality?: string
  snapshotId?: string
  generationTaskId?: string
  generationSnapshot?: GenerationSnapshot
  promptSnippet?: string
  promptText?: string
  isFavorite?: boolean
  /** Legacy persisted key; normalized into isFavorite when gallery is hydrated. */
  favorite?: boolean
  tags?: string[]
}
