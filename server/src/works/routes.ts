import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import { requireAuthenticatedUser } from '../auth/routes'
import { createId } from '../lib/store'
import { fail, ok } from '../lib/http'
import { getContentDomainStore } from '../lib/domain-store'
import type { StoredWork } from '../auth/types'

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

const worksReplaceSchema = z.object({
  works: z.array(workSchema),
})

export async function registerWorksRoutes(app: FastifyInstance) {
  app.get('/api/works', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const works = await getContentDomainStore().listWorksByUserId(user.id)
    return ok(works.map(({ userId, ...work }) => work))
  })

  app.put('/api/works/replace', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const parsed = worksReplaceSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '作品数据格式不正确')
    }

    const nextWorks: StoredWork[] = parsed.data.works.map((work) => ({
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
    }))

    await getContentDomainStore().replaceWorksByUserId(user.id, nextWorks)
    return ok({ success: true, count: parsed.data.works.length })
  })
}
