import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import { requireAuthenticatedUser } from '../auth/routes'
import { fail, ok } from '../lib/http'
import { getContentDomainStore, getGenerationTaskDomainStore } from '../lib/domain-store'
import { createId } from '../lib/store'
import { cancelGenerationTaskProcessing } from './worker'
import type { StoredGenerationTask } from '../auth/types'
import { storeRepository } from '../lib/store'
import { findStoredProviderConfigByUserId, resolveEffectiveProviderConfig } from '../provider-config/provider.service'
import {
  buildLatestTaskMap,
  canTransitionTaskStatus,
  getTaskBatchId,
  getTaskRootTaskId,
  getTaskRetryAttempt,
  isTerminalTaskStatus,
  sanitizeTask,
  summarizeBatchTasks,
} from './state'

const generationTaskSchema = z.object({
  mode: z.enum(['text2image', 'image2image', 'draw-text2image', 'draw-image2image']),
  title: z.string(),
  meta: z.string(),
  promptText: z.string(),
  workspacePrompt: z.string(),
  requestPrompt: z.string(),
  snapshotId: z.string().optional(),
  size: z.string(),
  quality: z.string(),
  model: z.string(),
  providerId: z.string(),
  stream: z.boolean(),
  referenceImages: z.array(z.object({
    source: z.enum(['upload', 'work']),
    name: z.string(),
    src: z.string(),
    assetId: z.string().optional(),
    assetRemoteKey: z.string().optional(),
  })).optional(),
  tracking: z.object({
    rootTaskId: z.string(),
    parentTaskId: z.string().optional(),
    retryAttempt: z.number(),
    recoverySource: z.enum(['manual']).optional(),
  }).optional(),
  draw: z.object({
    count: z.number(),
    strategy: z.enum(['linear', 'smart', 'turbo']),
    concurrency: z.number(),
    delayMs: z.number(),
    retries: z.number(),
    timeoutSec: z.number(),
    safeMode: z.boolean(),
    variationStrength: z.enum(['low', 'medium', 'high']),
    dimensions: z.array(z.string()),
    batchId: z.string(),
    batchSnapshotId: z.string().optional(),
    drawIndex: z.number(),
    variation: z.string(),
  }).optional(),
})

const generationTaskUpdateSchema = z.object({
  status: z.enum(['pending', 'queued', 'running', 'succeeded', 'failed', 'cancelled', 'timeout']),
  progress: z.number().optional(),
  result: z.object({
    workId: z.string().optional(),
    imageUrl: z.string().optional(),
    meta: z.string().optional(),
    title: z.string().optional(),
    promptText: z.string().optional(),
    promptSnippet: z.string().optional(),
    size: z.string().optional(),
    quality: z.string().optional(),
    providerModel: z.string().optional(),
    snapshotId: z.string().optional(),
    mode: z.enum(['text2image', 'image2image', 'draw-text2image', 'draw-image2image']).optional(),
    batchId: z.string().optional(),
    drawIndex: z.number().optional(),
    variation: z.string().optional(),
    generationSnapshot: z.unknown().optional(),
  }).optional(),
  errorMessage: z.string().optional(),
})

async function syncDrawBatchSnapshot(userId: string, batchId?: string) {
  if (!batchId) return

  const contentStore = getContentDomainStore()
  const existingBatch = await contentStore.findDrawBatchByIdForUser(userId, batchId)
  if (!existingBatch) return

  const tasks = await getGenerationTaskDomainStore().listGenerationTasksByUserId(userId)
  const batchTasks = tasks.filter((task) => getTaskBatchId(task) === batchId)
  const summary = summarizeBatchTasks(batchTasks).get(batchId)

  await contentStore.upsertDrawBatchForUser({
    ...existingBatch,
    count: Math.max(existingBatch.count, summary?.count ?? 0),
    successCount: summary?.successCount ?? 0,
    failedCount: summary?.failedCount ?? 0,
    cancelledCount: summary?.cancelledCount ?? 0,
    interruptedCount: summary?.interruptedCount ?? 0,
    timeoutCount: summary?.timeoutCount ?? 0,
  })
}

