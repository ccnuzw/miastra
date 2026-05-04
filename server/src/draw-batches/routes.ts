import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import { requireAuthenticatedUser } from '../auth/routes'
import type { StoredGenerationTask } from '../auth/types'
import { fail, ok } from '../lib/http'
import { getContentDomainStore, getGenerationTaskDomainStore } from '../lib/domain-store'
import { createId, storeRepository } from '../lib/store'
import type { StoredDrawBatch } from '../auth/types'
import { getTaskBatchId, getTaskRootTaskId, sortTaskAttemptsDesc, summarizeBatchTasks } from '../generation-tasks/state'
import { findStoredProviderConfigByUserId, resolveEffectiveProviderConfig } from '../provider-config/provider.service'

const drawBatchSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number(),
  strategy: z.enum(['linear', 'smart', 'turbo']),
  concurrency: z.number(),
  count: z.number(),
  successCount: z.number(),
  failedCount: z.number(),
  cancelledCount: z.number().optional(),
  interruptedCount: z.number().optional(),
  timeoutCount: z.number().optional(),
  snapshotId: z.string(),
})

const replaceDrawBatchesSchema = z.object({
  batches: z.array(drawBatchSchema),
})

function getBatchSlotKey(task: StoredGenerationTask) {
  return String(task.payload.draw?.drawIndex ?? getTaskRootTaskId(task))
}

function toTaskTimestamp(value: string) {
  return Number(new Date(value))
}

export async function registerDrawBatchRoutes(app: FastifyInstance) {
  app.get('/api/draw-batches', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const contentStore = getContentDomainStore()
    const generationStore = getGenerationTaskDomainStore()
    const [batches, tasks] = await Promise.all([
      contentStore.listDrawBatchesByUserId(user.id),
      generationStore.listGenerationTasksByUserId(user.id),
    ])

    const batchSummaries = summarizeBatchTasks(tasks)
    return ok(batches.map(({ userId, ...batch }) => {
      const summary = batchSummaries.get(batch.id)
      if (!summary) return batch
      return {
        ...batch,
        count: Math.max(batch.count, summary.count),
        successCount: summary.successCount,
        failedCount: summary.failedCount,
        cancelledCount: summary.cancelledCount,
        interruptedCount: summary.interruptedCount,
        timeoutCount: summary.timeoutCount,
      }
    }))
  })

  app.put('/api/draw-batches/replace', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const parsed = replaceDrawBatchesSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '抽卡批次数据格式不正确')
    }

    const nextBatches: StoredDrawBatch[] = parsed.data.batches.map((batch) => ({
      id: batch.id,
      userId: user.id,
      title: batch.title,
      createdAt: batch.createdAt,
      strategy: batch.strategy,
      concurrency: batch.concurrency,
      count: batch.count,
      successCount: batch.successCount,
      failedCount: batch.failedCount,
      cancelledCount: batch.cancelledCount ?? 0,
      interruptedCount: batch.interruptedCount ?? 0,
      timeoutCount: batch.timeoutCount ?? 0,
      snapshotId: batch.snapshotId,
    }))

    await getContentDomainStore().replaceDrawBatchesByUserId(user.id, nextBatches)
    return ok({ success: true, count: parsed.data.batches.length })
  })

  app.post('/api/draw-batches/:id/rerun', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '批次 ID 不正确')
    }

    const contentStore = getContentDomainStore()
    const generationStore = getGenerationTaskDomainStore()
    const batch = await contentStore.findDrawBatchByIdForUser(user.id, id.data)
    if (!batch) {
      reply.code(404)
      return fail('BATCH_NOT_FOUND', '批次不存在')
    }

    const store = await storeRepository.read()
    const providerConfig = findStoredProviderConfigByUserId(store, user.id)
    const resolvedProvider = resolveEffectiveProviderConfig({ store, config: providerConfig, user })
    if (resolvedProvider.error) {
      reply.code(409)
      return fail(resolvedProvider.error.code, resolvedProvider.error.message)
    }

    const batchTasks = (await generationStore.listGenerationTasksByUserId(user.id))
      .filter((task) => getTaskBatchId(task) === batch.id)

    if (!batchTasks.length) {
      reply.code(409)
      return fail('BATCH_TASKS_NOT_FOUND', '该批次没有可复跑的任务记录')
    }

    const slotTaskMap = new Map<string, StoredGenerationTask[]>()
    for (const task of batchTasks) {
      const slotKey = getBatchSlotKey(task)
      slotTaskMap.set(slotKey, [...(slotTaskMap.get(slotKey) ?? []), task])
    }

    const latestTasks = [...slotTaskMap.values()]
      .map((tasks) => [...tasks].sort(sortTaskAttemptsDesc)[0])
      .sort((left, right) => {
        const leftIndex = left.payload.draw?.drawIndex ?? Number.MAX_SAFE_INTEGER
        const rightIndex = right.payload.draw?.drawIndex ?? Number.MAX_SAFE_INTEGER
        if (leftIndex !== rightIndex) return leftIndex - rightIndex
        return toTaskTimestamp(left.createdAt) - toTaskTimestamp(right.createdAt)
      })

    const nextBatchId = createId()
    const nextBatchSnapshotId = createId()
    const createdAt = Date.now()
    const createdAtIso = new Date(createdAt).toISOString()
    const rerunBatch: StoredDrawBatch = {
      id: nextBatchId,
      userId: user.id,
      title: `${batch.title} · 复跑`,
      createdAt,
      strategy: batch.strategy,
      concurrency: batch.concurrency,
      count: latestTasks.length,
      successCount: 0,
      failedCount: 0,
      cancelledCount: 0,
      interruptedCount: 0,
      timeoutCount: 0,
      snapshotId: nextBatchSnapshotId,
    }

    await contentStore.upsertDrawBatchForUser(rerunBatch)

    const queuedTaskIds: string[] = []
    for (const sourceTask of latestTasks) {
      const nextTaskId = createId()
      queuedTaskIds.push(nextTaskId)
      await generationStore.insertGenerationTask({
        id: nextTaskId,
        userId: user.id,
        status: 'queued',
        progress: 0,
        createdAt: createdAtIso,
        updatedAt: createdAtIso,
        payload: {
          ...sourceTask.payload,
          snapshotId: createId(),
          draw: sourceTask.payload.draw ? {
            ...sourceTask.payload.draw,
            batchId: nextBatchId,
            batchSnapshotId: nextBatchSnapshotId,
          } : undefined,
          tracking: undefined,
        },
      })
    }

    return ok({
      batch: {
        id: rerunBatch.id,
        title: rerunBatch.title,
        createdAt: rerunBatch.createdAt,
        strategy: rerunBatch.strategy,
        concurrency: rerunBatch.concurrency,
        count: rerunBatch.count,
        successCount: rerunBatch.successCount,
        failedCount: rerunBatch.failedCount,
        cancelledCount: rerunBatch.cancelledCount,
        interruptedCount: rerunBatch.interruptedCount,
        timeoutCount: rerunBatch.timeoutCount,
        snapshotId: rerunBatch.snapshotId,
      },
      sourceBatchId: batch.id,
      queuedTaskIds,
      slotCount: latestTasks.length,
    })
  })
}
