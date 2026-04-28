import type { ReferenceImage } from './reference.types'

export function dataUrlToFile(src: string, filename: string) {
  const [meta, payload] = src.split(',')
  const mime = meta.match(/data:(.*?);base64/)?.[1] || 'image/png'
  const binary = atob(payload || '')
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new File([bytes], filename, { type: mime })
}

export async function referenceImageToFile(reference: ReferenceImage) {
  if (reference.file) return reference.file
  if (reference.src.startsWith('data:image/')) return dataUrlToFile(reference.src, reference.name || 'reference.png')
  const response = await fetch(reference.src)
  if (!response.ok) throw new Error('无法读取参考图，请换一张图片或重新上传')
  const blob = await response.blob()
  return new File([blob], reference.name || 'reference.png', { type: blob.type || 'image/png' })
}
