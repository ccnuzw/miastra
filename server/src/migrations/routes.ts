import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import { requireAuthenticatedUser } from '../auth/routes'
import { storeRepository } from '../lib/store'
import { fail, ok } from '../lib/http'
import type { StoredDrawBatch, StoredPromptTemplate, StoredWork } from '../auth/types'

const templateSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  name: z.string().optional(),
  content: z.string(),
  createdAt: z.union([z.string(), z.number()]),
  updatedAt: z.union([z.string(), z.number()]).optional(),
})

const workSchema = z.object({
  id: z.string(),
  title: z.string(),
  src: z.string().optional(),
  meta: z.string(),
  variation: z.string().optional(),
  batchId: z.string().optional(),
  drawIndex: z.number().optional(),
  taskStatus: z.enum(['pending', 'running', 'receiving', 'success', 'failed', 'retrying', 'cancelled']).optional(),
  error: z.string().optional(),
  retryable: z.boolean().optional(),
  retryCount: z.number().optional(),
  createdAt: z.number().optional(),
  mode: z.enum(['text2image', 'image2image', 'draw-text2image', 'draw-image2image']).optional(),
  providerModel: z.string().optional(),
  size: z.string().optional(),
  quality: z.string().optional(),
  snapshotId: z.string().optional(),
  generationSnapshot: z.unknown().optional(),
  promptSnippet: z.string().optional(),
  promptText: z.string().optional(),
  isFavorite: z.boolean().optional(),
  favorite: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
})

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

export async function registerMigrationRoutes(app: FastifyInstance) {
  app.post('/api/migrations/import-local-templates', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const parsed = z.object({ templates: z.array(templateSchema) }).safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '本地模板数据格式不正确')
    }

    const store = await storeRepository.read()
    const existingIds = new Set(store.promptTemplates.filter((item) => item.userId === user.id).map((item) => item.id))
    let imported = 0

    for (const template of parsed.data.templates) {
      if (existingIds.has(template.id)) continue
      const nextTemplate: StoredPromptTemplate = {
        id: template.id,
        userId: user.id,
        title: template.title ?? template.name ?? '未命名模板',
        name: template.title ?? template.name ?? '未命名模板',
        content: template.content,
        createdAt: typeof template.createdAt === 'number' ? new Date(template.createdAt).toISOString() : template.createdAt,
        updatedAt: template.updatedAt
          ? typeof template.updatedAt === 'number' ? new Date(template.updatedAt).toISOString() : template.updatedAt
          : typeof template.createdAt === 'number' ? new Date(template.createdAt).toISOString() : template.createdAt,
      }
      store.promptTemplates.push(nextTemplate)
      imported += 1
    }

    await storeRepository.write(store)
    return ok({ imported, total: parsed.data.templates.length })
  })

  app.post('/api/migrations/import-local-works', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const parsed = z.object({ works: z.array(workSchema) }).safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '本地作品数据格式不正确')
    }

    const store = await storeRepository.read()
    const existingIds = new Set(store.works.filter((item) => item.userId === user.id).map((item) => item.id))
    let imported = 0

    for (const work of parsed.data.works) {
      if (existingIds.has(work.id)) continue
      const nextWork: StoredWork = {
        id: work.id,
        userId: user.id,
        title: work.title,
        src: work.src,
        meta: work.meta,
        variation: work.variation,
        batchId: work.batchId,
        drawIndex: work.drawIndex,
        taskStatus: work.taskStatus,
        error: work.error,
        retryable: work.retryable,
        retryCount: work.retryCount,
        createdAt: work.createdAt,
        mode: work.mode,
        providerModel: work.providerModel,
        size: work.size,
        quality: work.quality,
        snapshotId: work.snapshotId,
        generationSnapshot: work.generationSnapshot,
        promptSnippet: work.promptSnippet,
        promptText: work.promptText,
        isFavorite: work.isFavorite,
        favorite: work.favorite,
        tags: work.tags,
      }
      store.works.push(nextWork)
      imported += 1
    }

    await storeRepository.write(store)
    return ok({ imported, total: parsed.data.works.length })
  })

  app.post('/api/migrations/import-local-draw-batches', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const parsed = z.object({ batches: z.array(drawBatchSchema) }).safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '本地抽卡批次数据格式不正确')
    }

    const store = await storeRepository.read()
    const existingIds = new Set(store.drawBatches.filter((item) => item.userId === user.id).map((item) => item.id))
    let imported = 0

    for (const batch of parsed.data.batches) {
      if (existingIds.has(batch.id)) continue
      const nextBatch: StoredDrawBatch = {
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
      }
      store.drawBatches.push(nextBatch)
      imported += 1
    }

    await storeRepository.write(store)
    return ok({ imported, total: parsed.data.batches.length })
  })
}
