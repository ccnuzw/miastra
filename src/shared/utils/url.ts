export function joinUrl(base: string, endpoint: string) {
  const cleanBase = base.trim().replace(/\/$/, '')
  const cleanEndpoint = endpoint.trim().startsWith('/') ? endpoint.trim() : `/${endpoint.trim()}`
  return `${cleanBase}${cleanEndpoint}`
}

export function isLocalFrontend() {
  if (typeof window === 'undefined') return false
  return ['localhost', '127.0.0.1'].includes(window.location.hostname)
}

export function resolveImageApiUrl(base: string, endpoint: string) {
  if (!base.trim()) return joinUrl('/sub2api', endpoint)
  try {
    return joinUrl(base, endpoint)
  } catch {
    return joinUrl(base, endpoint)
  }
}
