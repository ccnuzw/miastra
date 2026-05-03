// @vitest-environment jsdom
import type { GalleryImage } from '@/features/works/works.types'
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
      assetId: 'asset-w1',
      assetStorage: 'remote',
      assetSyncStatus: 'synced',
      assetRemoteKey: 'remote-key-w1',
      assetRemoteUrl: 'https://cdn.example.com/w1.png',
      assetUpdatedAt: 123,
      meta: 'meta',
      tags: ['x'],
    } satisfies GalleryImage
    const failure = buildFailure(work, 0, 'missing-src', 'missing')
    expect(failure.id).toBe('w1')

    const metadata = buildMetadata([work], [], [failure])
    expect(metadata.requestedCount).toBe(1)
    expect(metadata.failedCount).toBe(1)

    const result = buildZipResult({ works: [work], failures: [failure], filename: 'a.zip', metadataIncluded: true })
    expect(result.filename).toBe('a.zip')
  })

  it('strips sensitive fields from exported metadata snapshots', () => {
    const works = [
      {
        id: 'w1',
        title: '作品一',
        src: 'https://example.com/work.png',
        assetId: 'asset-w1',
        assetStorage: 'remote',
        assetSyncStatus: 'synced',
        assetRemoteKey: 'remote-key-w1',
        assetUpdatedAt: 123,
        meta: 'meta',
        isFavorite: true,
        tags: ['cover'],
        assetRemoteUrl: 'https://cdn.example.com/w1.png?token=secret',
        generationSnapshot: {
          id: 'snapshot-1',
          createdAt: 1,
          mode: 'text2image',
          prompt: 'portrait',
          requestPrompt: 'portrait request',
          workspacePrompt: 'portrait workspace',
          size: '1024x1024',
          quality: 'high',
          model: 'gpt-image-1',
          providerId: 'openai',
          apiUrl: 'https://example.com/v1',
          requestUrl: 'https://example.com/v1/images/generations',
          stream: false,
          references: {
            count: 1,
            sources: [{ source: 'work', name: 'ref-1', src: 'data:image/png;base64,abc', assetId: 'asset-1', workId: 'work-1', workTitle: '作品一' }],
            note: 'reference',
          },
          apiKey: 'secret-key',
          authorization: 'Bearer secret',
        } as never,
      },
      {
        id: 'w2',
        title: '作品二',
        meta: 'meta 2',
      },
    ] satisfies GalleryImage[]

    const metadata = buildMetadata(
      works,
      [{ item: works[0], index: 0, fileName: 'images/001-作品一.png' }],
      [buildFailure(works[1], 1, 'fetch-failed', 'boom')],
    )

    expect(metadata.works[0]).toMatchObject({
      fileName: 'images/001-作品一.png',
      assetId: 'asset-w1',
      assetSyncStatus: 'synced',
      assetRemoteKey: 'remote-key-w1',
      assetRemoteUrl: 'https://cdn.example.com/w1.png',
      isFavorite: true,
      tags: ['cover'],
      generationSnapshot: {
        id: 'snapshot-1',
        model: 'gpt-image-1',
      },
    })
    expect(metadata.works[0].generationSnapshot).not.toHaveProperty('apiKey')
    expect(metadata.works[0].generationSnapshot).not.toHaveProperty('authorization')
    expect(metadata.works[0].generationSnapshot?.references?.sources?.[0]).not.toHaveProperty('src')
    expect(metadata.works[0].generationSnapshot?.references?.sources?.[0]).toMatchObject({
      source: 'work',
      name: 'ref-1',
      assetId: 'asset-1',
      workId: 'work-1',
      workTitle: '作品一',
    })
    expect(metadata.works[1]).toMatchObject({
      skippedReason: 'fetch-failed',
    })
    expect(JSON.stringify(metadata)).not.toContain('secret-key')
    expect(JSON.stringify(metadata)).not.toContain('token=secret')
  })

  it('formats errors', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom')
  })
})
