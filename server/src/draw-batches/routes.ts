import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import { requireAuthenticatedUser } from '../auth/routes'
import { fail, ok } from '../lib/http'
import { getContentDomainStore } from '../lib/domain-store'
import type { StoredDrawBatch } from '../auth/types'

const drawBatchSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number(),
  strategy: z.enum(['linear', 'smart', 'turbo']),
  concurrency: z.number(),
  count: z.number(),
  successCount: z.number(),
  failedCount: z.number(),
  snapshotId: z.string(),
})

const replaceDrawBatchesSchema = z.object({
  batches: z.array(drawBatchSchema),
})

export async function registerDrawBatchRoutes(app: FastifyInstance) {
  app.get('/api/draw-batches', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const batches = await getContentDomainStore().listDrawBatchesByUserId(user.id)
    return ok(batches.map(({ userId, ...batch }) => batch))
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
      snapshotId: batch.snapshotId,
    }))

    await getContentDomainStore().replaceDrawBatchesByUserId(user.id, nextBatches)
    return ok({ success: true, count: parsed.data.batches.length })
  })
}
