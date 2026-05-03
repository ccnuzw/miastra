import { Readable } from 'node:stream'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { requireAuthenticatedUser } from '../auth/routes'
import { fail } from '../lib/http'
import { consumeQuota } from '../billing/ledger'
import { storeRepository } from '../lib/store'

function toFetchHeaders(request: FastifyRequest) {
  const headers = new Headers()
  for (const [key, value] of Object.entries(request.headers)) {
    if (!value) continue
    if (key === 'host' || key === 'content-length' || key === 'cookie') continue
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item))
    } else {
      headers.set(key, value)
    }
  }
  return headers
}

function resolveProviderBaseUrl(apiUrl: string) {
  if (/^https?:\/\//i.test(apiUrl.trim())) return apiUrl.trim().replace(/\/$/, '')
  return (process.env.PROVIDER_UPSTREAM_ORIGIN?.trim() || 'http://127.0.0.1:18080').replace(/\/$/, '')
}

async function resolveProviderRequestTarget(userId: string, request: FastifyRequest) {
  const store = await storeRepository.read()
  const config = store.providerConfigs.find((item) => item.userId === userId) ?? null
  const apiUrl = config?.apiUrl?.trim() ?? ''
  const model = config?.model?.trim() ?? ''
  const apiKey = config?.apiKey?.trim() ?? ''

  if (!model || !apiKey) return null

  const targetPath = request.url.replace(/^\/api\/provider-proxy/, '')
  const baseUrl = resolveProviderBaseUrl(apiUrl)
  return { apiKey, targetUrl: `${baseUrl}${targetPath}` }
}

async function ensureProfileSnapshot(userId: string) {
  const store = await storeRepository.read()
  const profile = store.quotaProfiles.find((item) => item.userId === userId)
  if (profile) return profile
  return {
    userId,
    planName: 'Starter',
    quotaTotal: 100,
    quotaUsed: 0,
    quotaRemaining: 100,
    renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

async function forwardProviderRequest(request: FastifyRequest, targetUrl: string, apiKey: string) {
  const headers = toFetchHeaders(request)
  headers.set('authorization', `Bearer ${apiKey}`)

  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers,
    redirect: 'manual',
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const contentType = String(request.headers['content-type'] ?? '')
    if (contentType.includes('application/json') || contentType.includes('text/plain')) {
      init.body = JSON.stringify(request.body ?? {})
      headers.set('content-type', contentType || 'application/json')
    } else {
      init.body = request.raw as unknown as BodyInit
      init.duplex = 'half'
    }
  }

  return await fetch(targetUrl, init)
}

async function handleProviderProxy(request: FastifyRequest, reply: FastifyReply) {
  const user = await requireAuthenticatedUser(request, reply)
  if (!user) return

  const provider = await resolveProviderRequestTarget(user.id, request)
  if (!provider) {
    reply.code(409)
    return fail('PROVIDER_CONFIG_REQUIRED', '请先在设置中保存 Provider API Key 与 Model 后再提交任务')
  }

  const shouldChargeQuota = String(request.headers['x-miastra-charge-quota'] ?? '1') !== '0'
  const profileSnapshot = await ensureProfileSnapshot(user.id)
  const quota = shouldChargeQuota ? await consumeQuota(user.id, 1) : { ok: true as const, profile: profileSnapshot }
  if (shouldChargeQuota && !quota.ok) {
    reply.code(402)
    return fail('QUOTA_EXCEEDED', '额度不足，请先到 Billing 续费或升级套餐')
  }

  try {
    const upstreamResponse = await forwardProviderRequest(request, provider.targetUrl, provider.apiKey)
    const responseHeaders = new Headers(upstreamResponse.headers)
    responseHeaders.set('x-quota-remaining', String(quota.profile.quotaRemaining))
    responseHeaders.set('x-quota-used', String(quota.profile.quotaUsed))
    responseHeaders.set('x-quota-total', String(quota.profile.quotaTotal))

    reply.status(upstreamResponse.status)
    responseHeaders.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-length') reply.header(key, value)
    })

    if (!upstreamResponse.body) {
      return await upstreamResponse.text()
    }

    return reply.send(Readable.fromWeb(upstreamResponse.body))
  } catch (error) {
    reply.code(502)
    return fail('UPSTREAM_UNAVAILABLE', error instanceof Error ? error.message : '上游 Provider 不可用')
  }
}

export async function registerProviderProxyRoutes(app: FastifyInstance) {
  app.all('/api/provider-proxy/*', async (request, reply) => {
    return await handleProviderProxy(request, reply)
  })
}
