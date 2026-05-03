import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DataStore, StoredGenerationTask } from './auth/types'
import { storeRepository } from './lib/store'
import { createServer } from './server'

const emptyStore: DataStore = {
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

async function resetStore() {
  await storeRepository.write(structuredClone(emptyStore))
}

async function registerUser(
  app: Awaited<ReturnType<typeof createServer>>,
  input: { email: string, password: string, nickname: string },
) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: input,
  })

  expect(response.statusCode).toBe(200)
  return {
    cookie: String(response.headers['set-cookie'] ?? ''),
    user: response.json().data as { id: string; email: string; nickname: string },
    credentials: input,
  }
}

async function loginUser(app: Awaited<ReturnType<typeof createServer>>, email: string, password: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password },
  })

  expect(response.statusCode).toBe(200)
  return String(response.headers['set-cookie'] ?? '')
}

async function upsertProviderConfig(userId: string) {
  const store = await storeRepository.read()
  const updatedAt = new Date().toISOString()
  const config = {
    userId,
    providerId: 'openai',
    apiUrl: 'https://example.com/v1',
    model: 'gpt-image-1',
    apiKey: 'test-api-key',
    updatedAt,
  }

  const index = store.providerConfigs.findIndex((item) => item.userId === userId)
  if (index >= 0) {
    store.providerConfigs[index] = config
  } else {
    store.providerConfigs.push(config)
  }

  await storeRepository.write(store)
}

function buildGenerationTaskPayload(overrides: Partial<StoredGenerationTask['payload']> = {}): StoredGenerationTask['payload'] {
  const basePayload: StoredGenerationTask['payload'] = {
    mode: 'text2image',
    title: '发布回归任务',
    meta: '用于验证任务列表状态流转',
    promptText: 'studio portrait',
    workspacePrompt: 'studio portrait workspace',
    requestPrompt: 'studio portrait request',
    size: '1024x1024',
    quality: 'high',
    model: 'gpt-image-1',
    providerId: 'openai',
    stream: false,
  }

  return { ...basePayload, ...overrides }
}

