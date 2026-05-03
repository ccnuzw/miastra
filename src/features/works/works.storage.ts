import { apiRequest } from '@/shared/http/client'
import { deleteBrowserValue, readBrowserValue, writeBrowserValue } from '@/shared/storage/browserDatabase'
import type { GalleryAssetRecord, GalleryAssetStorage, GalleryAssetSyncStatus, GalleryImage } from './works.types'

export const worksGalleryStorageKey = 'new-pic:works-gallery:v1'
export const worksGalleryAssetStorageKey = 'new-pic:works-gallery:assets:v1'
export const worksGalleryAssetRecordStorageKey = 'new-pic:works-gallery:asset-records:v2'

type ImportLocalWorksResult = {
  imported: number
  total: number
}

type WorksMutationResult = {
  success: true
  count: number
}

type WorksBatchTagResult = {
  success: true
  works: GalleryImage[]
}

const importLocalWorksBatchLimit = 700_000
const worksReplaceBodyLimit = 14_000_000
let importLegacyWorksInFlight: Promise<ImportLocalWorksResult> | null = null

type GalleryAssetMap = Record<string, string>
type GalleryAssetRecordMap = Record<string, GalleryAssetRecord>

const validAssetStorages: GalleryAssetStorage[] = ['inline', 'blob', 'remote']
const validAssetSyncStatuses: GalleryAssetSyncStatus[] = ['local-only', 'pending-sync', 'synced']

function normalizeTags(tags: unknown): string[] {
  const values = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
      ? tags.split(/[,，\n]/)
      : []

  return Array.from(new Set(values
    .map((tag) => typeof tag === 'string' ? tag.trim() : '')
    .filter(Boolean)))
}

function normalizeOptionalString(value: unknown) {
  return typeof value === 'string' ? value.trim() || undefined : undefined
}

