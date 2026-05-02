import type { GalleryImage } from '@/features/works/works.types'
import type {
  DownloadWorksZipFailure,
  DownloadWorksZipFailureReason,
  DownloadWorksZipResult,
  ExportedWorkMetadata,
  ImageExportRecord,
  ImageSourceType,
} from './download.types'
import { removeUndefinedAndSensitiveFields, sanitizeGenerationSnapshot } from './download.types'

export function getImageSourceType(src?: string): ImageSourceType | undefined {
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

export function buildFailure(
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

export function buildMetadata(
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

export function buildZipResult({
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

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown download error.'
}

export class EmptyBlobError extends Error {}

function metadataKey(item: Pick<GalleryImage, 'id'>, index: number) {
  return `${item.id}::${index}`
}
