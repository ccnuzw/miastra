import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { StoredWork } from '../auth/types'
import { requireAuthenticatedUser } from '../auth/routes'
import { getContentDomainStore } from '../lib/domain-store'
import { fail, ok } from '../lib/http'

const workTaskStatusSchema = z.enum(['pending', 'running', 'receiving', 'success', 'failed', 'retrying', 'cancelled', 'timeout', 'interrupted'])

const workSchema = z.object({
  id: z.string(),
  title: z.string(),
  src: z.string().optional(),
  assetId: z.string().optional(),
  assetStorage: z.enum(['inline', 'blob', 'remote']).optional(),
  assetSyncStatus: z.enum(['local-only', 'pending-sync', 'synced']).optional(),
  assetRemoteKey: z.string().optional(),
  assetRemoteUrl: z.string().optional(),
  assetUpdatedAt: z.number().optional(),
  meta: z.string(),
  variation: z.string().optional(),
  batchId: z.string().optional(),
  drawIndex: z.number().optional(),
  taskStatus: workTaskStatusSchema.optional(),
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
  tags: z.union([z.array(z.string()), z.string()]).optional(),
})

const worksReplaceSchema = z.object({
  works: z.array(workSchema),
})

const favoriteSchema = z.object({
  isFavorite: z.boolean(),
})

const workTagsSchema = z.object({
  tags: z.array(z.string()),
})

const workDeleteBatchSchema = z.object({
  ids: z.array(z.string()).min(1),
})

const workBatchTagSchema = z.object({
  ids: z.array(z.string()).min(1),
  tag: z.string().trim().min(1),
})

function normalizeTags(tags: string[] | string | undefined): string[] {
  const values = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
      ? tags.split(/[,，\n]/)
      : []
  return Array.from(new Set(values.map((tag) => tag.trim()).filter(Boolean)))
}

function toStoredWork(userId: string, work: z.infer<typeof workSchema>): StoredWork {
  const isFavorite = Boolean(work.isFavorite ?? work.favorite)
  return {
    id: work.id,
    userId,
    title: work.title,
    src: work.src,
    assetId: work.assetId,
    assetStorage: work.assetStorage,
    assetSyncStatus: work.assetSyncStatus,
    assetRemoteKey: work.assetRemoteKey,
    assetRemoteUrl: work.assetRemoteUrl,
    assetUpdatedAt: work.assetUpdatedAt,
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
    isFavorite,
    favorite: isFavorite,
    tags: normalizeTags(work.tags),
  }
}

function stripUserId(work: StoredWork) {
  const { userId, ...payload } = work
  return payload
}

export async function registerWorksRoutes(app: FastifyInstance) {
  app.get('/api/works', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const works = await getContentDomainStore().listWorksByUserId(user.id)
    return ok(works.map(stripUserId))
  })

  app.put('/api/works/replace', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const parsed = worksReplaceSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '作品数据格式不正确')
    }

    const nextWorks = parsed.data.works.map((work) => toStoredWork(user.id, work))
    await getContentDomainStore().replaceWorksByUserId(user.id, nextWorks)
    return ok({ success: true, count: parsed.data.works.length })
  })

  app.put('/api/works/:id', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const params = z.object({ id: z.string() }).safeParse(request.params)
    const parsed = workSchema.safeParse(request.body)
    if (!params.success || !parsed.success || params.data.id !== parsed.data.id) {
      reply.code(400)
      return fail('INVALID_INPUT', '作品数据格式不正确')
    }

    const work = await getContentDomainStore().upsertWorkForUser(toStoredWork(user.id, parsed.data))
    return ok(stripUserId(work))
  })

  app.delete('/api/works/:id', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const params = z.object({ id: z.string() }).safeParse(request.params)
    if (!params.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '作品 ID 不正确')
    }

    const removed = await getContentDomainStore().deleteWorkForUser(user.id, params.data.id)
    if (!removed) {
      reply.code(404)
      return fail('WORK_NOT_FOUND', '作品不存在')
    }

    return ok({ success: true, count: 1 })
  })

  app.post('/api/works/delete', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const parsed = workDeleteBatchSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '批量删除参数不正确')
    }

    const count = await getContentDomainStore().deleteWorksForUser(user.id, parsed.data.ids)
    return ok({ success: true, count })
  })

  app.put('/api/works/:id/favorite', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const params = z.object({ id: z.string() }).safeParse(request.params)
    const parsed = favoriteSchema.safeParse(request.body)
    if (!params.success || !parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '收藏参数不正确')
    }

    const work = await getContentDomainStore().updateWorkFavoriteForUser(user.id, params.data.id, parsed.data.isFavorite)
    if (!work) {
      reply.code(404)
      return fail('WORK_NOT_FOUND', '作品不存在')
    }

    return ok(stripUserId(work))
  })

  app.put('/api/works/:id/tags', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const params = z.object({ id: z.string() }).safeParse(request.params)
    const parsed = workTagsSchema.safeParse(request.body)
    if (!params.success || !parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '标签参数不正确')
    }

    const work = await getContentDomainStore().replaceWorkTagsForUser(user.id, params.data.id, normalizeTags(parsed.data.tags))
    if (!work) {
      reply.code(404)
      return fail('WORK_NOT_FOUND', '作品不存在')
    }

    return ok(stripUserId(work))
  })

  app.post('/api/works/tags/add', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const parsed = workBatchTagSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '批量标签参数不正确')
    }

    const works = await getContentDomainStore().addTagToWorksForUser(user.id, parsed.data.ids, parsed.data.tag)
    return ok({
      success: true,
      works: works.map(stripUserId),
    })
  })

  app.post('/api/works/tags/remove', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const parsed = workBatchTagSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '批量标签参数不正确')
    }

    const works = await getContentDomainStore().removeTagFromWorksForUser(user.id, parsed.data.ids, parsed.data.tag)
    return ok({
      success: true,
      works: works.map(stripUserId),
    })
  })
}
