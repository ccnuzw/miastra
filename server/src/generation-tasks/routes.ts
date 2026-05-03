import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import { requireAuthenticatedUser } from '../auth/routes'
import { fail, ok } from '../lib/http'
import { getAuthDomainStore, getGenerationTaskDomainStore } from '../lib/domain-store'
import { createId, storeRepository } from '../lib/store'
import { cancelGenerationTaskProcessing } from './worker'
import type { StoredGenerationTask } from '../auth/types'

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
  })).optional(),
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

function sanitizeTask(task: StoredGenerationTask) {
  return {
    ...task,
    payload: {
      ...task.payload,
    },
  }
}

export async function registerGenerationTaskRoutes(app: FastifyInstance) {
  app.get('/api/generation-tasks', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const store = await storeRepository.read()
    const tasks = store.generationTasks.filter((item) => item.userId === user.id).sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
    return ok(tasks.map(sanitizeTask))
  })

  app.get('/api/generation-tasks/:id', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '任务 ID 不正确')
    }

    const store = await storeRepository.read()
    const task = store.generationTasks.find((item) => item.id === id.data && item.userId === user.id) ?? null
    if (!task) {
      reply.code(404)
      return fail('TASK_NOT_FOUND', '任务不存在')
    }
    return ok(sanitizeTask(task))
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
    const providerConfig = store.providerConfigs.find((item) => item.userId === user.id) ?? null
    if (!providerConfig?.apiKey.trim()) {
      reply.code(409)
      return fail('PROVIDER_CONFIG_REQUIRED', '请先在设置中保存 Provider API Key 后再提交任务')
    }

    const now = new Date().toISOString()
    const taskId = createId()
    await getGenerationTaskDomainStore().insertGenerationTask({
      id: taskId,
      userId: user.id,
      status: 'queued',
      progress: 0,
      createdAt: now,
      updatedAt: now,
      payload: parsed.data as StoredGenerationTask['payload'],
    })

    return ok({ id: taskId, status: 'queued' as const })
  })

  app.post('/api/generation-tasks/:id/cancel', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '任务 ID 不正确')
    }

    const store = await storeRepository.read()
    const task = store.generationTasks.find((item) => item.id === id.data && item.userId === user.id) ?? null
    if (!task) {
      reply.code(404)
      return fail('TASK_NOT_FOUND', '任务不存在')
    }
    if (task.status === 'succeeded' || task.status === 'failed' || task.status === 'timeout') {
      reply.code(409)
      return fail('TASK_NOT_CANCELLABLE', '任务已结束，无法取消')
    }

    await cancelGenerationTaskProcessing(task.id)
    const latestTask = (await storeRepository.read()).generationTasks.find((item) => item.id === task.id && item.userId === user.id) ?? null
    return ok(sanitizeTask(latestTask ?? task))
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

    const store = await storeRepository.read()
    const task = store.generationTasks.find((item) => item.id === id.data && item.userId === user.id) ?? null
    if (!task) {
      reply.code(404)
      return fail('TASK_NOT_FOUND', '任务不存在')
    }

    const mutableTask = store.generationTasks.find((item) => item.id === id.data && item.userId === user.id)
    if (!mutableTask) {
      reply.code(404)
      return fail('TASK_NOT_FOUND', '任务不存在')
    }
    mutableTask.status = parsed.data.status
    mutableTask.progress = parsed.data.progress ?? mutableTask.progress
    mutableTask.errorMessage = parsed.data.errorMessage
    mutableTask.updatedAt = new Date().toISOString()
    mutableTask.result = parsed.data.result ?? mutableTask.result
    await storeRepository.write(store)
    return ok(sanitizeTask(mutableTask))
  })
}
