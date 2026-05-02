import { describe, expect, it } from 'vitest'
import { createJsonStoreRepository } from './store.repository'

describe('store.repository json backend', () => {
  it('creates a normalized empty store when file is missing', async () => {
    const repo = createJsonStoreRepository({ filePath: '/tmp/miastra-store-test.json' })
    const store = await repo.read()
    expect(store.users).toEqual([])
    expect(store.sessions).toEqual([])
  })
})
