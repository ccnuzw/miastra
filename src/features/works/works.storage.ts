import { apiRequest } from '@/shared/http/client'
import { deleteBrowserValue, readBrowserValue } from '@/shared/storage/browserDatabase'
import type { GalleryImage } from './works.types'

export const worksGalleryStorageKey = 'new-pic:works-gallery:v1'

type ImportLocalWorksResult = {
  imported: number
  total: number
}

const importLocalWorksBatchLimit = 700_000
let importLegacyWorksInFlight: Promise<ImportLocalWorksResult> | null = null

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  return Array.from(new Set(tags
    .map((tag) => typeof tag === 'string' ? tag.trim() : '')
    .filter(Boolean)))
}

export function normalizeGalleryImage(image: GalleryImage): GalleryImage {
  const { favorite, tags, ...rest } = image
  return {
    ...rest,
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

function sanitizeGalleryForPersistence(gallery: GalleryImage[]) {
  return normalizeGallery(gallery)
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

    const shouldRetrySmaller = error.message.includes('HTTP 413') || error.message.includes('HTTP 502')
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
  const gallery = await apiRequest<GalleryImage[]>('/api/works')
  return normalizeGallery(gallery)
}

export async function writeStoredGallery(gallery: GalleryImage[]) {
  const sanitizedGallery = sanitizeGalleryForPersistence(gallery)
  if (getBodySize(sanitizedGallery) > 14_000_000) {
    return { success: true, count: sanitizedGallery.length }
  }

  return await apiRequest<{ success: true, count: number }>('/api/works/replace', {
    method: 'PUT',
    body: { works: sanitizedGallery },
  })
}