function normalizeOptionalTimestamp(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function createPrimaryAssetId(workId: string) {
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

function normalizeStoredAssetRecordMap(assetMap: GalleryAssetRecordMap) {
  return Object.values(assetMap).reduce<GalleryAssetRecordMap>((records, asset) => {
    const normalized = normalizeGalleryAssetRecord(asset)
    if (normalized) records[normalized.id] = normalized
    return records
  }, {})
}

function coerceAssetRecordMap(assetMap: GalleryAssetRecordMap | GalleryAssetMap) {
  const entries = Object.entries(assetMap)
  if (!entries.length) return {} satisfies GalleryAssetRecordMap

  const firstValue = entries[0]?.[1]
  if (typeof firstValue !== 'string') {
    return normalizeStoredAssetRecordMap(assetMap as GalleryAssetRecordMap)
  }

  const now = Date.now()
  return entries.reduce<GalleryAssetRecordMap>((records, [workId, rawSrc]) => {
    const src = normalizeOptionalString(rawSrc)
    if (!src) return records
    const assetId = createPrimaryAssetId(workId)
    records[assetId] = {
      id: assetId,
      workId,
      src,
      storage: detectAssetStorage(src) ?? 'remote',
      syncStatus: normalizeAssetSyncStatus(undefined, { src }) ?? 'local-only',
      mimeType: detectMimeType(src),
      createdAt: now,
      updatedAt: now,
    }
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

function buildGalleryAssetRecordMap(gallery: GalleryImage[], currentAssets: GalleryAssetRecordMap) {
  return normalizeGallery(gallery).reduce<GalleryAssetRecordMap>((assets, work) => {
    const assetId = work.assetId
    const currentAsset = assetId ? (assets[assetId] ?? currentAssets[assetId]) : null
    const assetRecord = buildAssetRecord(work, currentAsset)
    if (assetRecord) assets[assetRecord.id] = assetRecord
    return assets
  }, {})
}

async function readStoredGalleryAssetRecordMap() {
  const [assetRecords, legacyAssetMap] = await Promise.all([
    readBrowserValue<GalleryAssetRecordMap>(worksGalleryAssetRecordStorageKey, {}),
    readBrowserValue<GalleryAssetMap>(worksGalleryAssetStorageKey, {}),
  ])

  const normalizedAssets = normalizeStoredAssetRecordMap(assetRecords)
  const migratedAssets = { ...normalizedAssets }
  let migrated = Object.keys(normalizedAssets).length !== Object.keys(assetRecords).length

  for (const [workId, rawSrc] of Object.entries(legacyAssetMap)) {
    const src = normalizeOptionalString(rawSrc)
    if (!src) continue
    const assetId = createPrimaryAssetId(workId)
    if (migratedAssets[assetId]) continue
    migratedAssets[assetId] = {
      id: assetId,
      workId,
      src,
      storage: detectAssetStorage(src) ?? 'remote',
      syncStatus: normalizeAssetSyncStatus(undefined, { src }) ?? 'local-only',
      mimeType: detectMimeType(src),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    migrated = true
  }

  if (migrated) {
    await writeBrowserValue(worksGalleryAssetRecordStorageKey, migratedAssets)
  }
  if (Object.keys(legacyAssetMap).length) {
    await deleteBrowserValue(worksGalleryAssetStorageKey)
  }

  return migratedAssets
}

async function writeStoredGalleryAssetRecords(gallery: GalleryImage[], options: { prune: boolean }) {
  const normalizedGallery = normalizeGallery(gallery)
  const currentAssets = await readStoredGalleryAssetRecordMap()
  const nextAssets = buildGalleryAssetRecordMap(normalizedGallery, currentAssets)

  if (!options.prune) {
    await writeBrowserValue(worksGalleryAssetRecordStorageKey, {
      ...currentAssets,
      ...nextAssets,
    })
    return
  }

  const referencedAssetIds = new Set(normalizedGallery.map((work) => work.assetId).filter(Boolean))
  const referencedWorkIds = new Set(normalizedGallery.map((work) => work.id))
  const mergedAssets = {
    ...currentAssets,
    ...nextAssets,
  }

  const prunedAssets = Object.values(mergedAssets).reduce<GalleryAssetRecordMap>((assets, asset) => {
    if (!referencedAssetIds.has(asset.id) && !referencedWorkIds.has(asset.workId)) return assets
    assets[asset.id] = asset
    return assets
  }, {})

  await writeBrowserValue(worksGalleryAssetRecordStorageKey, prunedAssets)
}

async function removeStoredGalleryAssets(ids: string[]) {
  if (!ids.length) return
  const targetIds = new Set(ids)
  const currentAssets = await readStoredGalleryAssetRecordMap()
  const nextAssets = Object.values(currentAssets).reduce<GalleryAssetRecordMap>((assets, asset) => {
    if (targetIds.has(asset.workId)) return assets
    assets[asset.id] = asset
    return assets
  }, {})
  await writeBrowserValue(worksGalleryAssetRecordStorageKey, nextAssets)
}

function buildAssetRecordIndexes(assetMap: GalleryAssetRecordMap) {
  const byWorkId: Record<string, GalleryAssetRecord> = {}
  for (const asset of Object.values(assetMap)) {
    if (!(asset.workId in byWorkId)) byWorkId[asset.workId] = asset
  }
  return { byWorkId }
}

export function normalizeGalleryImage(image: GalleryImage): GalleryImage {
  const {
    favorite,
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
    isFavorite: Boolean(image.isFavorite ?? favorite),
    tags: normalizeTags(tags),
  }
}

export function normalizeGallery(gallery: GalleryImage[]): GalleryImage[] {
  if (!Array.isArray(gallery)) return []
  return gallery.map(normalizeGalleryImage)
}

function getBodySize(works: GalleryImage[]) {
  return new TextEncoder().encode(JSON.stringify({ works })).length
}

export function hydrateGallerySources(gallery: GalleryImage[], assetMap: GalleryAssetRecordMap | GalleryAssetMap) {
  const normalizedAssetMap = coerceAssetRecordMap(assetMap)
  const { byWorkId } = buildAssetRecordIndexes(normalizedAssetMap)
  return gallery.map((rawWork) => {
    const fallbackAsset = (rawWork.assetId && normalizedAssetMap[rawWork.assetId]) || byWorkId[rawWork.id]
    const fallbackSrc = rawWork.src?.trim() || fallbackAsset?.src?.trim() || rawWork.assetRemoteUrl?.trim()
    return normalizeGalleryImage({
      ...rawWork,
      src: fallbackSrc,
      assetId: rawWork.assetId ?? fallbackAsset?.id,
      assetStorage: rawWork.assetStorage ?? fallbackAsset?.storage,
      assetSyncStatus: rawWork.assetSyncStatus ?? fallbackAsset?.syncStatus,
      assetRemoteKey: rawWork.assetRemoteKey ?? fallbackAsset?.remoteKey,
      assetRemoteUrl: rawWork.assetRemoteUrl ?? fallbackAsset?.remoteUrl,
      assetUpdatedAt: rawWork.assetUpdatedAt ?? fallbackAsset?.updatedAt,
    })
  })
}

function splitWorksForImport(works: GalleryImage[]) {
  const batches: GalleryImage[][] = []
  let currentBatch: GalleryImage[] = []

  for (const work of works) {
    const nextBatch = [...currentBatch, work]
    if (currentBatch.length > 0 && getBodySize(nextBatch) > importLocalWorksBatchLimit) {
      batches.push(currentBatch)
      currentBatch = [work]
      continue
    }

    currentBatch = nextBatch
    if (currentBatch.length === 1 && getBodySize(currentBatch) > importLocalWorksBatchLimit) {
      batches.push(currentBatch)
      currentBatch = []
    }
  }

  if (currentBatch.length > 0) batches.push(currentBatch)
  return batches
}

function stripLargeInlineImage(work: GalleryImage): GalleryImage {
  if (!work.src?.startsWith('data:image/')) return work
  return { ...work, src: undefined }
}

export function prepareGalleryForPersistence(gallery: GalleryImage[], bodyLimit = worksReplaceBodyLimit) {
  const normalizedGallery = normalizeGallery(gallery)
  const strippedInlineGallery = normalizedGallery.map(stripLargeInlineImage)
  if (getBodySize(strippedInlineGallery) <= bodyLimit) return strippedInlineGallery

  const nextGallery = [...strippedInlineGallery]
  const dataUrlCandidates = nextGallery
    .map((work, index) => ({ index, work }))
    .filter(({ work }) => work.src?.startsWith('data:image/'))
    .sort((left, right) => (right.work.src?.length ?? 0) - (left.work.src?.length ?? 0))

  for (const { index } of dataUrlCandidates) {
    nextGallery[index] = stripLargeInlineImage(nextGallery[index])
    if (getBodySize(nextGallery) <= bodyLimit) return nextGallery
  }

  return nextGallery
}

async function postLegacyWorksBatch(batch: GalleryImage[]) {
  return await apiRequest<ImportLocalWorksResult>('/api/migrations/import-local-works', {
    method: 'POST',
    body: { works: batch },
  })
}

async function importLegacyWorksBatch(batch: GalleryImage[]): Promise<ImportLocalWorksResult> {
  try {
    return await postLegacyWorksBatch(batch)
  } catch (error) {
    if (!(error instanceof Error)) throw error

    const errorRecord = error as unknown
    const statusValue = typeof errorRecord === 'object' && errorRecord !== null && 'status' in errorRecord
      ? (errorRecord as { status?: unknown }).status
      : undefined
    const status = typeof statusValue === 'number' ? statusValue : undefined
    const shouldRetrySmaller = status === 413 || status === 502 || error.message.includes('HTTP 413') || error.message.includes('HTTP 502')
    if (!shouldRetrySmaller) throw error

    if (batch.length > 1) {
      const mid = Math.floor(batch.length / 2)
      const left = await importLegacyWorksBatch(batch.slice(0, mid))
      const right = await importLegacyWorksBatch(batch.slice(mid))
      return { imported: left.imported + right.imported, total: left.total + right.total }
    }

    const stripped = stripLargeInlineImage(batch[0])
    if (stripped === batch[0]) throw error
    return await postLegacyWorksBatch([stripped])
  }
}

async function runImportLegacyWorks() {
  const legacyWorks = normalizeGallery(await readBrowserValue<GalleryImage[]>(worksGalleryStorageKey, []))
  if (!legacyWorks.length) return { imported: 0, total: 0 }

  await writeStoredGalleryAssetRecords(legacyWorks, { prune: false })
  const batches = splitWorksForImport(legacyWorks)
  let imported = 0

  for (const batch of batches) {
    const result = await importLegacyWorksBatch(batch)
    imported += result.imported
  }

  await deleteBrowserValue(worksGalleryStorageKey)
  return { imported, total: legacyWorks.length }
}

export async function importLegacyWorks() {
  if (!importLegacyWorksInFlight) {
    importLegacyWorksInFlight = runImportLegacyWorks().finally(() => {
      importLegacyWorksInFlight = null
    })
  }

  return importLegacyWorksInFlight
}

export async function readStoredGallery() {
  const [gallery, assetMap] = await Promise.all([
    apiRequest<GalleryImage[]>('/api/works'),
    readStoredGalleryAssetRecordMap(),
  ])
  const hydratedGallery = hydrateGallerySources(gallery, assetMap)
  await writeStoredGalleryAssetRecords(hydratedGallery, { prune: true })
  return hydratedGallery
}

export async function writeStoredGallery(gallery: GalleryImage[]) {
  const normalizedGallery = normalizeGallery(gallery)
  await writeStoredGalleryAssetRecords(normalizedGallery, { prune: true })
  const persistedGallery = prepareGalleryForPersistence(normalizedGallery)
  if (getBodySize(persistedGallery) > worksReplaceBodyLimit) {
    return { success: true, count: normalizedGallery.length }
  }

  return await apiRequest<WorksMutationResult>('/api/works/replace', {
    method: 'PUT',
    body: { works: persistedGallery },
  })
}

export async function upsertStoredWork(work: GalleryImage) {
  const normalizedWork = normalizeGalleryImage(work)
  await writeStoredGalleryAssetRecords([normalizedWork], { prune: false })
  return normalizeGalleryImage(await apiRequest<GalleryImage>(`/api/works/${normalizedWork.id}`, {
    method: 'PUT',
    body: normalizedWork,
  }))
}

export async function deleteStoredWork(id: string) {
  const result = await apiRequest<WorksMutationResult>(`/api/works/${id}`, {
    method: 'DELETE',
  })
  await removeStoredGalleryAssets([id])
  return result
}

export async function deleteStoredWorks(ids: string[]) {
  const result = await apiRequest<WorksMutationResult>('/api/works/delete', {
    method: 'POST',
    body: { ids },
  })
  await removeStoredGalleryAssets(ids)
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
