// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { drawBatchesStorageKey, importLegacyDrawBatches, readStoredDrawBatches, writeStoredDrawBatches } from './drawCard.storage'

describe('drawCard.storage', () => {
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

  it('imports legacy local draw batches through migration api and clears local cache', async () => {
    window.localStorage.setItem(drawBatchesStorageKey, JSON.stringify([
      {
        id: 'batch-1',
        title: '旧批次',
        createdAt: 1,
        strategy: 'smart',
        concurrency: 4,
        count: 5,
        successCount: 3,
        failedCount: 2,
        cancelledCount: 0,
        interruptedCount: 0,
        timeoutCount: 0,
        snapshotId: 'snapshot-1',
      },
    ]))

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { imported: 1, total: 1 } }),
    } as Response)

    await expect(importLegacyDrawBatches()).resolves.toEqual({ imported: 1, total: 1 })
    expect(fetchMock).toHaveBeenCalledWith('/api/migrations/import-local-draw-batches', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }))
    expect(window.localStorage.getItem(drawBatchesStorageKey)).toBeNull()
  })

  it('reads draw batches from api when no legacy cache exists', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'batch-1', title: '批次', createdAt: 1, strategy: 'smart', concurrency: 4, count: 5, successCount: 3, failedCount: 2, cancelledCount: 0, interruptedCount: 0, timeoutCount: 0, snapshotId: 'snapshot-1' }] }),
    } as Response)

    await expect(readStoredDrawBatches()).resolves.toEqual([
      { id: 'batch-1', title: '批次', createdAt: 1, strategy: 'smart', concurrency: 4, count: 5, successCount: 3, failedCount: 2, cancelledCount: 0, interruptedCount: 0, timeoutCount: 0, snapshotId: 'snapshot-1' },
    ])
    expect(fetchMock).toHaveBeenCalledWith('/api/draw-batches', expect.objectContaining({ credentials: 'include' }))
  })

  it('writes draw batches through replace api', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { success: true, count: 1 } }),
    } as Response)

    await expect(writeStoredDrawBatches([{ id: 'batch-1', title: '批次', createdAt: 1, strategy: 'smart', concurrency: 4, count: 5, successCount: 3, failedCount: 2, cancelledCount: 0, interruptedCount: 0, timeoutCount: 0, snapshotId: 'snapshot-1' }])).resolves.toEqual({ success: true, count: 1 })
    expect(fetchMock).toHaveBeenCalledWith('/api/draw-batches/replace', expect.objectContaining({
      method: 'PUT',
      credentials: 'include',
    }))
  })
})
