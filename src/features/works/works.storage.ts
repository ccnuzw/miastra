import { readBrowserValue, writeBrowserValue } from '@/shared/storage/browserDatabase'
import type { GalleryImage } from './works.types'

export const worksGalleryStorageKey = 'new-pic:works-gallery:v1'

export function readStoredGallery() {
  return readBrowserValue<GalleryImage[]>(worksGalleryStorageKey, [])
}

export function writeStoredGallery(gallery: GalleryImage[]) {
  return writeBrowserValue(worksGalleryStorageKey, gallery)
}
