import type { GalleryImage } from '@/features/works/works.types'

export function downloadImage(item: GalleryImage) {
  if (!item.src) return
  const link = document.createElement('a')
  link.href = item.src
  link.download = `${item.title || 'generated-image'}.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
}
