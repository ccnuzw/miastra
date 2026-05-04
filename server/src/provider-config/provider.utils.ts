const endpointOverlapVariants = [
  '/v1/images/generations',
  '/v1/images/edits',
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

export function normalizeProviderApiUrlInput(apiUrl: string) {
  const raw = apiUrl.trim()
  if (!raw) return ''
  if (raw.startsWith('/') && !raw.startsWith('//')) return ''

  try {
    const url = new URL(raw)
    return removeKnownEndpointSuffix(url.toString())
  } catch {
    return removeKnownEndpointSuffix(raw)
  }
}

export function validateProviderApiUrl(apiUrl: string) {
  if (!apiUrl) {
    return null
  }
  if (apiUrl.startsWith('/') && !apiUrl.startsWith('//')) {
    return {
      code: 'PROVIDER_URL_INVALID',
      message: 'API URL 不能使用相对路径，请填写完整云端基址或留空使用服务端默认上游。',
    }
  }

  try {
    const parsedUrl = new URL(apiUrl)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('unsupported protocol')
    return null
  } catch {
    return {
      code: 'PROVIDER_URL_INVALID',
      message: 'API URL 格式不正确，请检查协议和域名，或留空使用服务端默认上游。',
    }
  }
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
  if (normalizedApiUrl) return normalizedApiUrl
  return normalizeProviderApiUrlInput(process.env.PROVIDER_UPSTREAM_ORIGIN ?? '')
}
