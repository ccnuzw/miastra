import type { GalleryImage } from '@/features/works/works.types'

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

export type DownloadWorksZipOptions = {
  includeMetadata?: boolean
  filename?: string
  metadataFilename?: string
  imageDirectory?: string
  fetchOptions?: RequestInit
}

export type ExportedWorkMetadata = {
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

export type ImageExportRecord = {
  item: GalleryImage
  index: number
  fileName: string
}

const sensitiveKeyPattern = /(api[-_\s]?key|authorization|access[-_\s]?token|refresh[-_\s]?token|secret|password|bearer)/i

export function removeUndefinedAndSensitiveFields<T>(value: T): T {
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

export function sanitizeGenerationSnapshot(snapshot: GalleryImage['generationSnapshot']) {
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
