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

  it('drops inline image data before replace api when payload is too large', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { success: true, count: 1 } }),
    } as Response)

    await expect(writeStoredGallery([{ id: 'work-1', title: '作品', meta: 'to-api', src: 'data:image/png;base64,' + 'a'.repeat(500_000) }])).resolves.toEqual({ success: true, count: 1 })
    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))
    expect(body.works[0].src).toBeUndefined()
  })
})
