import type { GalleryImage } from '@/features/works/works.types'
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
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const imageDirectory = sanitizeDirectoryName(options.imageDirectory || defaultImageDirectory, defaultImageDirectory)
  const imagesFolder = zip.folder(imageDirectory) ?? zip
  const usedImagePaths = new Set<string>()
  const padLength = Math.max(3, String(Math.max(works.length, 1)).length)
  const fetchResults = await mapWithConcurrency(works, defaultFetchConcurrency, async (item, index) => {
    if (!item.src) {
      return {
        index,
        item,
        failure: buildFailure(item, index, 'missing-src', 'Image source is missing.'),
      }
    }

    try {
      const blob = await fetchImageBlob(item.src, options.fetchOptions)
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
      if (!result.blob || !result.item.src) return
      const extension = inferImageExtension(result.item.src, result.blob.type)
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
    throw new Error(`Failed to fetch image (${response.status} ${response.statusText || 'Unknown status'}).`)
  }

  const blob = await response.blob()

  if (!blob.size) {
    throw new EmptyBlobError('Fetched image is empty.')
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
