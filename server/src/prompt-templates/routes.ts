import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import { requireAuthenticatedUser } from '../auth/routes'
import { createId } from '../lib/store'
import { fail, ok } from '../lib/http'
import { getContentDomainStore } from '../lib/domain-store'

const templateSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  name: z.string().optional(),
  content: z.string(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

function normalizeTemplateTags(tags: string[] | undefined) {
  if (!Array.isArray(tags)) return undefined
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)))
}

export async function registerPromptTemplateRoutes(app: FastifyInstance) {
  app.get('/api/prompt-templates', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const templates = await getContentDomainStore().listPromptTemplatesByUserId(user.id)
    return ok(templates.map(({ userId, ...template }) => template))
  })

  app.post('/api/prompt-templates', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const parsed = templateSchema.safeParse(request.body)
    if (!parsed.success || !parsed.data.content.trim()) {
      reply.code(400)
      return fail('INVALID_INPUT', '模板内容不能为空')
    }

    const now = new Date().toISOString()
    const id = parsed.data.id ?? createId()
    const existingTemplate = parsed.data.id
      ? (await getContentDomainStore().listPromptTemplatesByUserId(user.id)).find((item) => item.id === parsed.data.id)
      : null
    const normalized = {
      id,
      userId: user.id,
      title: parsed.data.title?.trim() || parsed.data.name?.trim() || '未命名模板',
      name: parsed.data.title?.trim() || parsed.data.name?.trim() || '未命名模板',
      content: parsed.data.content,
      category: parsed.data.category !== undefined ? parsed.data.category.trim() || undefined : existingTemplate?.category,
      tags: parsed.data.tags !== undefined ? normalizeTemplateTags(parsed.data.tags) : existingTemplate?.tags,
      createdAt: existingTemplate?.createdAt ?? now,
      updatedAt: now,
      lastUsedAt: existingTemplate?.lastUsedAt ?? null,
    }

    try {
      const template = await getContentDomainStore().upsertPromptTemplateForUser(normalized)
      const { userId, ...publicTemplate } = template
      return ok(publicTemplate)
    } catch (error) {
      if (error instanceof Error && error.message === '模板 ID 已被占用') {
        reply.code(409)
        return fail('INVALID_OPERATION', error.message)
      }

      throw error
    }
  })

  app.post('/api/prompt-templates/:id/use', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '模板 ID 不正确')
    }

    const usedAt = new Date().toISOString()
    const template = await getContentDomainStore().markPromptTemplateUsedForUser(user.id, id.data, usedAt)
    if (!template) {
      reply.code(404)
      return fail('TEMPLATE_NOT_FOUND', '模板不存在')
    }

    const { userId, ...publicTemplate } = template
    return ok(publicTemplate)
  })

  app.delete('/api/prompt-templates/:id', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '模板 ID 不正确')
    }

    const removed = await getContentDomainStore().deletePromptTemplateForUser(user.id, id.data)
    if (!removed) {
      reply.code(404)
      return fail('TEMPLATE_NOT_FOUND', '模板不存在')
    }
    return ok({ success: true })
  })
}
