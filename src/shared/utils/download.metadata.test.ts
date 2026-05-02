// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { buildFailure, buildMetadata, buildZipResult, getErrorMessage, getImageSourceType } from './download.metadata'
import { ensureZipExtension, sanitizeDirectoryName, sanitizeFileName, stripKnownImageExtension } from './download.file'

describe('download helpers', () => {
  it('sanitizes file and directory names', () => {
    expect(sanitizeFileName(' a/b:c ')).toBe('a-b-c')
    expect(sanitizeDirectoryName('/foo/bar/', 'images')).toBe('foo-bar')
    expect(ensureZipExtension('works')).toBe('works.zip')
    expect(stripKnownImageExtension('demo.png')).toBe('demo')
  })

  it('detects image source types', () => {
    expect(getImageSourceType('data:image/png;base64,abc')).toBe('data-url')
    expect(getImageSourceType('blob:abc')).toBe('blob-url')
  })

  it('builds failure and metadata payloads', () => {
    const work = {
      id: 'w1',
      title: '作品一',
      src: 'data:image/png;base64,abc',
      meta: 'meta',
      tags: ['x'],
    }
    const failure = buildFailure(work, 0, 'missing-src', 'missing')
    expect(failure.id).toBe('w1')

    const metadata = buildMetadata([work], [], [failure])
    expect(metadata.requestedCount).toBe(1)
    expect(metadata.failedCount).toBe(1)

    const result = buildZipResult({ works: [work], failures: [failure], filename: 'a.zip', metadataIncluded: true })
    expect(result.filename).toBe('a.zip')
  })

  it('formats errors', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom')
  })
})