export async function registerGenerationTaskRoutes(app: FastifyInstance) {
  app.get('/api/generation-tasks', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const tasks = await getGenerationTaskDomainStore().listGenerationTasksByUserId(user.id)
    const latestTaskMap = buildLatestTaskMap(tasks)
    return ok(tasks.map((task) => sanitizeTask(task, latestTaskMap)))
  })

  app.get('/api/generation-tasks/:id', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '任务 ID 不正确')
    }

    const generationStore = getGenerationTaskDomainStore()
    const task = await generationStore.findGenerationTaskByIdForUser(id.data, user.id)
    if (!task) {
      reply.code(404)
      return fail('TASK_NOT_FOUND', '任务不存在')
    }
    const latestTaskMap = buildLatestTaskMap(await generationStore.listGenerationTasksByUserId(user.id))
    return ok(sanitizeTask(task, latestTaskMap))
  })

  app.post('/api/generation-tasks', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const parsed = generationTaskSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '生成任务数据格式不正确')
    }

    const store = await storeRepository.read()
    const providerConfig = findStoredProviderConfigByUserId(store, user.id)
    const resolvedProvider = resolveEffectiveProviderConfig({ store, config: providerConfig, user })
    if (resolvedProvider.error) {
      reply.code(409)
      return fail(resolvedProvider.error.code, resolvedProvider.error.message)
    }

    const now = new Date().toISOString()
    const taskId = createId()
    await getGenerationTaskDomainStore().insertGenerationTask({
      id: taskId,
      userId: user.id,
      status: 'pending',
      progress: 0,
      createdAt: now,
      updatedAt: now,
      payload: parsed.data as StoredGenerationTask['payload'],
    })

    return ok({ id: taskId, status: 'pending' as const })
  })

  app.post('/api/generation-tasks/:id/cancel', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '任务 ID 不正确')
    }

    const generationStore = getGenerationTaskDomainStore()
    const task = await generationStore.findGenerationTaskByIdForUser(id.data, user.id)
    if (!task) {
      reply.code(404)
      return fail('TASK_NOT_FOUND', '任务不存在')
    }
    if (isTerminalTaskStatus(task.status)) {
      reply.code(409)
      return fail('TASK_NOT_CANCELLABLE', '任务已结束，无法取消')
    }

    await cancelGenerationTaskProcessing(task.id)
    const updatedAt = new Date().toISOString()
    const cancelledTask = await generationStore.updateGenerationTask(task.id, {
      status: 'cancelled',
      errorMessage: task.errorMessage ?? '任务已取消',
      updatedAt,
    })
    await syncDrawBatchSnapshot(user.id, getTaskBatchId(task))

    const tasks = await generationStore.listGenerationTasksByUserId(user.id)
    const latestTaskMap = buildLatestTaskMap(tasks)
    return ok(sanitizeTask(cancelledTask ?? task, latestTaskMap))
  })

  app.post('/api/generation-tasks/:id/retry', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '任务 ID 不正确')
    }

    const generationStore = getGenerationTaskDomainStore()
    const task = await generationStore.findGenerationTaskByIdForUser(id.data, user.id)
    if (!task) {
      reply.code(404)
      return fail('TASK_NOT_FOUND', '任务不存在')
    }

    const userTasks = await generationStore.listGenerationTasksByUserId(user.id)
    const latestTaskMap = buildLatestTaskMap(userTasks)
    if (!sanitizeTask(task, latestTaskMap).retryable) {
      reply.code(409)
      return fail('TASK_NOT_RETRYABLE', '当前任务状态不支持重试，可能已有更新的尝试记录')
    }

    const store = await storeRepository.read()
    const providerConfig = findStoredProviderConfigByUserId(store, user.id)
    const resolvedProvider = resolveEffectiveProviderConfig({ store, config: providerConfig, user })
    if (resolvedProvider.error) {
      reply.code(409)
      return fail(resolvedProvider.error.code, resolvedProvider.error.message)
    }

    const now = new Date().toISOString()
    const nextTaskId = createId()
    const rootTaskId = getTaskRootTaskId(task)
    const retryAttempt = getTaskRetryAttempt(task) + 1
    const payload: StoredGenerationTask['payload'] = {
      ...task.payload,
      tracking: {
        rootTaskId,
        parentTaskId: task.id,
        retryAttempt,
        recoverySource: 'manual',
      },
    }

    await generationStore.insertGenerationTask({
      id: nextTaskId,
      userId: user.id,
      status: 'queued',
      progress: 0,
      createdAt: now,
      updatedAt: now,
      payload,
    })

    await syncDrawBatchSnapshot(user.id, getTaskBatchId(task))

    const tasks = await generationStore.listGenerationTasksByUserId(user.id)
    const retriedTask = tasks.find((item) => item.id === nextTaskId) ?? null
    const nextLatestTaskMap = buildLatestTaskMap(tasks)
    return ok(sanitizeTask(retriedTask ?? {
      id: nextTaskId,
      userId: user.id,
      status: 'queued',
      progress: 0,
      createdAt: now,
      updatedAt: now,
      payload,
    }, nextLatestTaskMap))
  })

  app.post('/api/generation-tasks/:id', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '任务 ID 不正确')
    }

    const parsed = generationTaskUpdateSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '任务更新数据格式不正确')
    }

    const generationStore = getGenerationTaskDomainStore()
    const task = await generationStore.findGenerationTaskByIdForUser(id.data, user.id)
    if (!task) {
      reply.code(404)
      return fail('TASK_NOT_FOUND', '任务不存在')
    }

    if (!canTransitionTaskStatus(task.status, parsed.data.status)) {
      reply.code(409)
      return fail('TASK_INVALID_STATUS_TRANSITION', `任务状态不允许从 ${task.status} 变更为 ${parsed.data.status}`)
    }

    if (parsed.data.status === 'succeeded' && !parsed.data.result && !task.result) {
      reply.code(400)
      return fail('INVALID_INPUT', '任务标记成功时必须携带结果数据')
    }

    const updatedTask = await generationStore.updateGenerationTask(task.id, {
      status: parsed.data.status,
      progress: parsed.data.progress ?? task.progress,
      errorMessage: parsed.data.errorMessage ?? task.errorMessage,
      result: parsed.data.result ?? task.result,
      updatedAt: new Date().toISOString(),
    })

    await syncDrawBatchSnapshot(user.id, getTaskBatchId(task))

    const tasks = await generationStore.listGenerationTasksByUserId(user.id)
    const latestTaskMap = buildLatestTaskMap(tasks)
    return ok(sanitizeTask(updatedTask ?? {
      ...task,
      status: parsed.data.status,
      progress: parsed.data.progress ?? task.progress,
      errorMessage: parsed.data.errorMessage ?? task.errorMessage,
      result: parsed.data.result ?? task.result,
    }, latestTaskMap))
  })
}
