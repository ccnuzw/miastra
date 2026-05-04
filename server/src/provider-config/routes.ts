import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import { requireAuthenticatedUser } from '../auth/routes'
import { fail, ok } from '../lib/http'
import { getAuthDomainStore } from '../lib/domain-store'
import { storeRepository } from '../lib/store'
import {
  createDefaultProviderConfig,
  listPublicManagedProviders,
  normalizeUserProviderConfigInput,
  resolveEffectiveProviderConfig,
} from './provider.service'
import { validateProviderApiUrl } from './provider.utils'

const providerConfigSchema = z.object({
  mode: z.enum(['managed', 'custom']),
  providerId: z.string().trim().optional(),
  managedProviderId: z.string().trim().optional(),
  apiUrl: z.string().trim(),
  model: z.string().trim().min(1),
  apiKey: z.string().trim(),
})

function buildProviderConfigPayload(params: {
  config: ReturnType<typeof normalizeUserProviderConfigInput>
  managedProviders: ReturnType<typeof listPublicManagedProviders>
}) {
  return {
    config: params.config,
    managedProviders: params.managedProviders,
  }
}

export async function registerProviderConfigRoutes(app: FastifyInstance) {
  app.get('/api/provider-config', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const store = await storeRepository.read()
    const managedProviders = listPublicManagedProviders(store)
    const config = await getAuthDomainStore().findProviderConfigByUserId(user.id)

    return ok(buildProviderConfigPayload({
      config: normalizeUserProviderConfigInput(config ?? createDefaultProviderConfig(user.id)),
      managedProviders,
    }))
  })

  app.put('/api/provider-config', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const parsed = providerConfigSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', 'Provider 配置格式不正确')
    }

    const store = await storeRepository.read()
    const managedProviders = listPublicManagedProviders(store)
    const normalized = normalizeUserProviderConfigInput({
      userId: user.id,
      mode: parsed.data.mode,
      providerId: parsed.data.providerId ?? '',
      managedProviderId: parsed.data.managedProviderId ?? '',
      apiUrl: parsed.data.apiUrl,
      model: parsed.data.model,
      apiKey: parsed.data.apiKey,
      updatedAt: new Date().toISOString(),
    })

    if (normalized.mode === 'managed') {
      const selected = managedProviders.find((item) => item.id === normalized.managedProviderId)
      if (!selected) {
        reply.code(400)
        return fail('PROVIDER_CONFIG_REQUIRED', '当前选择的公共 Provider 不存在或已下线，请重新选择。')
      }
      const model = normalized.model.trim() || selected.defaultModel
      if (!selected.models.includes(model)) {
        reply.code(400)
        return fail('PROVIDER_MODEL_INVALID', '当前选择的模型不在该公共 Provider 的可用列表中。')
      }
      normalized.model = model
    } else {
      const rawApiUrl = parsed.data.apiUrl.trim()
      const apiUrlError = rawApiUrl.startsWith('/') && !rawApiUrl.startsWith('//')
        ? {
            code: 'PROVIDER_URL_INVALID',
            message: 'API URL 不能使用相对路径，请填写完整云端基址或留空使用服务端默认上游。',
          }
        : validateProviderApiUrl(normalized.apiUrl)
      if (apiUrlError) {
        reply.code(400)
        return fail(apiUrlError.code, apiUrlError.message)
      }
    }

    await getAuthDomainStore().upsertProviderConfig(normalized)

    return ok(buildProviderConfigPayload({
      config: normalized,
      managedProviders,
    }))
  })

  app.get('/api/provider-config/resolve', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const store = await storeRepository.read()
    const config = await getAuthDomainStore().findProviderConfigByUserId(user.id)
    const resolved = resolveEffectiveProviderConfig({ store, config })
    if (resolved.error) {
      reply.code(409)
      return fail(resolved.error.code, resolved.error.message)
    }
    return ok({
      providerId: resolved.config?.providerId ?? '',
      model: resolved.config?.model ?? '',
      source: resolved.config?.source ?? 'custom',
    })
  })
}
