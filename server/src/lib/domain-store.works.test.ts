import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataStore } from '../auth/types'
import { getContentDomainStore } from './domain-store'
import { storeRepository } from './store'

function createEmptyStore(): DataStore {
  return {
    users: [],
    sessions: [],
    promptTemplates: [],
    works: [],
    providerConfigs: [],
    drawBatches: [],
    generationTasks: [],
    auditLogs: [],
    quotaProfiles: [],
    billingInvoices: [],
  }
}

describe('content domain store incremental works mutations', () => {
  const originalBackend = process.env.SERVER_STORE_BACKEND
  let store: DataStore

  beforeEach(() => {
    process.env.SERVER_STORE_BACKEND = 'json'
    store = createEmptyStore()

    vi.spyOn(storeRepository, 'read').mockImplementation(async () => store)
    vi.spyOn(storeRepository, 'write').mockImplementation(async (nextStore) => {
      store = nextStore
    })
    vi.spyOn(storeRepository, 'mutate').mockImplementation(async (updater) => await updater(store))
  })

  afterEach(() => {
    process.env.SERVER_STORE_BACKEND = originalBackend
    vi.restoreAllMocks()
  })

  it('updates favorite and tags for a single work without replacing the full gallery', async () => {
    store.works.push({
      id: 'work-1',
      userId: 'user-1',
      title: '作品 1',
      meta: 'meta',
      isFavorite: false,
      favorite: false,
      tags: ['old'],
    })

    const content = getContentDomainStore()

    await expect(content.updateWorkFavoriteForUser('user-1', 'work-1', true)).resolves.toMatchObject({
      id: 'work-1',
      isFavorite: true,
      favorite: true,
    })
    await expect(content.replaceWorkTagsForUser('user-1', 'work-1', ['x', ' ', 'x', 'y'])).resolves.toMatchObject({
      id: 'work-1',
      tags: ['x', 'y'],
    })
    expect(store.works).toMatchObject([{
      id: 'work-1',
      isFavorite: true,
      favorite: true,
      tags: ['x', 'y'],
    }])
  })

  it('adds/removes batch tags and deletes works only within the current user scope', async () => {
    store.works.push(
      {
        id: 'work-1',
        userId: 'user-1',
        title: '作品 1',
        meta: 'meta',
        tags: ['base'],
      },
      {
        id: 'work-2',
        userId: 'user-1',
        title: '作品 2',
        meta: 'meta',
        tags: ['base', 'remove-me'],
      },
      {
        id: 'work-3',
        userId: 'user-2',
        title: '作品 3',
        meta: 'meta',
        tags: ['base'],
      },
    )

    const content = getContentDomainStore()

    await expect(content.addTagToWorksForUser('user-1', ['work-1', 'work-2', 'work-3'], 'new-tag')).resolves.toMatchObject([
      { id: 'work-1', tags: ['base', 'new-tag'] },
      { id: 'work-2', tags: ['base', 'remove-me', 'new-tag'] },
    ])
    await expect(content.removeTagFromWorksForUser('user-1', ['work-2'], 'remove-me')).resolves.toMatchObject([
      { id: 'work-2', tags: ['base', 'new-tag'] },
    ])
    await expect(content.deleteWorksForUser('user-1', ['work-1', 'work-3'])).resolves.toBe(1)

    expect(store.works).toMatchObject([
      {
        id: 'work-2',
        userId: 'user-1',
        tags: ['base', 'new-tag'],
      },
      {
        id: 'work-3',
        userId: 'user-2',
        tags: ['base'],
      },
    ])
  })
})
