import { apiRequest } from '@/shared/http/client'
import { deleteBrowserValue, readBrowserValue } from '@/shared/storage/browserDatabase'
import type { GalleryImage } from './works.types'

export const worksGalleryStorageKey = 'new-pic:works-gallery:v1'

type ImportLocalWorksResult = {
  imported: number
  total: number
}

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

export async function importLegacyWorks() {
  const legacyWorks = normalizeGallery(await readBrowserValue<GalleryImage[]>(worksGalleryStorageKey, []))
  if (!legacyWorks.length) return { imported: 0, total: 0 }

  const result = await apiRequest<ImportLocalWorksResult>('/api/migrations/import-local-works', {
    method: 'POST',
    body: { works: legacyWorks },
  })

  await deleteBrowserValue(worksGalleryStorageKey)
  return result
}

export async function readStoredGallery() {
  const gallery = await apiRequest<GalleryImage[]>('/api/works')
  return normalizeGallery(gallery)
}

export function writeStoredGallery(gallery: GalleryImage[]) {
  return apiRequest<{ success: true, count: number }>('/api/works/replace', {
    method: 'PUT',
    body: { works: normalizeGallery(gallery) },
  })
}
