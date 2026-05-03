type ProviderFamily = 'sub2api' | 'openai' | 'azure-openai' | 'openai-compatible' | 'custom'

type ProviderConfigLike = {
  providerId: string
  apiUrl: string
  model: string
  apiKey?: string
}

const generationEndpoint = '/v1/images/generations'
const editEndpoint = '/v1/images/edits'
const endpointOverlapVariants = [
  generationEndpoint,
  editEndpoint,
  '/v1/images',
  '/images/generations',
  '/images/edits',
  '/images',
  '/v1',
]

function trimTrailingSlash(value: string) {
  return value.trim().replace(/\/$/, '')
}

function removeKnownEndpointSuffix(value: string) {
  let next = trimTrailingSlash(value)
  for (const suffix of endpointOverlapVariants) {
    if (next.toLowerCase().endsWith(suffix)) {
      next = next.slice(0, next.length - suffix.length)
      next = trimTrailingSlash(next)
      break
    }
  }
  return next
}

function detectProviderFamily(config: Pick<ProviderConfigLike, 'providerId' | 'apiUrl' | 'model'>): ProviderFamily {
  const providerId = config.providerId.trim().toLowerCase()
  const apiUrl = config.apiUrl.trim().toLowerCase()

  if (!apiUrl || providerId === 'sub2api' || apiUrl.startsWith('/sub2api')) return 'sub2api'
  if (apiUrl.includes('azure.com/openai')) return 'azure-openai'
  if (providerId === 'openai' || apiUrl.includes('api.openai.com')) return 'openai'
  if (/openai|oneapi|newapi|openrouter|siliconflow|302\.ai|ppinfra/.test(apiUrl)) return 'openai-compatible'
  return 'custom'
}

function overlapCandidates(endpoint: string) {
  const normalized = endpoint.trim().startsWith('/') ? endpoint.trim() : `/${endpoint.trim()}`
  return Array.from(new Set([
    normalized,
    normalized.replace(/\/(generations|edits)$/, ''),
    normalized.replace(/^\/v1/, ''),
    normalized.replace(/^\/v1/, '').replace(/\/(generations|edits)$/, ''),
    '/v1',
  ].filter(Boolean)))
}

export function normalizeProviderApiUrlInput(apiUrl: string) {
  const raw = apiUrl.trim()
  if (!raw) return ''
  if (raw.startsWith('/') && !raw.startsWith('//')) return removeKnownEndpointSuffix(raw)

  try {
    const url = new URL(raw)
    return removeKnownEndpointSuffix(url.toString())
  } catch {
    return removeKnownEndpointSuffix(raw)
  }
}

export function normalizeProviderConfigInput<T extends ProviderConfigLike>(config: T): T {
  return {
    ...config,
    providerId: config.providerId.trim(),
    apiUrl: normalizeProviderApiUrlInput(config.apiUrl),
    model: config.model.trim(),
    apiKey: config.apiKey?.trim(),
  }
}

export function validateProviderApiUrl(apiUrl: string) {
  if (!apiUrl) return null
  const isSameOriginPath = apiUrl.startsWith('/') && !apiUrl.startsWith('//')
  if (!/^https?:\/\//i.test(apiUrl) && !isSameOriginPath) {
    return {
      code: 'PROVIDER_URL_INVALID',
      message: 'API URL 缺少协议，请填写 `https://...`，或留空走 `/sub2api` 代理。',
    }
  }

  if (isSameOriginPath) return null

  try {
    const parsedUrl = new URL(apiUrl)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('unsupported protocol')
    return null
  } catch {
    return {
      code: 'PROVIDER_URL_INVALID',
      message: 'API URL 格式不正确，请检查协议、域名和路径。',
    }
  }
}

export function detectProviderCapabilities(config: Pick<ProviderConfigLike, 'providerId' | 'apiUrl' | 'model'>) {
  const normalizedApiUrl = normalizeProviderApiUrlInput(config.apiUrl)
  const family = detectProviderFamily({ ...config, apiUrl: normalizedApiUrl })
  const isGptImageModel = /^gpt-image-/i.test(config.model.trim())
  const supportsQuality = family === 'sub2api' || family === 'openai' || family === 'openai-compatible' || isGptImageModel
  const supportsStream = family === 'sub2api' || family === 'openai' || family === 'openai-compatible' || isGptImageModel
  const supportsImageEdits = family !== 'azure-openai'
  return {
    family,
    normalizedApiUrl,
    supportsQuality,
    supportsStream,
    supportsImageEdits,
  }
}

export function joinProviderUrl(base: string, endpoint: string) {
  let cleanBase = trimTrailingSlash(base)
  const cleanEndpoint = endpoint.trim().startsWith('/') ? endpoint.trim() : `/${endpoint.trim()}`

  for (const candidate of overlapCandidates(cleanEndpoint)) {
    if (candidate && cleanBase.toLowerCase().endsWith(candidate.toLowerCase())) {
      cleanBase = cleanBase.slice(0, cleanBase.length - candidate.length).replace(/\/$/, '')
      break
    }
  }

  return cleanBase ? `${cleanBase}${cleanEndpoint}` : cleanEndpoint
}

export function resolveProviderBaseUrl(apiUrl: string) {
  const normalizedApiUrl = normalizeProviderApiUrlInput(apiUrl)
  if (!normalizedApiUrl || normalizedApiUrl.startsWith('/')) {
    return (process.env.PROVIDER_UPSTREAM_ORIGIN?.trim() || 'http://127.0.0.1:18080').replace(/\/$/, '')
  }
  return normalizedApiUrl
}

export function resolveProviderRequestTarget(config: Pick<ProviderConfigLike, 'providerId' | 'apiUrl' | 'model'>, targetPath: string) {
  const normalized = normalizeProviderConfigInput({ ...config })
  const capabilities = detectProviderCapabilities(normalized)
  const baseUrl = resolveProviderBaseUrl(normalized.apiUrl)
  return {
    capabilities,
    baseUrl,
    targetUrl: joinProviderUrl(baseUrl, targetPath),
  }
}

export function mapProviderJsonBody(body: Record<string, unknown>, config: Pick<ProviderConfigLike, 'providerId' | 'apiUrl' | 'model'>) {
  const capabilities = detectProviderCapabilities(config)
  const payload: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(body)) {
    if (value === '' || value === null || value === undefined) continue
    if (key === 'stream') {
      if (capabilities.supportsStream && value === true) payload.stream = true
      continue
    }
    if (key === 'quality') {
      if (capabilities.supportsQuality && typeof value === 'string' && value.trim()) payload.quality = value.trim()
      continue
    }
    if (key === 'n') {
      if (typeof value === 'number' && value > 1) payload.n = value
      continue
    }
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) payload[key] = trimmed
      continue
    }
    payload[key] = value
  }

  return payload
}
