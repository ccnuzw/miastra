import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import { requireAuthenticatedUser } from '../auth/routes'
import { fail, ok } from '../lib/http'
import { getAuthDomainStore } from '../lib/domain-store'
import { normalizeProviderConfigInput, validateProviderApiUrl } from './provider.utils'

const providerConfigSchema = z.object({
  providerId: z.string().trim().min(1),
  apiUrl: z.string().trim(),
  model: z.string().trim().min(1),
  apiKey: z.string().trim(),
})

function normalizeProviderConfig(config: z.infer<typeof providerConfigSchema>) {
  return normalizeProviderConfigInput({
    providerId: config.providerId,
    apiUrl: config.apiUrl,
    model: config.model,
    apiKey: config.apiKey,
  })
}

export async function registerProviderConfigRoutes(app: FastifyInstance) {
  app.get('/api/provider-config', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const config = await getAuthDomainStore().findProviderConfigByUserId(user.id)
    if (!config) {
      return ok({
        providerId: 'sub2api',
        apiUrl: '',
        model: 'gpt-image-2',
        apiKey: '',
      })
    }
    return ok({
      providerId: config.providerId,
      apiUrl: config.apiUrl,
      model: config.model,
      apiKey: config.apiKey,
    })
  })

  app.put('/api/provider-config', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const parsed = providerConfigSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', 'Provider 配置格式不正确')
    }

    const normalized = {
      userId: user.id,
      ...normalizeProviderConfig(parsed.data),
      updatedAt: new Date().toISOString(),
    }
    const apiUrlError = validateProviderApiUrl(normalized.apiUrl)
    if (apiUrlError) {
      reply.code(400)
      return fail(apiUrlError.code, apiUrlError.message)
    }

    await getAuthDomainStore().upsertProviderConfig(normalized)

    return ok({
      providerId: normalized.providerId,
      apiUrl: normalized.apiUrl,
      model: normalized.model,
      apiKey: normalized.apiKey,
    })
  })
}
