// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addTagToStoredWorks,
  deleteStoredWork,
  deleteStoredWorks,
  hydrateGallerySources,
  normalizeGallery,
  normalizeGalleryImage,
  prepareGalleryForPersistence,
  readStoredGallery,
  removeTagFromStoredWorks,
  replaceStoredWorkTags,
  updateStoredWorkFavorite,
  upsertStoredWork,
  writeStoredGallery,
  createPrimaryAssetId,
} from './works.storage'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('works.storage', () => {
  it('normalizes cloud work fields', () => {
    const image = normalizeGalleryImage({
      id: '1',
      title: 'test',
      meta: 'meta',
      isFavorite: true,
      tags: ['a', 'a', ' ', 'b'],
    })

    expect(image.isFavorite).toBe(true)
    expect(image.tags).toEqual(['a', 'b'])
  })

  it('normalizes gallery arrays', () => {
    expect(normalizeGallery([])).toEqual([])
  })

  it('reads works from api', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'work-1', title: '作品', meta: 'from-api', createdAt: 1 }] }),
    } as Response)

    await expect(readStoredGallery()).resolves.toEqual([
      { id: 'work-1', title: '作品', meta: 'from-api', createdAt: 1, isFavorite: false, tags: [] },
    ])
    expect(fetchMock).toHaveBeenCalledWith('/api/works', expect.objectContaining({ credentials: 'include' }))
  })

  it('hydrates cloud asset metadata', () => {
    expect(hydrateGallerySources([
      { id: 'work-1', title: '作品', meta: 'missing-src' },
    ], {
      [createPrimaryAssetId('work-1')]: {
        id: createPrimaryAssetId('work-1'),
        workId: 'work-1',
        src: 'https://example.com/work.png',
        storage: 'remote',
        syncStatus: 'synced',
        remoteKey: 'asset-key-1',
        remoteUrl: 'https://example.com/work.png',
        createdAt: 123,
        updatedAt: 456,
      },
    })).toMatchObject([
      {
        id: 'work-1',
        title: '作品',
        meta: 'missing-src',
        src: 'https://example.com/work.png',
        assetId: createPrimaryAssetId('work-1'),
        assetStorage: 'remote',
        assetSyncStatus: 'synced',
        assetRemoteKey: 'asset-key-1',
        assetRemoteUrl: 'https://example.com/work.png',
        assetUpdatedAt: 456,
        isFavorite: false,
        tags: [],
      },
    ])
  })

  it('only strips oversized data urls when preparing gallery persistence payload', () => {
    const persistedGallery = prepareGalleryForPersistence([
      { id: 'data-work', title: 'Data', meta: 'oversized', src: `data:image/png;base64,${'a'.repeat(5_000)}` },
      { id: 'blob-work', title: 'Blob', meta: 'keep', src: 'blob:https://example.com/work' },
      { id: 'http-work', title: 'Http', meta: 'keep', src: 'https://example.com/work.png' },
    ], 300)

    expect(persistedGallery[0].src).toBeUndefined()
    expect(persistedGallery[1].src).toBe('blob:https://example.com/work')
    expect(persistedGallery[2].src).toBe('https://example.com/work.png')
  })

  it('syncs works through incremental cloud APIs', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'stale-1', title: '旧作品', meta: 'old', createdAt: 1 }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'work-1', title: '作品', meta: 'to-api', src: 'https://example.com/work.png', tags: [], isFavorite: false } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { success: true, count: 1 } }),
      } as Response)

    await expect(writeStoredGallery([{ id: 'work-1', title: '作品', meta: 'to-api', src: 'https://example.com/work.png' }])).resolves.toEqual({ success: true, count: 1 })
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/works', expect.objectContaining({ credentials: 'include' }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/works/work-1', expect.objectContaining({ method: 'PUT', credentials: 'include' }))
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/works/delete', expect.objectContaining({ method: 'POST', credentials: 'include' }))
  })

  it('upserts a single work through incremental cloud api', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'work-1', title: '作品', meta: 'to-api', src: 'https://example.com/work.png', tags: ['a'], isFavorite: true } }),
    } as Response)

    await expect(upsertStoredWork({ id: 'work-1', title: '作品', meta: 'to-api', src: 'https://example.com/work.png', tags: ['a'], isFavorite: true })).resolves.toEqual({
      id: 'work-1',
      title: '作品',
      meta: 'to-api',
      src: 'https://example.com/work.png',
      assetId: createPrimaryAssetId('work-1'),
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

  it('deletes works through incremental cloud api', async () => {
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
  })
})
