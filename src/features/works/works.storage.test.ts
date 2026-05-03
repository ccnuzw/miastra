// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GalleryImage } from './works.types'
import {
  addTagToStoredWorks,
  deleteStoredWork,
  deleteStoredWorks,
  hydrateGallerySources,
  importLegacyWorks,
  normalizeGallery,
  normalizeGalleryImage,
  prepareGalleryForPersistence,
  readStoredGallery,
  removeTagFromStoredWorks,
  replaceStoredWorkTags,
  updateStoredWorkFavorite,
  upsertStoredWork,
  worksGalleryAssetRecordStorageKey,
  worksGalleryAssetStorageKey,
  worksGalleryStorageKey,
  writeStoredGallery,
} from './works.storage'

function getPrimaryAssetId(workId: string) {
  return `work:${workId}:primary`
}

describe('works.storage', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value)
        },
        removeItem: (key: string) => {
          store.delete(key)
        },
        clear: () => {
          store.clear()
        },
      },
    })
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: undefined,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('normalizes legacy favorite and duplicate tags', () => {
    const image = normalizeGalleryImage({
      id: '1',
      title: 'test',
      meta: 'meta',
      favorite: true,
      tags: ['a', 'a', ' ', 'b'],
    })

    expect(image.isFavorite).toBe(true)
    expect(image.tags).toEqual(['a', 'b'])
  })

  it('normalizes legacy tag strings', () => {
    const image = normalizeGalleryImage({
      id: '2',
      title: 'test',
      meta: 'meta',
      tags: 'a, b，c\nd',
    } as unknown as GalleryImage)

    expect(image.tags).toEqual(['a', 'b', 'c', 'd'])
  })

  it('normalizes gallery arrays', () => {
    expect(normalizeGallery([])).toEqual([])
  })

  it('splits large legacy works into multiple migration requests', async () => {
    window.localStorage.setItem(worksGalleryStorageKey, JSON.stringify([
      { id: 'legacy-1', title: '旧作品 1', meta: 'legacy', createdAt: 1, src: 'a'.repeat(400_000) },
      { id: 'legacy-2', title: '旧作品 2', meta: 'legacy', createdAt: 2, src: 'b'.repeat(400_000) },
    ]))

    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { imported: 1, total: 1 } }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { imported: 1, total: 1 } }) } as Response)

    await expect(importLegacyWorks()).resolves.toEqual({ imported: 2, total: 2 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/migrations/import-local-works', expect.objectContaining({ method: 'POST', credentials: 'include' }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/migrations/import-local-works', expect.objectContaining({ method: 'POST', credentials: 'include' }))
    expect(window.localStorage.getItem(worksGalleryStorageKey)).toBeNull()
  })

  it('retries a 413 batch by splitting it smaller', async () => {
    window.localStorage.setItem(worksGalleryStorageKey, JSON.stringify([
      { id: 'legacy-1', title: '旧作品 1', meta: 'legacy', createdAt: 1 },
      { id: 'legacy-2', title: '旧作品 2', meta: 'legacy', createdAt: 2 },
    ]))

    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 413, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { imported: 1, total: 1 } }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { imported: 1, total: 1 } }) } as Response)

    await expect(importLegacyWorks()).resolves.toEqual({ imported: 2, total: 2 })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(window.localStorage.getItem(worksGalleryStorageKey)).toBeNull()
  })

  it('retries a 502 batch by splitting it smaller', async () => {
    window.localStorage.setItem(worksGalleryStorageKey, JSON.stringify([
      { id: 'legacy-1', title: '旧作品 1', meta: 'legacy', createdAt: 1 },
      { id: 'legacy-2', title: '旧作品 2', meta: 'legacy', createdAt: 2 },
    ]))

    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { imported: 1, total: 1 } }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { imported: 1, total: 1 } }) } as Response)

    await expect(importLegacyWorks()).resolves.toEqual({ imported: 2, total: 2 })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(window.localStorage.getItem(worksGalleryStorageKey)).toBeNull()
  })

  it('drops inline image data when a single oversized work still fails', async () => {
    window.localStorage.setItem(worksGalleryStorageKey, JSON.stringify([
      { id: 'legacy-1', title: '旧作品', meta: 'legacy', createdAt: 1, src: 'data:image/png;base64,' + 'a'.repeat(900_000) },
    ]))

    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { imported: 1, total: 1 } }) } as Response)

    await expect(importLegacyWorks()).resolves.toEqual({ imported: 1, total: 1 })
    const secondCall = fetchMock.mock.calls[1]
    expect(secondCall?.[0]).toBe('/api/migrations/import-local-works')
    const body = JSON.parse(String((secondCall?.[1] as RequestInit).body))
    expect(body.works[0].src).toBeUndefined()
    expect(window.localStorage.getItem(worksGalleryStorageKey)).toBeNull()
  })

  it('does not strip non-data urls when a single work still fails to import', async () => {
    window.localStorage.setItem(worksGalleryStorageKey, JSON.stringify([
      { id: 'legacy-1', title: '旧作品', meta: 'legacy', createdAt: 1, src: 'https://example.com/work.png' },
    ]))

    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) } as Response)

    await expect(importLegacyWorks()).rejects.toThrow('服务暂时不可用，请稍后重试。')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))
    expect(body.works[0].src).toBe('https://example.com/work.png')
    expect(window.localStorage.getItem(worksGalleryStorageKey)).not.toBeNull()
  })

  it('imports legacy local works through migration api and clears local cache', async () => {
    window.localStorage.setItem(worksGalleryStorageKey, JSON.stringify([
      { id: 'legacy-1', title: '旧作品', meta: 'legacy', createdAt: 1 },
    ]))

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { imported: 1, total: 1 } }),
    } as Response)

    await expect(importLegacyWorks()).resolves.toEqual({ imported: 1, total: 1 })
    expect(fetchMock).toHaveBeenCalledWith('/api/migrations/import-local-works', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }))
    expect(window.localStorage.getItem(worksGalleryStorageKey)).toBeNull()
  })

  it('reads works from api when no legacy cache exists', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'work-1', title: '作品', meta: 'from-api', createdAt: 1 }] }),
    } as Response)

    await expect(readStoredGallery()).resolves.toEqual([
      { id: 'work-1', title: '作品', meta: 'from-api', createdAt: 1, isFavorite: false, tags: [] },
    ])
    expect(fetchMock).toHaveBeenCalledWith('/api/works', expect.objectContaining({ credentials: 'include' }))
  })

  it('hydrates missing src from local asset cache when reading works', async () => {
    window.localStorage.setItem(worksGalleryAssetStorageKey, JSON.stringify({
      'data-work': 'data:image/png;base64,abc',
      'blob-work': 'blob:https://example.com/work',
      'http-work': 'https://example.com/work.png',
    }))

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 'data-work', title: 'Data', meta: 'from-api', createdAt: 1 },
          { id: 'blob-work', title: 'Blob', meta: 'from-api', createdAt: 2 },
          { id: 'http-work', title: 'Http', meta: 'from-api', createdAt: 3 },
        ],
      }),
    } as Response)

    const gallery = await readStoredGallery()
    expect(gallery).toMatchObject([
      {
        id: 'data-work',
        title: 'Data',
        meta: 'from-api',
        createdAt: 1,
        src: 'data:image/png;base64,abc',
        assetId: getPrimaryAssetId('data-work'),
        assetStorage: 'inline',
        assetSyncStatus: 'local-only',
        isFavorite: false,
        tags: [],
      },
      {
        id: 'blob-work',
        title: 'Blob',
        meta: 'from-api',
        createdAt: 2,
        src: 'blob:https://example.com/work',
        assetId: getPrimaryAssetId('blob-work'),
        assetStorage: 'blob',
        assetSyncStatus: 'local-only',
        isFavorite: false,
        tags: [],
      },
      {
        id: 'http-work',
        title: 'Http',
        meta: 'from-api',
        createdAt: 3,
        src: 'https://example.com/work.png',
        assetId: getPrimaryAssetId('http-work'),
        assetStorage: 'remote',
        assetSyncStatus: 'pending-sync',
        isFavorite: false,
        tags: [],
      },
    ])
    expect(gallery.every((item) => typeof item.assetUpdatedAt === 'number')).toBe(true)
  })

  it('writes works through replace api', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { success: true, count: 1 } }),
    } as Response)

    await expect(writeStoredGallery([{ id: 'work-1', title: '作品', meta: 'to-api' }])).resolves.toEqual({ success: true, count: 1 })
    expect(fetchMock).toHaveBeenCalledWith('/api/works/replace', expect.objectContaining({
      method: 'PUT',
      credentials: 'include',
    }))
  })

  it('upserts a single work through incremental api and caches src locally', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'work-1', title: '作品', meta: 'to-api', src: 'https://example.com/work.png', tags: ['a'], isFavorite: true } }),
    } as Response)

    await expect(upsertStoredWork({ id: 'work-1', title: '作品', meta: 'to-api', src: 'https://example.com/work.png', tags: ['a'], isFavorite: true })).resolves.toEqual({
      id: 'work-1',
      title: '作品',
      meta: 'to-api',
      src: 'https://example.com/work.png',
      assetId: getPrimaryAssetId('work-1'),
      assetStorage: 'remote',
      assetSyncStatus: 'pending-sync',
      assetRemoteKey: undefined,
      assetRemoteUrl: undefined,
      assetUpdatedAt: undefined,
      tags: ['a'],
      isFavorite: true,
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/works/work-1', expect.objectContaining({
      method: 'PUT',
      credentials: 'include',
    }))
    expect(JSON.parse(window.localStorage.getItem(worksGalleryAssetRecordStorageKey) ?? '{}')).toMatchObject({
      [getPrimaryAssetId('work-1')]: {
        id: getPrimaryAssetId('work-1'),
        workId: 'work-1',
        src: 'https://example.com/work.png',
        storage: 'remote',
        syncStatus: 'pending-sync',
      },
    })
  })

  it('updates favorite through incremental api', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'work-1', title: '作品', meta: 'from-api', isFavorite: true, tags: [] } }),
    } as Response)

    await expect(updateStoredWorkFavorite('work-1', true)).resolves.toEqual({
      id: 'work-1',
      title: '作品',
      meta: 'from-api',
      isFavorite: true,
      tags: [],
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/works/work-1/favorite', expect.objectContaining({
      method: 'PUT',
      credentials: 'include',
    }))
  })

  it('replaces tags for a single work through incremental api', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'work-1', title: '作品', meta: 'from-api', tags: ['a', 'b'], isFavorite: false } }),
    } as Response)

    await expect(replaceStoredWorkTags('work-1', ['a', ' ', 'b', 'a'])).resolves.toEqual({
      id: 'work-1',
      title: '作品',
      meta: 'from-api',
      tags: ['a', 'b'],
      isFavorite: false,
    })
    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))
    expect(body.tags).toEqual(['a', 'b'])
  })

  it('adds and removes tags in batch through incremental api', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { success: true, works: [{ id: 'work-1', title: '作品 1', meta: 'from-api', tags: ['x'], isFavorite: false }] } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { success: true, works: [{ id: 'work-1', title: '作品 1', meta: 'from-api', tags: [], isFavorite: false }] } }),
      } as Response)

    await expect(addTagToStoredWorks(['work-1'], 'x')).resolves.toEqual({
      success: true,
      works: [{ id: 'work-1', title: '作品 1', meta: 'from-api', tags: ['x'], isFavorite: false }],
    })
    await expect(removeTagFromStoredWorks(['work-1'], 'x')).resolves.toEqual({
      success: true,
      works: [{ id: 'work-1', title: '作品 1', meta: 'from-api', tags: [], isFavorite: false }],
    })
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/works/tags/add', expect.objectContaining({ method: 'POST', credentials: 'include' }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/works/tags/remove', expect.objectContaining({ method: 'POST', credentials: 'include' }))
  })

  it('deletes works through incremental api and prunes cached src assets', async () => {
    window.localStorage.setItem(worksGalleryAssetStorageKey, JSON.stringify({
      'work-1': 'https://example.com/work-1.png',
      'work-2': 'https://example.com/work-2.png',
      keep: 'https://example.com/keep.png',
    }))

    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { success: true, count: 1 } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { success: true, count: 1 } }),
      } as Response)

    await expect(deleteStoredWork('work-1')).resolves.toEqual({ success: true, count: 1 })
    await expect(deleteStoredWorks(['work-2'])).resolves.toEqual({ success: true, count: 1 })
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/works/work-1', expect.objectContaining({ method: 'DELETE', credentials: 'include' }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/works/delete', expect.objectContaining({ method: 'POST', credentials: 'include' }))
    expect(JSON.parse(window.localStorage.getItem(worksGalleryAssetRecordStorageKey) ?? '{}')).toMatchObject({
      [getPrimaryAssetId('keep')]: {
        workId: 'keep',
        src: 'https://example.com/keep.png',
      },
    })
  })

  it('restores legacy data url after migration strips oversized inline payload', async () => {
    const largeDataUrl = 'data:image/png;base64,' + 'a'.repeat(900_000)
    window.localStorage.setItem(worksGalleryStorageKey, JSON.stringify([
      { id: 'legacy-1', title: '旧作品', meta: 'legacy', createdAt: 1, src: largeDataUrl },
    ]))

    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { imported: 1, total: 1 } }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'legacy-1', title: '旧作品', meta: 'legacy', createdAt: 1 }] }),
      } as Response)

    await expect(importLegacyWorks()).resolves.toEqual({ imported: 1, total: 1 })
    const migrationBody = JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body))
    expect(migrationBody.works[0].src).toBeUndefined()
    await expect(readStoredGallery()).resolves.toMatchObject([
      {
        id: 'legacy-1',
        title: '旧作品',
        meta: 'legacy',
        createdAt: 1,
        src: largeDataUrl,
        assetId: getPrimaryAssetId('legacy-1'),
        assetStorage: 'inline',
        assetSyncStatus: 'local-only',
        isFavorite: false,
        tags: [],
      },
    ])
  })

  it('only strips oversized data urls when preparing gallery persistence payload', () => {
    const persistedGallery = prepareGalleryForPersistence([
      { id: 'data-work', title: 'Data', meta: 'oversized', src: 'data:image/png;base64,' + 'a'.repeat(5_000) },
      { id: 'blob-work', title: 'Blob', meta: 'keep', src: 'blob:https://example.com/work' },
      { id: 'http-work', title: 'Http', meta: 'keep', src: 'https://example.com/work.png' },
    ], 300)

    expect(persistedGallery[0].src).toBeUndefined()
    expect(persistedGallery[1].src).toBe('blob:https://example.com/work')
    expect(persistedGallery[2].src).toBe('https://example.com/work.png')
  })

  it('hydrates gallery sources with stored fallback src values', () => {
    expect(hydrateGallerySources([
      { id: 'work-1', title: '作品', meta: 'missing-src' },
    ], {
      'work-1': 'https://example.com/work.png',
    })).toMatchObject([
      {
        id: 'work-1',
        title: '作品',
        meta: 'missing-src',
        src: 'https://example.com/work.png',
        assetId: getPrimaryAssetId('work-1'),
        assetStorage: 'remote',
        assetSyncStatus: 'pending-sync',
        isFavorite: false,
        tags: [],
      },
    ])
  })

  it('merges stored asset metadata even when src already exists', () => {
    expect(hydrateGallerySources([
      {
        id: 'work-1',
        title: '作品',
        meta: 'ready',
        src: 'https://example.com/work.png',
      },
    ], {
      [getPrimaryAssetId('work-1')]: {
        id: getPrimaryAssetId('work-1'),
        workId: 'work-1',
        src: 'https://example.com/work.png',
        storage: 'remote',
        syncStatus: 'synced',
        remoteKey: 'asset-key-1',
        remoteUrl: 'https://cdn.example.com/work.png',
        createdAt: 123,
        updatedAt: 456,
      },
    })).toMatchObject([
      {
        id: 'work-1',
        title: '作品',
        meta: 'ready',
        src: 'https://example.com/work.png',
        assetId: getPrimaryAssetId('work-1'),
        assetStorage: 'remote',
        assetSyncStatus: 'synced',
        assetRemoteKey: 'asset-key-1',
        assetRemoteUrl: 'https://cdn.example.com/work.png',
        assetUpdatedAt: 456,
        isFavorite: false,
        tags: [],
      },
    ])
  })

  it('drops inline image data before replace api when payload is too large', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { success: true, count: 1 } }),
    } as Response)

    await expect(writeStoredGallery([{ id: 'work-1', title: '作品', meta: 'to-api', src: 'data:image/png;base64,' + 'a'.repeat(14_100_000) }])).resolves.toEqual({ success: true, count: 1 })
    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))
    expect(body.works[0].src).toBeUndefined()
  })

  it('keeps non-data urls in replace payload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { success: true, count: 1 } }),
    } as Response)

    await expect(writeStoredGallery([{ id: 'work-1', title: '作品', meta: 'to-api', src: 'https://example.com/work.png' }])).resolves.toEqual({ success: true, count: 1 })
    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))
    expect(body.works[0].src).toBe('https://example.com/work.png')
  })
})
