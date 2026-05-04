import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataStore, StoredGenerationTask } from '../auth/types'
import { getGenerationTaskDomainStore } from '../lib/domain-store'
import { storeRepository } from '../lib/store'

const emptyStore: DataStore = {
  users: [],
  sessions: [],
  promptTemplates: [],
  works: [],
  providerConfigs: [],
  managedProviders: [],
  drawBatches: [],
  generationTasks: [],
  auditLogs: [],
  quotaProfiles: [],
  billingInvoices: [],
}

async function resetStore() {
  await storeRepository.write(structuredClone(emptyStore))
}

function buildGenerationTask(overrides: Partial<StoredGenerationTask> = {}): StoredGenerationTask {
  return {
    id: 'worker-task-1',
    userId: 'user-1',
    status: 'queued',
    progress: 0,
    createdAt: '2026-05-03T10:00:00.000Z',
    updatedAt: '2026-05-03T10:00:00.000Z',
    payload: {
      mode: 'text2image',
      title: 'Worker 任务',
      meta: '自动执行验证',
      promptText: 'studio portrait',
      workspacePrompt: 'studio portrait workspace',
      requestPrompt: 'studio portrait request',
      snapshotId: 'snapshot-worker-1',
      size: '1024x1024',
      quality: 'high',
      model: 'gpt-image-1',
      providerId: 'openai',
      stream: false,
    },
    ...overrides,
  }
}

async function waitFor(predicate: () => Promise<boolean>, timeoutMs = 1500) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  throw new Error('Timed out waiting for worker state')
}

describe('generation task worker', () => {
  const originalInterval = process.env.GENERATION_WORKER_INTERVAL_MS

  beforeEach(async () => {
    process.env.GENERATION_WORKER_INTERVAL_MS = '25'
    await resetStore()
    vi.resetModules()
  })

  afterEach(async () => {
    const worker = await import('./worker')
    await worker.stopGenerationTaskWorker()
    vi.restoreAllMocks()
    await resetStore()
    process.env.GENERATION_WORKER_INTERVAL_MS = originalInterval
  })

  it('executes queued tasks and inserts works', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [{ url: 'https://example.com/generated.png' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const store = await storeRepository.read()
    store.users.push({
      id: 'user-1',
      email: 'worker@example.com',
      nickname: 'worker',
      role: 'user',
      passwordHash: 'hash',
      createdAt: '2026-05-03T10:00:00.000Z',
      updatedAt: '2026-05-03T10:00:00.000Z',
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    })
    store.providerConfigs.push({
      userId: 'user-1',
      mode: 'custom',
      providerId: 'custom',
      managedProviderId: undefined,
      apiUrl: 'https://example.com/v1',
      model: 'gpt-image-1',
      apiKey: 'test-key',
      updatedAt: '2026-05-03T10:00:00.000Z',
    })
    store.generationTasks.push(buildGenerationTask())
    await storeRepository.write(store)

    const worker = await import('./worker')
    worker.startGenerationTaskWorker()

    await waitFor(async () => {
      const latest = await storeRepository.read()
      return latest.generationTasks[0]?.status === 'succeeded' && latest.works.length === 1
    })

    const latest = await storeRepository.read()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(latest.generationTasks[0]).toMatchObject({
      status: 'succeeded',
      progress: 100,
      result: {
        imageUrl: 'https://example.com/generated.png',
        title: 'Worker 任务',
      },
    })
    expect(latest.works[0]).toMatchObject({
      title: 'Worker 任务',
      src: 'https://example.com/generated.png',
      promptText: 'studio portrait request',
      mode: 'text2image',
    })
  })

  it('keeps terminal tasks immutable when a late completion arrives', async () => {
    const store = await storeRepository.read()
    store.users.push({
      id: 'user-1',
      email: 'worker@example.com',
      nickname: 'worker',
      role: 'user',
      passwordHash: 'hash',
      createdAt: '2026-05-03T10:00:00.000Z',
      updatedAt: '2026-05-03T10:00:00.000Z',
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    })
    store.generationTasks.push(buildGenerationTask({ status: 'cancelled', progress: 100 }))
    await storeRepository.write(store)

    const generationStore = getGenerationTaskDomainStore()
    const updated = await generationStore.updateGenerationTask('worker-task-1', {
      status: 'succeeded',
      progress: 100,
      result: {
        workId: 'work-late',
        imageUrl: 'https://example.com/late.png',
      },
    })
    expect(updated).toMatchObject({
      status: 'cancelled',
      progress: 100,
    })

    const applied = await generationStore.completeGenerationTaskAndInsertWork('worker-task-1', {
      status: 'succeeded',
      progress: 100,
      updatedAt: '2026-05-03T10:10:00.000Z',
      result: {
        workId: 'work-late',
        imageUrl: 'https://example.com/late.png',
      },
    }, {
      id: 'work-late',
      userId: 'user-1',
      title: 'Worker 任务',
      src: 'https://example.com/late.png',
      meta: '自动执行验证',
      createdAt: 0,
      isFavorite: false,
      tags: [],
    })

    expect(applied).toBe(false)

    const latest = await storeRepository.read()
    expect(latest.generationTasks[0]).toMatchObject({
      status: 'cancelled',
      progress: 100,
    })
    expect(latest.generationTasks[0].result).toBeUndefined()
    expect(latest.works).toHaveLength(0)
  })
})