describe('release regression routes', () => {
  beforeEach(async () => {
    await resetStore()
  })

  afterEach(async () => {
    await resetStore()
  })

  it('tracks auth session state across register, revoke-others and logout', async () => {
    const app = await createServer()
    const registered = await registerUser(app, {
      email: 'release-auth@example.com',
      password: '123456',
      nickname: 'release-auth',
    })

    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: registered.cookie },
    })
    expect(meResponse.statusCode).toBe(200)
    expect(meResponse.json()).toMatchObject({
      data: {
        email: 'release-auth@example.com',
        nickname: 'release-auth',
      },
    })

    const secondCookie = await loginUser(app, registered.credentials.email, registered.credentials.password)
    const revokeOthersResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/sessions/revoke-others',
      headers: { cookie: secondCookie },
    })
    expect(revokeOthersResponse.statusCode).toBe(200)
    expect(revokeOthersResponse.json()).toMatchObject({ data: { success: true, revoked: 1 } })

    const sessionsResponse = await app.inject({
      method: 'GET',
      url: '/api/auth/sessions',
      headers: { cookie: secondCookie },
    })
    expect(sessionsResponse.statusCode).toBe(200)
    const sessions = sessionsResponse.json().data as Array<{ current: boolean; revokedAt: string | null }>
    expect(sessions).toHaveLength(2)
    expect(sessions[0]).toMatchObject({ current: true, revokedAt: null })
    expect(sessions[1].current).toBe(false)
    expect(sessions[1].revokedAt).toEqual(expect.any(String))

    const staleSessionResponse = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: registered.cookie },
    })
    expect(staleSessionResponse.statusCode).toBe(200)
    expect(staleSessionResponse.json()).toEqual({ data: null })

    const logoutResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: secondCookie },
    })
    expect(logoutResponse.statusCode).toBe(200)

    const loggedOutMeResponse = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: secondCookie },
    })
    expect(loggedOutMeResponse.statusCode).toBe(200)
    expect(loggedOutMeResponse.json()).toEqual({ data: null })
    await app.close()
  })

  it('guards generation task creation until provider config exists', async () => {
    const app = await createServer()
    const registered = await registerUser(app, {
      email: 'release-task-guard@example.com',
      password: '123456',
      nickname: 'release-task-guard',
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/generation-tasks',
      headers: { cookie: registered.cookie },
      payload: buildGenerationTaskPayload(),
    })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({
      error: {
        code: 'PROVIDER_CONFIG_REQUIRED',
      },
    })
    await app.close()
  })

  it('tracks generation task lifecycle through list, update and terminal cancel guard', async () => {
    const app = await createServer()
    const registered = await registerUser(app, {
      email: 'release-task-flow@example.com',
      password: '123456',
      nickname: 'release-task-flow',
    })
    await upsertProviderConfig(registered.user.id)

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/generation-tasks',
      headers: { cookie: registered.cookie },
      payload: buildGenerationTaskPayload(),
    })

    expect(createResponse.statusCode).toBe(200)
    const taskId = createResponse.json().data.id as string

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/generation-tasks',
      headers: { cookie: registered.cookie },
    })
    expect(listResponse.statusCode).toBe(200)
    expect(listResponse.json()).toMatchObject({
      data: [
        {
          id: taskId,
          status: 'queued',
          progress: 0,
        },
      ],
    })

    const runningResponse = await app.inject({
      method: 'POST',
      url: `/api/generation-tasks/${taskId}`,
      headers: { cookie: registered.cookie },
      payload: {
        status: 'running',
        progress: 35,
      },
    })
    expect(runningResponse.statusCode).toBe(200)
    expect(runningResponse.json()).toMatchObject({
      data: {
        id: taskId,
        status: 'running',
        progress: 35,
      },
    })

    const successResponse = await app.inject({
      method: 'POST',
      url: `/api/generation-tasks/${taskId}`,
      headers: { cookie: registered.cookie },
      payload: {
        status: 'succeeded',
        progress: 100,
        result: {
          workId: 'work-1',
          imageUrl: 'https://example.com/task.png',
          title: '已完成任务',
          meta: 'done',
          promptText: 'studio portrait',
          promptSnippet: 'studio portrait',
          size: '1024x1024',
          quality: 'high',
          providerModel: 'gpt-image-1',
          snapshotId: 'snapshot-1',
          mode: 'text2image',
        },
      },
    })
    expect(successResponse.statusCode).toBe(200)
    expect(successResponse.json()).toMatchObject({
      data: {
        id: taskId,
        status: 'succeeded',
        progress: 100,
        result: {
          workId: 'work-1',
          imageUrl: 'https://example.com/task.png',
          title: '已完成任务',
        },
      },
    })

    const invalidTransitionResponse = await app.inject({
      method: 'POST',
      url: `/api/generation-tasks/${taskId}`,
      headers: { cookie: registered.cookie },
      payload: {
        status: 'running',
        progress: 88,
      },
    })
    expect(invalidTransitionResponse.statusCode).toBe(409)
    expect(invalidTransitionResponse.json()).toMatchObject({
      error: {
        code: 'TASK_INVALID_STATUS_TRANSITION',
      },
    })

    const detailResponse = await app.inject({
      method: 'GET',
      url: `/api/generation-tasks/${taskId}`,
      headers: { cookie: registered.cookie },
    })
    expect(detailResponse.statusCode).toBe(200)
    expect(detailResponse.json()).toMatchObject({
      data: {
        id: taskId,
        status: 'succeeded',
        progress: 100,
        result: {
          workId: 'work-1',
        },
      },
    })

    const freshCookie = await loginUser(app, registered.credentials.email, registered.credentials.password)
    const cancelResponse = await app.inject({
      method: 'POST',
      url: `/api/generation-tasks/${taskId}/cancel`,
      headers: { cookie: freshCookie },
    })
    expect(cancelResponse.statusCode).toBe(409)
    expect(cancelResponse.json()).toMatchObject({
      error: {
        code: 'TASK_NOT_CANCELLABLE',
      },
    })
    await app.close()
  })

  it('keeps retry chains and batch counters consistent with the latest task attempt', async () => {
    const app = await createServer()
    const registered = await registerUser(app, {
      email: 'release-task-retry-chain@example.com',
      password: '123456',
      nickname: 'release-task-retry-chain',
    })
    await upsertProviderConfig(registered.user.id)

    const store = await storeRepository.read()
    store.drawBatches.push({
      id: 'batch-recovery',
      userId: registered.user.id,
      title: '恢复批次',
      createdAt: 1_714_000_000_000,
      strategy: 'smart',
      concurrency: 2,
      count: 2,
      successCount: 0,
      failedCount: 0,
      cancelledCount: 0,
      interruptedCount: 0,
      timeoutCount: 0,
      snapshotId: 'batch-recovery-snapshot',
    })
    store.generationTasks.push(
      {
        id: 'task-slot-a-attempt-1',
        userId: registered.user.id,
        status: 'failed',
        progress: 100,
        createdAt: '2026-05-01T09:00:00.000Z',
        updatedAt: '2026-05-01T09:01:00.000Z',
        errorMessage: '首次失败',
        payload: buildGenerationTaskPayload({
          snapshotId: 'slot-a-snapshot-1',
          draw: {
            count: 2,
            strategy: 'smart',
            concurrency: 2,
            delayMs: 500,
            retries: 1,
            timeoutSec: 90,
            safeMode: true,
            variationStrength: 'medium',
            dimensions: ['portrait'],
            batchId: 'batch-recovery',
            batchSnapshotId: 'batch-recovery-snapshot',
            drawIndex: 0,
            variation: '主视角',
          },
        }),
      },
      {
        id: 'task-slot-a-attempt-2',
        userId: registered.user.id,
        status: 'failed',
        progress: 100,
        createdAt: '2026-05-01T09:02:00.000Z',
        updatedAt: '2026-05-01T09:03:00.000Z',
        errorMessage: '第二次失败',
        payload: buildGenerationTaskPayload({
          snapshotId: 'slot-a-snapshot-2',
          tracking: {
            rootTaskId: 'task-slot-a-attempt-1',
            parentTaskId: 'task-slot-a-attempt-1',
            retryAttempt: 1,
            recoverySource: 'manual',
          },
          draw: {
            count: 2,
            strategy: 'smart',
            concurrency: 2,
            delayMs: 500,
            retries: 1,
            timeoutSec: 90,
            safeMode: true,
            variationStrength: 'medium',
            dimensions: ['portrait'],
            batchId: 'batch-recovery',
            batchSnapshotId: 'batch-recovery-snapshot',
            drawIndex: 0,
            variation: '主视角',
          },
        }),
      },
      {
        id: 'task-slot-b-attempt-1',
        userId: registered.user.id,
        status: 'timeout',
        progress: 100,
        createdAt: '2026-05-01T09:04:00.000Z',
        updatedAt: '2026-05-01T09:05:00.000Z',
        errorMessage: '超时',
        payload: buildGenerationTaskPayload({
          snapshotId: 'slot-b-snapshot-1',
          draw: {
            count: 2,
            strategy: 'smart',
            concurrency: 2,
            delayMs: 500,
            retries: 1,
            timeoutSec: 90,
            safeMode: true,
            variationStrength: 'medium',
            dimensions: ['portrait'],
            batchId: 'batch-recovery',
            batchSnapshotId: 'batch-recovery-snapshot',
            drawIndex: 1,
            variation: '侧视角',
          },
        }),
      },
    )
    await storeRepository.write(store)

    const firstBatchResponse = await app.inject({
      method: 'GET',
      url: '/api/draw-batches',
      headers: { cookie: registered.cookie },
    })
    expect(firstBatchResponse.statusCode).toBe(200)
    expect(firstBatchResponse.json()).toMatchObject({
      data: [
        {
          id: 'batch-recovery',
          count: 2,
          successCount: 0,
          failedCount: 1,
          cancelledCount: 0,
          timeoutCount: 1,
        },
      ],
    })

    const blockedRetryResponse = await app.inject({
      method: 'POST',
      url: '/api/generation-tasks/task-slot-a-attempt-1/retry',
      headers: { cookie: registered.cookie },
    })
    expect(blockedRetryResponse.statusCode).toBe(409)
    expect(blockedRetryResponse.json()).toMatchObject({
      error: {
        code: 'TASK_NOT_RETRYABLE',
      },
    })

    const retryResponse = await app.inject({
      method: 'POST',
      url: '/api/generation-tasks/task-slot-a-attempt-2/retry',
      headers: { cookie: registered.cookie },
    })
    expect(retryResponse.statusCode).toBe(200)
    expect(retryResponse.json()).toMatchObject({
      data: {
        status: 'queued',
        retryAttempt: 2,
        rootTaskId: 'task-slot-a-attempt-1',
        parentTaskId: 'task-slot-a-attempt-2',
      },
    })

    const retriedTaskId = retryResponse.json().data.id as string

    const secondBatchResponse = await app.inject({
      method: 'GET',
      url: '/api/draw-batches',
      headers: { cookie: registered.cookie },
    })
    expect(secondBatchResponse.statusCode).toBe(200)
    expect(secondBatchResponse.json()).toMatchObject({
      data: [
        {
          id: 'batch-recovery',
          count: 2,
          successCount: 0,
          failedCount: 0,
          cancelledCount: 0,
          timeoutCount: 1,
        },
      ],
    })

    const cancelResponse = await app.inject({
      method: 'POST',
      url: `/api/generation-tasks/${retriedTaskId}/cancel`,
      headers: { cookie: registered.cookie },
    })
    expect(cancelResponse.statusCode).toBe(200)
    expect(cancelResponse.json()).toMatchObject({
      data: {
        id: retriedTaskId,
        status: 'cancelled',
      },
    })

    const thirdBatchResponse = await app.inject({
      method: 'GET',
      url: '/api/draw-batches',
      headers: { cookie: registered.cookie },
    })
    expect(thirdBatchResponse.statusCode).toBe(200)
    expect(thirdBatchResponse.json()).toMatchObject({
      data: [
        {
          id: 'batch-recovery',
          count: 2,
          successCount: 0,
          failedCount: 0,
          cancelledCount: 1,
          timeoutCount: 1,
        },
      ],
    })

    const repeatCancelResponse = await app.inject({
      method: 'POST',
      url: `/api/generation-tasks/${retriedTaskId}/cancel`,
      headers: { cookie: registered.cookie },
    })
    expect(repeatCancelResponse.statusCode).toBe(409)
    expect(repeatCancelResponse.json()).toMatchObject({
      error: {
        code: 'TASK_NOT_CANCELLABLE',
      },
    })

    await app.close()
  })

  it('reruns a historical batch from the latest attempt of each slot', async () => {
    const app = await createServer()
    const registered = await registerUser(app, {
      email: 'release-batch-rerun@example.com',
      password: '123456',
      nickname: 'release-batch-rerun',
    })
    await upsertProviderConfig(registered.user.id)

    const store = await storeRepository.read()
    store.drawBatches.push({
      id: 'batch-old',
      userId: registered.user.id,
      title: '历史批次',
      createdAt: 1_713_000_000_000,
      strategy: 'smart',
      concurrency: 2,
      count: 2,
      successCount: 1,
      failedCount: 1,
      cancelledCount: 0,
      interruptedCount: 0,
      timeoutCount: 0,
      snapshotId: 'batch-snapshot-old',
    })
    store.generationTasks.push(
      {
        id: 'task-slot-1-attempt-1',
        userId: registered.user.id,
        status: 'failed',
        progress: 100,
        createdAt: '2026-05-01T10:00:00.000Z',
        updatedAt: '2026-05-01T10:01:00.000Z',
        errorMessage: '首次失败',
        payload: buildGenerationTaskPayload({
          snapshotId: 'snapshot-old-1',
          draw: {
            count: 2,
            strategy: 'smart',
            concurrency: 2,
            delayMs: 500,
            retries: 1,
            timeoutSec: 90,
            safeMode: true,
            variationStrength: 'medium',
            dimensions: ['portrait'],
            batchId: 'batch-old',
            batchSnapshotId: 'batch-snapshot-old',
            drawIndex: 0,
            variation: '主角特写',
          },
        }),
      },
      {
        id: 'task-slot-1-attempt-2',
        userId: registered.user.id,
        status: 'succeeded',
        progress: 100,
        createdAt: '2026-05-01T10:03:00.000Z',
        updatedAt: '2026-05-01T10:04:00.000Z',
        payload: buildGenerationTaskPayload({
          snapshotId: 'snapshot-old-2',
          tracking: {
            rootTaskId: 'task-slot-1-attempt-1',
            parentTaskId: 'task-slot-1-attempt-1',
            retryAttempt: 1,
            recoverySource: 'manual',
          },
          draw: {
            count: 2,
            strategy: 'smart',
            concurrency: 2,
            delayMs: 500,
            retries: 1,
            timeoutSec: 90,
            safeMode: true,
            variationStrength: 'medium',
            dimensions: ['portrait'],
            batchId: 'batch-old',
            batchSnapshotId: 'batch-snapshot-old',
            drawIndex: 0,
            variation: '主角特写',
          },
        }),
        result: {
          imageUrl: 'https://example.com/result-1.png',
          snapshotId: 'result-snapshot-1',
        },
      },
      {
        id: 'task-slot-2-attempt-1',
        userId: registered.user.id,
        status: 'failed',
        progress: 100,
        createdAt: '2026-05-01T10:02:00.000Z',
        updatedAt: '2026-05-01T10:03:00.000Z',
        errorMessage: '第二槽失败',
        payload: buildGenerationTaskPayload({
          snapshotId: 'snapshot-old-3',
          draw: {
            count: 2,
            strategy: 'smart',
            concurrency: 2,
            delayMs: 500,
            retries: 1,
            timeoutSec: 90,
            safeMode: true,
            variationStrength: 'medium',
            dimensions: ['portrait'],
            batchId: 'batch-old',
            batchSnapshotId: 'batch-snapshot-old',
            drawIndex: 1,
            variation: '侧脸构图',
          },
        }),
      },
    )
    await storeRepository.write(store)

    const rerunResponse = await app.inject({
      method: 'POST',
      url: '/api/draw-batches/batch-old/rerun',
      headers: { cookie: registered.cookie },
    })

    expect(rerunResponse.statusCode).toBe(200)
    expect(rerunResponse.json()).toMatchObject({
      data: {
        sourceBatchId: 'batch-old',
        slotCount: 2,
        queuedTaskIds: [expect.any(String), expect.any(String)],
        batch: {
          id: expect.any(String),
          title: '历史批次 · 复跑',
          count: 2,
          strategy: 'smart',
          concurrency: 2,
          snapshotId: expect.any(String),
        },
      },
    })

    const rerunPayload = rerunResponse.json().data as {
      batch: { id: string, snapshotId: string, count: number }
      queuedTaskIds: string[]
      slotCount: number
    }
    const updatedStore = await storeRepository.read()
    const rerunTasks = updatedStore.generationTasks.filter((task) => rerunPayload.queuedTaskIds.includes(task.id))

    expect(updatedStore.drawBatches).toHaveLength(2)
    expect(rerunTasks).toHaveLength(2)
    expect(rerunTasks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        status: 'queued',
        payload: expect.objectContaining({
          snapshotId: expect.any(String),
          draw: expect.objectContaining({
            batchId: rerunPayload.batch.id,
            batchSnapshotId: rerunPayload.batch.snapshotId,
            drawIndex: 0,
          }),
        }),
      }),
      expect.objectContaining({
        status: 'queued',
        payload: expect.objectContaining({
          draw: expect.objectContaining({
            batchId: rerunPayload.batch.id,
            batchSnapshotId: rerunPayload.batch.snapshotId,
            drawIndex: 1,
          }),
        }),
      }),
    ]))
    expect(rerunTasks.find((task) => task.payload.draw?.drawIndex === 0)?.payload.snapshotId).not.toBe('snapshot-old-1')
    expect(rerunTasks.find((task) => task.payload.draw?.drawIndex === 0)?.payload.snapshotId).not.toBe('snapshot-old-2')

    await app.close()
  })

  it('roundtrips legacy work tags, favorites and image sources through migration and list endpoints', async () => {
    const app = await createServer()
    const registered = await registerUser(app, {
      email: 'release-works-legacy@example.com',
      password: '123456',
      nickname: 'release-works-legacy',
    })

    const importResponse = await app.inject({
      method: 'POST',
      url: '/api/migrations/import-local-works',
      headers: { cookie: registered.cookie },
      payload: {
        works: [
          {
            id: 'legacy-work-1',
            title: '旧作品',
            meta: 'legacy-meta',
            src: ' https://example.com/legacy.png ',
            favorite: true,
            tags: 'a, b，a',
          },
        ],
      },
    })

    expect(importResponse.statusCode).toBe(200)
    expect(importResponse.json()).toMatchObject({
      data: {
        imported: 1,
        total: 1,
      },
    })

    const worksResponse = await app.inject({
      method: 'GET',
      url: '/api/works',
      headers: { cookie: registered.cookie },
    })

    expect(worksResponse.statusCode).toBe(200)
    expect(worksResponse.json()).toMatchObject({
      data: [
        {
          id: 'legacy-work-1',
          title: '旧作品',
          src: 'https://example.com/legacy.png',
          isFavorite: true,
          favorite: true,
          tags: ['a', 'b'],
        },
      ],
    })
    await app.close()
  })

  it('keeps template category, tags and recent usage isolated per user', async () => {
    const app = await createServer()
    const firstUser = await registerUser(app, {
      email: 'release-template-a@example.com',
      password: '123456',
      nickname: 'release-template-a',
    })
    const secondUser = await registerUser(app, {
      email: 'release-template-b@example.com',
      password: '123456',
      nickname: 'release-template-b',
    })

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/prompt-templates',
      headers: { cookie: firstUser.cookie },
      payload: {
        id: 'shared-template-id',
        title: '海报模板',
        content: 'luxury poster prompt',
        category: '海报',
        tags: ['产品', '营销', '产品'],
      },
    })
    expect(createResponse.statusCode).toBe(200)
    expect(createResponse.json()).toMatchObject({
      data: {
        id: 'shared-template-id',
        title: '海报模板',
        category: '海报',
        tags: ['产品', '营销'],
      },
    })

    const conflictResponse = await app.inject({
      method: 'POST',
      url: '/api/prompt-templates',
      headers: { cookie: secondUser.cookie },
      payload: {
        id: 'shared-template-id',
        title: '覆盖模板',
        content: 'overwrite attempt',
      },
    })
    expect(conflictResponse.statusCode).toBe(409)
    expect(conflictResponse.json()).toMatchObject({
      error: {
        code: 'INVALID_OPERATION',
        message: '模板 ID 已被占用',
      },
    })

    const markUsedResponse = await app.inject({
      method: 'POST',
      url: '/api/prompt-templates/shared-template-id/use',
      headers: { cookie: firstUser.cookie },
    })
    expect(markUsedResponse.statusCode).toBe(200)
    expect(markUsedResponse.json().data.lastUsedAt).toEqual(expect.any(String))

    const firstUserListResponse = await app.inject({
      method: 'GET',
      url: '/api/prompt-templates',
      headers: { cookie: firstUser.cookie },
    })
    expect(firstUserListResponse.statusCode).toBe(200)
    expect(firstUserListResponse.json()).toMatchObject({
      data: [
        {
          id: 'shared-template-id',
          title: '海报模板',
          category: '海报',
          tags: ['产品', '营销'],
          lastUsedAt: expect.any(String),
        },
      ],
    })

    const secondUserListResponse = await app.inject({
      method: 'GET',
      url: '/api/prompt-templates',
      headers: { cookie: secondUser.cookie },
    })
    expect(secondUserListResponse.statusCode).toBe(200)
    expect(secondUserListResponse.json()).toEqual({ data: [] })
    await app.close()
  })
})
