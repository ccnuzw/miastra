import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { createJsonStoreRepository } from './store.repository'

describe('store.repository json backend', () => {
  const tempDirs: string[] = []

  afterEach(() => {
    while (tempDirs.length) {
      const tempDir = tempDirs.pop()
      if (tempDir) rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('creates a normalized empty store when file is missing', async () => {
    const repo = createJsonStoreRepository({ filePath: '/tmp/miastra-store-test.json' })
    const store = await repo.read()
    expect(store.users).toEqual([])
    expect(store.sessions).toEqual([])
  })

  it('normalizes cloud work fields on read and write', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'miastra-store-'))
    tempDirs.push(dir)
    const filePath = join(dir, 'store.json')

    writeFileSync(filePath, JSON.stringify({
      users: [],
      sessions: [],
      promptTemplates: [],
      works: [
        {
          id: 'work-1',
          userId: 'user-1',
          title: '旧作品',
          meta: 'from-api',
          src: ' https://example.com/work.png ',
          tags: 'a, b，a',
        },
      ],
      providerConfigs: [],
      managedProviders: [],
      drawBatches: [],
      generationTasks: [],
      auditLogs: [],
      quotaProfiles: [],
      billingInvoices: [],
    }))

    const repo = createJsonStoreRepository({ filePath })
    const store = await repo.read()
    expect(store.works[0]).toMatchObject({
      id: 'work-1',
      isFavorite: false,
      src: 'https://example.com/work.png',
      tags: ['a', 'b'],
    })

    await repo.write(store)
    const nextStore = JSON.parse(await readFile(filePath, 'utf8')) as { works: Array<Record<string, unknown>> }
    expect(nextStore.works[0]).toMatchObject({
      isFavorite: false,
      src: 'https://example.com/work.png',
      tags: ['a', 'b'],
    })
  })
})
