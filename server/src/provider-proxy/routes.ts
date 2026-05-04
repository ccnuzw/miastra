import { Readable } from 'node:stream'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { requireAuthenticatedUser } from '../auth/routes'
import { consumeQuota } from '../billing/ledger'
import { getQuotaExceededMessage } from '../runtime-config'
import { storeRepository } from '../lib/store'
import { fail } from '../lib/http'
import { findStoredProviderConfigByUserId, resolveEffectiveProviderConfig } from '../provider-config/provider.service'
import { joinProviderUrl } from '../provider-config/provider.utils'

function toFetchHeaders(request: FastifyRequest) {
  const headers = new Headers()
  for (const [key, value] of Object.entries(request.headers)) {
    if (!value) continue
    if (key === 'host' || key === 'content-length' || key === 'cookie') continue
    if (Array.isArray(value)) {
      value.forEach((item) => {
        headers.append(key, item)
      })
    } else {
      headers.set(key, value)
    }
  }
  return headers
}

function responseTextSnippet(text: string) {
  return text.trim().replace(/\s+/g, ' ').slice(0, 240)
}

function extractProviderErrorMessage(text: string) {
  const raw = text.trim()
  if (!raw) return ''
  try {
    const json = JSON.parse(raw)
    const message = json?.error?.message || json?.message
    return typeof message === 'string' ? message.trim() : raw
  } catch {
    return raw
  }
}

function providerErrorResponse(reply: FastifyReply, statusCode: number, code: string, message: string) {
  reply.code(statusCode)
  return fail(code, message)
}

function classifyUpstreamResponseError(params: {
  status: number
  statusText: string
  text: string
  targetPath: string
}) {
  const detail = extractProviderErrorMessage(params.text) || responseTextSnippet(params.text) || params.statusText
  const normalizedDetail = detail.toLowerCase()
  const isEditPath = /\/v1\/images\/edits(?:\?|$)/i.test(params.targetPath)

  if (
    params.status === 401
    || params.status === 403
    || /api[_\s-]?key|invalid[_\s-]?api[_\s-]?key|incorrect[_\s-]?api[_\s-]?key|unauthorized|authentication|token/.test(normalizedDetail)
  ) {
    return {
      code: 'PROVIDER_API_KEY_INVALID',
      message: 'Provider API Key 无效、已过期，或没有访问该服务的权限。',
      statusCode: 409,
    }
  }

  if (
    /model|deployment|engine/.test(normalizedDetail)
    && /not found|does not exist|unknown|invalid|unsupported|未找到|不存在|不可用/.test(normalizedDetail)
  ) {
    return {
      code: 'PROVIDER_MODEL_INVALID',
      message: '当前 Provider Model 不存在、不可用，或不属于这个服务商。',
      statusCode: 409,
    }
  }

  if (
    params.status === 404
    || params.status === 405
    || /not found|no route|cannot post|unknown url/.test(normalizedDetail)
  ) {
    return {
      code: isEditPath ? 'PROVIDER_UNSUPPORTED' : 'PROVIDER_URL_INVALID',
      message: isEditPath
        ? '当前上游未开放标准 `/v1/images/edits` 图生图接口，请更换支持该接口的云端服务。'
        : 'Provider API URL 或基础路径不可用，请检查云端基址是否正确。',
      statusCode: 409,
    }
  }

  if (
    params.status === 415
    || params.status === 422
    || /unsupported|not support|unknown parameter|invalid parameter|schema|multipart|content-type/.test(normalizedDetail)
  ) {
    return {
      code: 'PROVIDER_UNSUPPORTED',
      message: '当前上游不支持这次请求的图片接口或参数，请检查模型和云端能力。',
      statusCode: 409,
    }
  }

  if (params.status === 429) {
    return {
      code: 'UPSTREAM_UNAVAILABLE',
      message: 'Provider 当前限流或繁忙，请稍后重试。',
      statusCode: 429,
    }
  }

  if (params.status >= 500) {
    return {
      code: 'UPSTREAM_UNAVAILABLE',
      message: 'Provider 服务暂时不可用，请稍后重试。',
      statusCode: 502,
    }
  }

  const snippet = responseTextSnippet(params.text)
  return {
    code: 'PROVIDER_RESPONSE_INVALID',
    message: snippet ? `Provider 返回了无法直接处理的响应：${snippet}` : 'Provider 返回了无法直接处理的响应，请检查配置后重试。',
    statusCode: 502,
  }
}

function classifyFetchFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const normalizedMessage = message.toLowerCase()

  if (/failed to parse url|invalid url|only absolute urls/.test(normalizedMessage)) {
    return {
      code: 'PROVIDER_URL_INVALID',
      message: 'Provider API URL 格式不可用，请检查地址是否包含正确协议、域名与路径。',
      statusCode: 409,
    }
  }

  if (/enotfound|econnrefused|ehostunreach|getaddrinfo|fetch failed/.test(normalizedMessage)) {
    return {
      code: 'PROVIDER_URL_INVALID',
      message: '无法连接到当前上游服务，请检查 API URL 和网络连通性。',
      statusCode: 409,
    }
  }

  return {
    code: 'UPSTREAM_UNAVAILABLE',
    message: 'Provider 服务暂时不可用，请稍后重试或检查上游状态。',
    statusCode: 502,
  }
}

async function resolveProviderRequestTargetForUser(userId: string, request: FastifyRequest) {
  const store = await storeRepository.read()
  const config = findStoredProviderConfigByUserId(store, userId)
  const user = store.users.find((item) => item.id === userId) ?? null
  const resolved = resolveEffectiveProviderConfig({ store, config, user })
  if (resolved.error || !resolved.config) {
    return {
      error: resolved.error ?? {
        code: 'PROVIDER_CONFIG_REQUIRED',
        message: '请先选择一个 Provider，或填写自定义 Provider 配置。',
      },
    }
  }

  const targetPath = request.url.replace(/^\/api\/provider-proxy/, '')
  return {
    baseUrl: resolved.config.apiUrl,
    config: resolved.config,
    apiKey: resolved.config.apiKey,
    targetPath,
    targetUrl: joinProviderUrl(resolved.config.apiUrl, targetPath),
  }
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

async function forwardProviderRequest(
  request: FastifyRequest,
  targetUrl: string,
  apiKey: string,
) {
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
      init.body = typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body ?? {})
      headers.set('content-type', 'application/json')
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

  const provider = await resolveProviderRequestTargetForUser(user.id, request)
  if (!provider || 'error' in provider) {
    reply.code(409)
    const error = provider && 'error' in provider
      ? provider.error
      : { code: 'PROVIDER_CONFIG_REQUIRED', message: '请先在设置中保存 Provider API Key 与 Model 后再提交任务' }
    return fail(error.code, error.message)
  }
  if (!provider.baseUrl) {
    reply.code(409)
    return fail('PROVIDER_URL_INVALID', '当前未设置 Provider API URL，且服务端也未配置 PROVIDER_UPSTREAM_ORIGIN。请填写完整云端基址，或让服务端配置默认上游。')
  }

  const shouldChargeQuota = String(request.headers['x-miastra-charge-quota'] ?? '1') !== '0'
  const profileSnapshot = await ensureProfileSnapshot(user.id)
  const quota = shouldChargeQuota ? await consumeQuota(user.id, 1) : { ok: true as const, profile: profileSnapshot }
  if (shouldChargeQuota && !quota.ok) {
    reply.code(402)
    return fail('QUOTA_EXCEEDED', getQuotaExceededMessage())
  }

  try {
    const upstreamResponse = await forwardProviderRequest(request, provider.targetUrl, provider.apiKey)
    if (!upstreamResponse.ok) {
      const text = await upstreamResponse.text()
      const classified = classifyUpstreamResponseError({
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        text,
        targetPath: provider.targetPath,
      })
      return providerErrorResponse(reply, classified.statusCode, classified.code, classified.message)
    }

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
    const classified = classifyFetchFailure(error)
    return providerErrorResponse(reply, classified.statusCode, classified.code, classified.message)
  }
}

export async function registerProviderProxyRoutes(app: FastifyInstance) {
  app.all('/api/provider-proxy/*', async (request, reply) => {
    return await handleProviderProxy(request, reply)
  })
}
