import { readBrowserValue, writeBrowserValue } from '@/shared/storage/browserDatabase'
import type { GalleryImage } from './works.types'

export const worksGalleryStorageKey = 'new-pic:works-gallery:v1'

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

export async function readStoredGallery() {
  const gallery = await readBrowserValue<GalleryImage[]>(worksGalleryStorageKey, [])
  return normalizeGallery(gallery)
}

export function writeStoredGallery(gallery: GalleryImage[]) {
  return writeBrowserValue(worksGalleryStorageKey, normalizeGallery(gallery))
}
