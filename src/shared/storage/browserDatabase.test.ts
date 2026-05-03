// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { deleteBrowserValue, readBrowserValue, writeBrowserValue } from './browserDatabase'

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

describe('browserDatabase', () => {
  it('falls back to localStorage when indexeddb is unavailable', async () => {
    const key = 'test-key'
    await writeBrowserValue(key, { hello: 'world' })
    await expect(readBrowserValue(key, null)).resolves.toEqual({ hello: 'world' })
    await deleteBrowserValue(key)
    await expect(readBrowserValue(key, null)).resolves.toBeNull()
  })
})
