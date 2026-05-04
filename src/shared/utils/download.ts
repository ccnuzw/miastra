import type { GalleryImage } from '@/features/works/works.types'
import { createExportError } from '@/shared/errors/app-error'
import { ensureZipExtension, inferImageExtension, sanitizeDirectoryName, sanitizeFileName, stripKnownImageExtension } from './download.file'
import { buildFailure, buildMetadata, buildZipResult, EmptyBlobError, getErrorMessage } from './download.metadata'
import type {
  DownloadWorksZipFailure,
  DownloadWorksZipFailureReason,
  DownloadWorksZipOptions,
  DownloadWorksZipResult,
  ImageExportRecord,
} from './download.types'

const defaultZipFilename = 'miastra-works.zip'
const defaultImageDirectory = 'images'
const defaultMetadataFilename = 'metadata.json'
const defaultFetchConcurrency = 4

function resolveImageSrc(item: Pick<GalleryImage, 'src' | 'assetRemoteUrl'>) {
  return item.src || item.assetRemoteUrl
}

export function downloadImage(item: GalleryImage) {
  const src = resolveImageSrc(item)
  if (!src) return
  const extension = inferImageExtension(src)
  const baseName = sanitizeFileName(stripKnownImageExtension(item.title || 'generated-image'))
  downloadFileUrl(src, `${baseName}.${extension}`)
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

export function createDownloadResultError(result: DownloadWorksZipResult) {
  if (result.failedCount <= 0) return null

  const firstFailure = result.failures[0]
  const summary = `共导出 ${result.requestedCount} 项，成功 ${result.imageCount} 项，失败 ${result.failedCount} 项。`

  if (!firstFailure) {
    return createExportError('EXPORT_FETCH_FAILED', `批量导出未完成。${summary}`)
  }

  if (firstFailure.reason === 'zip-generate-failed') {
    return createExportError('EXPORT_ZIP_FAILED', `ZIP 打包失败。${summary}`)
  }

  if (firstFailure.reason === 'empty-blob') {
    return createExportError('EXPORT_EMPTY_BLOB', `部分图片内容为空，未能完整导出。${summary}`)
  }

  if (firstFailure.reason === 'missing-src') {
    return createExportError('EXPORT_FETCH_FAILED', `部分作品缺少图片源，未能完整导出。${summary}`)
  }

  return createExportError('EXPORT_FETCH_FAILED', `部分图片下载失败，未能完整导出。${summary}`)
}

export async function createWorksZipBlob(
  works: GalleryImage[],
  options: DownloadWorksZipOptions = {},
): Promise<DownloadWorksZipResult> {
  const filename = ensureZipExtension(sanitizeFileName(options.filename || defaultZipFilename))
  const failures: DownloadWorksZipFailure[] = []
  const exportedRecords: ImageExportRecord[] = []
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const imageDirectory = sanitizeDirectoryName(options.imageDirectory || defaultImageDirectory, defaultImageDirectory)
  const imagesFolder = zip.folder(imageDirectory) ?? zip
  const usedImagePaths = new Set<string>()
  const padLength = Math.max(3, String(Math.max(works.length, 1)).length)
  const fetchResults = await mapWithConcurrency(works, defaultFetchConcurrency, async (item, index) => {
    const src = resolveImageSrc(item)
    if (!src) {
      return {
        index,
        item,
        failure: buildFailure(item, index, 'missing-src', 'Image source is missing.'),
      }
    }

    try {
      const blob = await fetchImageBlob(src, options.fetchOptions)
      return {
        index,
        item,
        blob,
      }
    } catch (error) {
      const reason: DownloadWorksZipFailureReason = error instanceof EmptyBlobError ? 'empty-blob' : 'fetch-failed'
      return {
        index,
        item,
        failure: buildFailure(item, index, reason, getErrorMessage(error)),
      }
    }
  })

  fetchResults
    .sort((left, right) => left.index - right.index)
    .forEach((result) => {
      if (result.failure) {
        failures.push(result.failure)
        return
      }
      const src = resolveImageSrc(result.item)
      if (!result.blob || !src) return
      const extension = inferImageExtension(src, result.blob.type)
      const fileName = makeUniqueImageFileName(result.item, result.index, extension, padLength, usedImagePaths)
      imagesFolder.file(fileName, result.blob)
      exportedRecords.push({ item: result.item, index: result.index, fileName: `${imageDirectory}/${fileName}` })
    })

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

async function fetchImageBlob(src: string, fetchOptions?: RequestInit) {
  const response = await fetch(src, fetchOptions)

  if (!response.ok) {
    throw createExportError('EXPORT_FETCH_FAILED', `下载图片失败（HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}）。`)
  }

  const blob = await response.blob()

  if (!blob.size) {
    throw new EmptyBlobError('下载到的图片内容为空。')
  }

  return blob
}

async function mapWithConcurrency<TItem, TResult>(items: TItem[], concurrency: number, mapper: (item: TItem, index: number) => Promise<TResult>) {
  const limit = Math.max(1, Math.min(concurrency, items.length || 1))
  const results: TResult[] = new Array(items.length)
  let cursor = 0

  await Promise.all(Array.from({ length: limit }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await mapper(items[index], index)
    }
  }))

  return results
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
