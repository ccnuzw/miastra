import JSZip from 'jszip'
import type { GalleryImage } from '@/features/works/works.types'

export type DownloadWorksZipOptions = {
  includeMetadata?: boolean
  filename?: string
  metadataFilename?: string
  imageDirectory?: string
  fetchOptions?: RequestInit
}

export type DownloadWorksZipFailureReason =
  | 'missing-src'
  | 'fetch-failed'
  | 'empty-blob'
  | 'zip-generate-failed'

export type ImageSourceType = 'data-url' | 'remote-url' | 'blob-url' | 'unknown'

export type DownloadWorksZipFailure = {
  id: string
  title: string
  index: number
  sourceType?: ImageSourceType
  reason: DownloadWorksZipFailureReason
  message: string
}

export type DownloadWorksZipResult = {
  requestedCount: number
  imageCount: number
  failedCount: number
  failures: DownloadWorksZipFailure[]
  metadataIncluded: boolean
  filename: string
  blob?: Blob
}

type ExportedWorkMetadata = {
  id: string
  title: string
  fileName?: string
  skippedReason?: DownloadWorksZipFailureReason
  meta?: string
  variation?: string
  batchId?: string
  drawIndex?: number
  taskStatus?: GalleryImage['taskStatus']
  error?: string
  retryCount?: number
  createdAt?: number
  mode?: GalleryImage['mode']
  providerModel?: string
  size?: string
  quality?: string
  snapshotId?: string
  promptSnippet?: string
  promptText?: string
  isFavorite?: boolean
  tags?: string[]
  generationSnapshot?: ReturnType<typeof sanitizeGenerationSnapshot>
}

type ImageExportRecord = {
  item: GalleryImage
  index: number
  fileName: string
}

const defaultZipFilename = 'miastra-works.zip'
const defaultImageDirectory = 'images'
const defaultMetadataFilename = 'metadata.json'
const imageExtensionByMime: Record<string, string> = {
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
}
const knownImageExtensions = new Set(Object.values(imageExtensionByMime))
const sensitiveKeyPattern = /(api[-_\s]?key|authorization|access[-_\s]?token|refresh[-_\s]?token|secret|password|bearer)/i

export function downloadImage(item: GalleryImage) {
  if (!item.src) return
  const extension = inferImageExtension(item.src)
  const baseName = sanitizeFileName(stripKnownImageExtension(item.title || 'generated-image'))
  downloadFileUrl(item.src, `${baseName}.${extension}`)
}

export async function downloadWorksZip(
  works: GalleryImage[],
  options: DownloadWorksZipOptions = {},
): Promise<DownloadWorksZipResult> {
  const result = await createWorksZipBlob(works, options)

  if (result.blob) {
    downloadBlob(result.blob, result.filename)
  }

  return result
}

export async function createWorksZipBlob(
  works: GalleryImage[],
  options: DownloadWorksZipOptions = {},
): Promise<DownloadWorksZipResult> {
  const filename = ensureZipExtension(sanitizeFileName(options.filename || defaultZipFilename))
  const failures: DownloadWorksZipFailure[] = []
  const exportedRecords: ImageExportRecord[] = []
  const zip = new JSZip()
  const imageDirectory = sanitizeDirectoryName(options.imageDirectory || defaultImageDirectory)
  const imagesFolder = zip.folder(imageDirectory) ?? zip
  const usedImagePaths = new Set<string>()
  const padLength = Math.max(3, String(Math.max(works.length, 1)).length)

  for (const [index, item] of works.entries()) {
    if (!item.src) {
      failures.push(buildFailure(item, index, 'missing-src', 'Image source is missing.'))
      continue
    }

    try {
      const blob = await fetchImageBlob(item.src, options.fetchOptions)
      const extension = inferImageExtension(item.src, blob.type)
      const fileName = makeUniqueImageFileName(item, index, extension, padLength, usedImagePaths)

      imagesFolder.file(fileName, blob)
      exportedRecords.push({ item, index, fileName: `${imageDirectory}/${fileName}` })
    } catch (error) {
      const reason: DownloadWorksZipFailureReason = error instanceof EmptyBlobError ? 'empty-blob' : 'fetch-failed'
      failures.push(buildFailure(item, index, reason, getErrorMessage(error)))
    }
  }

  if (options.includeMetadata) {
    const metadataFilename = sanitizeFileName(options.metadataFilename || defaultMetadataFilename)
    zip.file(metadataFilename || defaultMetadataFilename, JSON.stringify(buildMetadata(works, exportedRecords, failures), null, 2))
  }

  if (exportedRecords.length === 0 && !options.includeMetadata) {
    return buildZipResult({ works, failures, filename, metadataIncluded: false })
  }

  try {
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })

    return buildZipResult({ works, failures, filename, metadataIncluded: Boolean(options.includeMetadata), blob, imageCount: exportedRecords.length })
  } catch (error) {
    failures.push({
      id: '__zip__',
      title: filename,
      index: -1,
      reason: 'zip-generate-failed',
      message: getErrorMessage(error),
    })

    return buildZipResult({ works, failures, filename, metadataIncluded: Boolean(options.includeMetadata), imageCount: exportedRecords.length })
  }
}

