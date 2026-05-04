import { apiRequest } from '@/shared/http/client'
import type { GalleryAssetRecord, GalleryAssetStorage, GalleryAssetSyncStatus, GalleryImage } from './works.types'

type WorksMutationResult = {
  success: true
  count: number
}

type WorksBatchTagResult = {
  success: true
  works: GalleryImage[]
}

const validAssetStorages: GalleryAssetStorage[] = ['inline', 'blob', 'remote']
const validAssetSyncStatuses: GalleryAssetSyncStatus[] = ['local-only', 'pending-sync', 'synced']

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  return Array.from(new Set(tags.map((tag) => typeof tag === 'string' ? tag.trim() : '').filter(Boolean)))
}

function normalizeOptionalString(value: unknown) {
  return typeof value === 'string' ? value.trim() || undefined : undefined
}

function normalizeOptionalTimestamp(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function createPrimaryAssetId(workId: string) {
  return `work:${workId}:primary`
}

function detectAssetStorage(src?: string, remoteUrl?: string): GalleryAssetStorage | undefined {
  if (src?.startsWith('data:image/')) return 'inline'
  if (src?.startsWith('blob:')) return 'blob'
  if (src || remoteUrl) return 'remote'
  return undefined
}

function normalizeAssetStorage(value: unknown) {
  return typeof value === 'string' && validAssetStorages.includes(value as GalleryAssetStorage)
    ? value as GalleryAssetStorage
    : undefined
}

function normalizeAssetSyncStatus(
  value: unknown,
  context: { src?: string; remoteKey?: string; remoteUrl?: string },
) {
  if (typeof value === 'string' && validAssetSyncStatuses.includes(value as GalleryAssetSyncStatus)) {
    return value as GalleryAssetSyncStatus
  }
  if (context.remoteKey || context.remoteUrl) return 'synced'
  if (context.src?.startsWith('http://') || context.src?.startsWith('https://')) {
    return 'pending-sync'
  }
  if (context.src) return 'local-only'
  return undefined
}

function detectMimeType(src?: string) {
  if (!src?.startsWith('data:')) return undefined
  const match = src.match(/^data:([^;,]+)[;,]/)
  return match?.[1]
}

function hasAssetReference(image: GalleryImage, src?: string) {
  return Boolean(
    src
    || image.assetId
    || image.assetStorage
    || image.assetSyncStatus
    || image.assetRemoteKey
    || image.assetRemoteUrl
    || image.assetUpdatedAt,
  )
}

function resolveAssetId(image: GalleryImage, src?: string) {
  const assetId = normalizeOptionalString(image.assetId)
  if (assetId) return assetId
  return hasAssetReference(image, src) ? createPrimaryAssetId(image.id) : undefined
}

function normalizeGalleryAssetRecord(asset: GalleryAssetRecord | null | undefined) {
  if (!asset) return null
  const id = normalizeOptionalString(asset.id)
  const workId = normalizeOptionalString(asset.workId)
  const src = normalizeOptionalString(asset.src)
  if (!id || !workId || !src) return null

  const remoteKey = normalizeOptionalString(asset.remoteKey)
  const remoteUrl = normalizeOptionalString(asset.remoteUrl)
  const storage = normalizeAssetStorage(asset.storage) ?? detectAssetStorage(src, remoteUrl) ?? 'remote'
  const syncStatus = normalizeAssetSyncStatus(asset.syncStatus, { src, remoteKey, remoteUrl }) ?? 'local-only'
  const createdAt = normalizeOptionalTimestamp(asset.createdAt) ?? Date.now()
  const updatedAt = normalizeOptionalTimestamp(asset.updatedAt) ?? createdAt

  return {
    id,
    workId,
    src,
    storage,
    syncStatus,
    remoteKey,
    remoteUrl,
    mimeType: normalizeOptionalString(asset.mimeType) ?? detectMimeType(src),
    createdAt,
    updatedAt,
  } satisfies GalleryAssetRecord
}

function normalizeGalleryAssetRecordMap(assetMap: Record<string, GalleryAssetRecord> | undefined) {
  if (!assetMap) return {}
  return Object.values(assetMap).reduce<Record<string, GalleryAssetRecord>>((records, asset) => {
    const normalized = normalizeGalleryAssetRecord(asset)
    if (normalized) records[normalized.id] = normalized
    return records
  }, {})
}

function buildAssetRecord(work: GalleryImage, currentAsset?: GalleryAssetRecord | null) {
  const assetId = work.assetId
  if (!assetId) return null

  const src = work.src ?? work.assetRemoteUrl ?? currentAsset?.src
  if (!src) return null

  const remoteKey = normalizeOptionalString(work.assetRemoteKey) ?? currentAsset?.remoteKey
  const remoteUrl = normalizeOptionalString(work.assetRemoteUrl) ?? currentAsset?.remoteUrl
  const storage = work.assetStorage ?? currentAsset?.storage ?? detectAssetStorage(src, remoteUrl) ?? 'remote'
  const syncStatus = work.assetSyncStatus
    ?? currentAsset?.syncStatus
    ?? normalizeAssetSyncStatus(undefined, { src, remoteKey, remoteUrl })
    ?? 'local-only'
  const createdAt = currentAsset?.createdAt ?? work.createdAt ?? work.assetUpdatedAt ?? Date.now()
  const updatedAt = work.assetUpdatedAt ?? currentAsset?.updatedAt ?? work.createdAt ?? createdAt

  return normalizeGalleryAssetRecord({
    id: assetId,
    workId: work.id,
    src,
    storage,
    syncStatus,
    remoteKey,
    remoteUrl,
    mimeType: detectMimeType(src),
    createdAt,
    updatedAt,
  })
}

function _buildGalleryAssetRecordMap(gallery: GalleryImage[], currentAssets: Record<string, GalleryAssetRecord>) {
  return normalizeGallery(gallery).reduce<Record<string, GalleryAssetRecord>>((assets, work) => {
    const assetId = work.assetId
    const currentAsset = assetId ? (assets[assetId] ?? currentAssets[assetId]) : null
    const assetRecord = buildAssetRecord(work, currentAsset)
    if (assetRecord) assets[assetRecord.id] = assetRecord
    return assets
  }, {})
}

export function normalizeGalleryImage(image: GalleryImage): GalleryImage {
  const {
    src,
    tags,
    assetId,
    assetStorage,
    assetSyncStatus,
    assetRemoteKey,
    assetRemoteUrl,
    assetUpdatedAt,
    ...rest
  } = image

  const normalizedSrc = normalizeOptionalString(src)
  const normalizedRemoteKey = normalizeOptionalString(assetRemoteKey)
  const normalizedRemoteUrl = normalizeOptionalString(assetRemoteUrl)
  const resolvedAssetId = normalizeOptionalString(assetId) ?? resolveAssetId(image, normalizedSrc)
  const resolvedAssetStorage = resolvedAssetId
    ? normalizeAssetStorage(assetStorage) ?? detectAssetStorage(normalizedSrc, normalizedRemoteUrl)
    : undefined
  const resolvedAssetSyncStatus = resolvedAssetId
    ? normalizeAssetSyncStatus(assetSyncStatus, {
      src: normalizedSrc,
      remoteKey: normalizedRemoteKey,
      remoteUrl: normalizedRemoteUrl,
    })
    : undefined

  return {
    ...rest,
    src: normalizedSrc,
    assetId: resolvedAssetId,
    assetStorage: resolvedAssetStorage,
    assetSyncStatus: resolvedAssetSyncStatus,
    assetRemoteKey: normalizedRemoteKey,
    assetRemoteUrl: normalizedRemoteUrl,
    assetUpdatedAt: resolvedAssetId ? normalizeOptionalTimestamp(assetUpdatedAt) : undefined,
    isFavorite: Boolean(image.isFavorite),
    tags: normalizeTags(tags),
  }
}

export function normalizeGallery(gallery: GalleryImage[]): GalleryImage[] {
  if (!Array.isArray(gallery)) return []
  return gallery.map(normalizeGalleryImage)
}

export function hydrateGallerySources(
  gallery: GalleryImage[],
  assetRecords: Record<string, GalleryAssetRecord> = {},
) {
  const normalizedGallery = normalizeGallery(gallery)
  const normalizedAssets = normalizeGalleryAssetRecordMap(assetRecords)

  return normalizedGallery.map((work) => {
    const assetId = normalizeOptionalString(work.assetId)
    const primaryAsset = normalizedAssets[createPrimaryAssetId(work.id)] ?? null
    const currentAsset = assetId ? (normalizedAssets[assetId] ?? primaryAsset) : primaryAsset
    const assetRecord = buildAssetRecord(work, currentAsset)
    const src = work.src ?? currentAsset?.src
    const resolvedAssetId = assetId ?? assetRecord?.id ?? currentAsset?.id

    return normalizeGalleryImage({
      ...work,
      src,
      assetId: resolvedAssetId,
      assetStorage: work.assetStorage ?? assetRecord?.storage ?? currentAsset?.storage,
      assetSyncStatus: work.assetSyncStatus ?? assetRecord?.syncStatus ?? currentAsset?.syncStatus,
      assetRemoteKey: work.assetRemoteKey ?? assetRecord?.remoteKey ?? currentAsset?.remoteKey,
      assetRemoteUrl: work.assetRemoteUrl ?? assetRecord?.remoteUrl ?? currentAsset?.remoteUrl,
      assetUpdatedAt: work.assetUpdatedAt ?? assetRecord?.updatedAt ?? currentAsset?.updatedAt,
    })
  })
}

export function prepareGalleryForPersistence(gallery: GalleryImage[], maxInlineBytes = 1_000_000) {
  return normalizeGallery(gallery).map((work) => {
    if (!work.src?.startsWith('data:')) return work
    return work.src.length > maxInlineBytes ? { ...work, src: undefined } : work
  })
}

export async function readStoredGallery() {
  const gallery = await apiRequest<GalleryImage[]>('/api/works')
  return normalizeGallery(gallery)
}

export async function writeStoredGallery(gallery: GalleryImage[]) {
  const normalizedGallery = normalizeGallery(gallery)
  const currentGallery = await readStoredGallery()
  const currentById = new Map(currentGallery.map((work) => [work.id, work]))
  const nextById = new Map(normalizedGallery.map((work) => [work.id, work]))

  for (const work of normalizedGallery) {
    const current = currentById.get(work.id)
    if (!current || JSON.stringify(current) !== JSON.stringify(work)) {
      await upsertStoredWork(work)
    }
  }

  const removedIds = currentGallery.filter((work) => !nextById.has(work.id)).map((work) => work.id)
  if (removedIds.length) {
    await deleteStoredWorks(removedIds)
  }

  return { success: true, count: normalizedGallery.length }
}

export async function upsertStoredWork(work: GalleryImage) {
  const normalizedWork = normalizeGalleryImage(work)
  return normalizeGalleryImage(await apiRequest<GalleryImage>(`/api/works/${normalizedWork.id}`, {
    method: 'PUT',
    body: normalizedWork,
  }))
}

export async function deleteStoredWork(id: string) {
  const result = await apiRequest<WorksMutationResult>(`/api/works/${id}`, {
    method: 'DELETE',
  })
  return result
}

export async function deleteStoredWorks(ids: string[]) {
  const result = await apiRequest<WorksMutationResult>('/api/works/delete', {
    method: 'POST',
    body: { ids },
  })
  return result
}

export async function updateStoredWorkFavorite(id: string, isFavorite: boolean) {
  return normalizeGalleryImage(await apiRequest<GalleryImage>(`/api/works/${id}/favorite`, {
    method: 'PUT',
    body: { isFavorite },
  }))
}

export async function replaceStoredWorkTags(id: string, tags: string[]) {
  return normalizeGalleryImage(await apiRequest<GalleryImage>(`/api/works/${id}/tags`, {
    method: 'PUT',
    body: { tags: normalizeTags(tags) },
  }))
}

export async function addTagToStoredWorks(ids: string[], tag: string) {
  const result = await apiRequest<WorksBatchTagResult>('/api/works/tags/add', {
    method: 'POST',
    body: { ids, tag: tag.trim() },
  })
  return {
    ...result,
    works: normalizeGallery(result.works),
  }
}

export async function removeTagFromStoredWorks(ids: string[], tag: string) {
  const result = await apiRequest<WorksBatchTagResult>('/api/works/tags/remove', {
    method: 'POST',
    body: { ids, tag: tag.trim() },
  })
  return {
    ...result,
    works: normalizeGallery(result.works),
  }
}
