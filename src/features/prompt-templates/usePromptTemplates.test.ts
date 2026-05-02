// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { importLegacyPromptTemplates, normalizeTemplate, normalizeTemplates, promptTemplatesStorageKey } from './usePromptTemplates'

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

describe('usePromptTemplates storage helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('normalizes template title and timestamps', () => {
    const normalized = normalizeTemplate({
      id: 'template-1',
      name: '  测试模板  ',
      content: 'prompt',
      createdAt: 1,
    })

    expect(normalized.title).toBe('测试模板')
    expect(normalized.updatedAt).toBe(1)
  })

  it('sorts templates by updated time desc', () => {
    const normalized = normalizeTemplates([
      { id: 'a', title: 'A', content: 'a', createdAt: 1, updatedAt: 1 },
      { id: 'b', title: 'B', content: 'b', createdAt: 2, updatedAt: 3 },
    ])

    expect(normalized.map((item) => item.id)).toEqual(['b', 'a'])
  })

  it('imports legacy local templates through migration api and clears local cache', async () => {
    window.localStorage.setItem(promptTemplatesStorageKey, JSON.stringify([
      { id: 'legacy-1', title: '旧模板', content: 'legacy prompt', createdAt: 1, updatedAt: 2 },
    ]))

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { imported: 1, total: 1 } }),
    } as Response)

    await expect(importLegacyPromptTemplates()).resolves.toEqual({ imported: 1, total: 1 })
    expect(fetchMock).toHaveBeenCalledWith('/api/migrations/import-local-templates', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }))
    expect(window.localStorage.getItem(promptTemplatesStorageKey)).toBeNull()
  })

  it('skips migration when no legacy templates exist', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await expect(importLegacyPromptTemplates()).resolves.toEqual({ imported: 0, total: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