export function sanitizeFileName(value: string, fallback = 'untitled') {
  const normalized = value
    .normalize('NFKD')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/g, '')
    .trim()

  const safe = normalized || fallback
  const reservedWindowsName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(safe)
  const fileName = reservedWindowsName ? `${safe}-file` : safe

  return fileName.slice(0, 120)
}

export function inferImageExtension(src?: string, mimeType?: string) {
  const extensionFromMime = getExtensionFromMime(mimeType)
  if (extensionFromMime) return extensionFromMime

  if (src?.startsWith('data:')) {
    const mimeMatch = src.match(/^data:([^;,]+)/i)
    const dataUrlExtension = getExtensionFromMime(mimeMatch?.[1])
    if (dataUrlExtension) return dataUrlExtension
  }

  const extensionFromUrl = getExtensionFromUrl(src)
  if (extensionFromUrl) return extensionFromUrl

  return 'png'
}

async function fetchImageBlob(src: string, fetchOptions?: RequestInit) {
  const response = await fetch(src, fetchOptions)

  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status} ${response.statusText || 'Unknown status'}).`)
  }

  const blob = await response.blob()

  if (!blob.size) {
    throw new EmptyBlobError('Fetched image is empty.')
  }

  return blob
}

function makeUniqueImageFileName(
  item: GalleryImage,
  index: number,
  extension: string,
  padLength: number,
  usedImagePaths: Set<string>,
) {
  const numericPrefix = String(index + 1).padStart(padLength, '0')
  const title = sanitizeFileName(stripKnownImageExtension(item.title || item.id || 'generated-image'))
  const baseFileName = `${numericPrefix}-${title}`
  let candidate = `${baseFileName}.${extension}`
  let duplicateCounter = 2

  while (usedImagePaths.has(candidate)) {
    candidate = `${baseFileName}-${duplicateCounter}.${extension}`
    duplicateCounter += 1
  }

  usedImagePaths.add(candidate)
  return candidate
}

function buildMetadata(
  works: GalleryImage[],
  exportedRecords: ImageExportRecord[],
  failures: DownloadWorksZipFailure[],
) {
  const fileNameByIdAndIndex = new Map(exportedRecords.map((record) => [metadataKey(record.item, record.index), record.fileName]))
  const failureByIdAndIndex = new Map(failures.map((failure) => [metadataKey({ id: failure.id }, failure.index), failure]))

  return removeUndefinedAndSensitiveFields({
    exportedAt: new Date().toISOString(),
    requestedCount: works.length,
    imageCount: exportedRecords.length,
    failedCount: failures.length,
    works: works.map((item, index): ExportedWorkMetadata => {
      const key = metadataKey(item, index)
      const failure = failureByIdAndIndex.get(key)

      return removeUndefinedAndSensitiveFields({
        id: item.id,
        title: item.title,
        fileName: fileNameByIdAndIndex.get(key),
        skippedReason: failure?.reason,
        meta: item.meta,
        variation: item.variation,
        batchId: item.batchId,
        drawIndex: item.drawIndex,
        taskStatus: item.taskStatus,
        error: item.error,
        retryCount: item.retryCount,
        createdAt: item.createdAt,
        mode: item.mode,
        providerModel: item.providerModel,
        size: item.size,
        quality: item.quality,
        snapshotId: item.snapshotId,
        promptSnippet: item.promptSnippet,
        promptText: item.promptText,
        isFavorite: item.isFavorite ?? item.favorite,
        tags: item.tags,
        generationSnapshot: sanitizeGenerationSnapshot(item.generationSnapshot),
      }) as ExportedWorkMetadata
    }),
    failures: failures.map((failure) => removeUndefinedAndSensitiveFields(failure)),
  })
}

function sanitizeGenerationSnapshot(snapshot: GalleryImage['generationSnapshot']) {
  if (!snapshot) return undefined

  return removeUndefinedAndSensitiveFields({
    id: snapshot.id,
    createdAt: snapshot.createdAt,
    mode: snapshot.mode,
    prompt: snapshot.prompt,
    requestPrompt: snapshot.requestPrompt,
    workspacePrompt: snapshot.workspacePrompt,
    size: snapshot.size,
    quality: snapshot.quality,
    model: snapshot.model,
    providerId: snapshot.providerId,
    stream: snapshot.stream,
    references: snapshot.references,
    draw: snapshot.draw,
  })
}

function removeUndefinedAndSensitiveFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefinedAndSensitiveFields(item)) as T
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, entryValue]) => entryValue !== undefined && !sensitiveKeyPattern.test(key))
      .map(([key, entryValue]) => [key, removeUndefinedAndSensitiveFields(entryValue)]),
  ) as T
}

function buildFailure(
  item: GalleryImage,
  index: number,
  reason: DownloadWorksZipFailureReason,
  message: string,
): DownloadWorksZipFailure {
  return {
    id: item.id,
    title: item.title,
    index,
    sourceType: getImageSourceType(item.src),
    reason,
    message,
  }
}

function buildZipResult({
  works,
  failures,
  filename,
  metadataIncluded,
  blob,
  imageCount = 0,
}: {
  works: GalleryImage[]
  failures: DownloadWorksZipFailure[]
  filename: string
  metadataIncluded: boolean
  blob?: Blob
  imageCount?: number
}): DownloadWorksZipResult {
  return {
    requestedCount: works.length,
    imageCount,
    failedCount: failures.length,
    failures,
    metadataIncluded,
    filename,
    blob,
  }
}

function metadataKey(item: Pick<GalleryImage, 'id'>, index: number) {
  return `${item.id}::${index}`
}

function getExtensionFromMime(mimeType?: string) {
  if (!mimeType) return undefined
  return imageExtensionByMime[mimeType.toLowerCase().split(';')[0].trim()]
}

function getExtensionFromUrl(src?: string) {
  if (!src || src.startsWith('data:')) return undefined

  try {
    const url = new URL(src, window.location.href)
    const extension = url.pathname.split('.').pop()?.toLowerCase()
    return extension && knownImageExtensions.has(extension) ? extension : undefined
  } catch {
    const extension = src.split(/[?#]/)[0].split('.').pop()?.toLowerCase()
    return extension && knownImageExtensions.has(extension) ? extension : undefined
  }
}

function stripKnownImageExtension(value: string) {
  const extension = value.split('.').pop()?.toLowerCase()
  return extension && knownImageExtensions.has(extension) ? value.slice(0, -(extension.length + 1)) : value
}

function getImageSourceType(src?: string): ImageSourceType | undefined {
  if (!src) return undefined
  if (src.startsWith('data:')) return 'data-url'
  if (src.startsWith('blob:')) return 'blob-url'

  try {
    const url = new URL(src, window.location.href)
    return url.protocol === 'http:' || url.protocol === 'https:' ? 'remote-url' : 'unknown'
  } catch {
    return 'unknown'
  }
}

function sanitizeDirectoryName(value: string) {
  return sanitizeFileName(value || defaultImageDirectory, defaultImageDirectory).replace(/^\/+|\/+$/g, '') || defaultImageDirectory
}

function ensureZipExtension(value: string) {
  return value.toLowerCase().endsWith('.zip') ? value : `${value}.zip`
}

function downloadFileUrl(href: string, filename: string) {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  downloadFileUrl(objectUrl, filename)
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown download error.'
}

class EmptyBlobError extends Error {}
