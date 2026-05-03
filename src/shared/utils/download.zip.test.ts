// @vitest-environment jsdom
import JSZip from 'jszip'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createWorksZipBlob } from './download'

describe('createWorksZipBlob', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('packages images and metadata into a reusable zip payload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('first')) {
        return new Response('first-image', {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        }) as Response
      }

      if (url.includes('second')) {
        return new Response('second-image', {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' },
        }) as Response
      }

      throw new Error(`Unexpected fetch url: ${url}`)
    })

    const works = [
      { id: 'work-1', title: 'a/b:c.png', src: 'https://example.com/first.png', meta: '封面' },
      { id: 'work-2', title: '第二张', src: 'https://example.com/second.jpg', meta: '细节图', tags: ['detail'] },
      { id: 'work-3', title: '缺图作品', meta: '没有图片源' },
    ]

    const result = await createWorksZipBlob(works, {
      includeMetadata: true,
      filename: '发布回归包',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({
      filename: '发布回归包.zip',
      imageCount: 2,
      failedCount: 1,
      metadataIncluded: true,
    })
    expect(result.blob).toBeInstanceOf(Blob)

    const zip = await JSZip.loadAsync(await result.blob!.arrayBuffer())
    expect(Object.keys(zip.files).sort()).toEqual([
      'images/',
      'images/001-a-b-c.png',
      'images/002-第二张.jpg',
      'metadata.json',
    ])

    const metadata = JSON.parse(await zip.file('metadata.json')!.async('string'))
    expect(metadata).toMatchObject({
      requestedCount: 3,
      imageCount: 2,
      failedCount: 1,
    })
    expect(metadata.works[0]).toMatchObject({ fileName: 'images/001-a-b-c.png' })
    expect(metadata.works[1]).toMatchObject({ fileName: 'images/002-第二张.jpg', tags: ['detail'] })
    expect(metadata.works[2]).toMatchObject({ skippedReason: 'missing-src' })
  })

  it('reports empty blobs without creating an unusable zip when metadata is disabled', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('', {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    }) as Response)

    const result = await createWorksZipBlob([
      { id: 'work-empty', title: '空图', src: 'https://example.com/empty.png', meta: 'empty' },
    ])

    expect(result.blob).toBeUndefined()
    expect(result.imageCount).toBe(0)
    expect(result.failedCount).toBe(1)
    expect(result.failures[0]).toMatchObject({
      id: 'work-empty',
      reason: 'empty-blob',
    })
  })
})
