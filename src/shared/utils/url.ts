const overlapCandidates = (endpoint: string) => {
  const normalized = endpoint.trim().startsWith('/') ? endpoint.trim() : `/${endpoint.trim()}`
  const candidates = [
    normalized,
    normalized.replace(/\/(generations|edits)$/, ''),
    normalized.replace(/^\/v1/, ''),
    normalized.replace(/^\/v1/, '').replace(/\/(generations|edits)$/, ''),
    '/v1',
  ]

  return Array.from(new Set(candidates.filter(Boolean)))
}

export function joinUrl(base: string, endpoint: string) {
  let cleanBase = base.trim().replace(/\/$/, '')
  const cleanEndpoint = endpoint.trim().startsWith('/') ? endpoint.trim() : `/${endpoint.trim()}`

  for (const candidate of overlapCandidates(cleanEndpoint)) {
    if (candidate && cleanBase.toLowerCase().endsWith(candidate.toLowerCase())) {
      cleanBase = cleanBase.slice(0, cleanBase.length - candidate.length).replace(/\/$/, '')
      break
    }
  }

  return cleanBase ? `${cleanBase}${cleanEndpoint}` : cleanEndpoint
}

export function isLocalFrontend() {
  if (typeof window === 'undefined') return false
  return ['localhost', '127.0.0.1'].includes(window.location.hostname)
}

export function resolveImageApiUrl(base: string, endpoint: string) {
  return joinUrl(base, endpoint)
}
