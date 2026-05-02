// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { importLegacyWorks, normalizeGallery, normalizeGalleryImage, readStoredGallery, worksGalleryStorageKey, writeStoredGallery } from './works.storage'

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

  it('normalizes gallery arrays', () => {
    expect(normalizeGallery([])).toEqual([])
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

  it('reads works from api after migration', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { imported: 0, total: 0 } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'work-1', title: '作品', meta: 'from-api', createdAt: 1 }] }),
      } as Response)

    await expect(readStoredGallery()).resolves.toEqual([
      { id: 'work-1', title: '作品', meta: 'from-api', createdAt: 1, isFavorite: false, tags: [] },
    ])
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/works', expect.objectContaining({ credentials: 'include' }))
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
})
