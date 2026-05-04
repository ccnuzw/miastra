import type { DrawTaskStatus } from '../draw-card/drawCard.types'
import type { GenerationErrorCode, GenerationMode, GenerationSnapshot } from '../generation/generation.types'

export type GalleryAssetStorage = 'inline' | 'blob' | 'remote'
export type GalleryAssetSyncStatus = 'local-only' | 'pending-sync' | 'synced'

export type GalleryAssetRecord = {
  id: string
  workId: string
  src: string
  storage: GalleryAssetStorage
  syncStatus: GalleryAssetSyncStatus
  remoteKey?: string
  remoteUrl?: string
  mimeType?: string
  createdAt: number
  updatedAt: number
}

export type GalleryImage = {
  id: string
  title: string
  src?: string
  assetId?: string
  assetStorage?: GalleryAssetStorage
  assetSyncStatus?: GalleryAssetSyncStatus
  assetRemoteKey?: string
  assetRemoteUrl?: string
  assetUpdatedAt?: number
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
  tags?: string[]
}
