import type { GalleryAssetSyncStatus } from './works.types'

export function getAssetSyncLabel(status?: GalleryAssetSyncStatus) {
  if (status === 'synced') return '已入库'
  if (status === 'pending-sync') return '待入库'
  if (status === 'local-only') return '仅本地'
  return ''
}
