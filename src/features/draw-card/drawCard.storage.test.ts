// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readStoredDrawBatches, writeStoredDrawBatches } from './drawCard.storage'

describe('drawCard.storage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads draw batches from api', async () => {
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
