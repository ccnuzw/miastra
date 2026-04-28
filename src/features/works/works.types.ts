import type { DrawTaskStatus } from '../draw-card/drawCard.types'

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
  retryCount?: number
  createdAt?: number
  mode?: 'text2image' | 'image2image'
  providerModel?: string
  size?: string
  quality?: string
  snapshotId?: string
  promptSnippet?: string
  promptText?: string
}

