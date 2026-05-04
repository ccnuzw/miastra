import { editEndpoint, generationEndpoint } from '@/features/generation/generation.constants'
import { joinUrl } from '@/shared/utils/url'
import type { ProviderConfig } from './provider.types'

export const providerProxyBaseUrl = '/api/provider-proxy'
export const providerGenerationRequestUrl = joinUrl(providerProxyBaseUrl, generationEndpoint)
export const providerEditRequestUrl = joinUrl(providerProxyBaseUrl, editEndpoint)

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

export function normalizeProviderConfig(config: ProviderConfig): ProviderConfig {
  const mode = config.mode === 'managed' ? 'managed' : 'custom'
  const managedProviderId = mode === 'managed'
    ? (config.managedProviderId.trim() || config.providerId.trim())
    : ''

  return {
    mode,
    providerId: mode === 'managed' ? managedProviderId : 'custom',
    managedProviderId,
    apiUrl: mode === 'custom' ? normalizeProviderApiUrlInput(config.apiUrl) : '',
    model: config.model.trim(),
    apiKey: mode === 'custom' ? config.apiKey.trim() : '',
  }
}

export function buildProviderJsonBody(
  body: {
    model: string
    prompt: string
    size?: string
    quality?: string
    n?: number
    stream?: boolean
  },
) {
  const payload: {
    model: string
    prompt: string
    size: string
    quality?: string
    n?: number
    stream?: boolean
  } = {
    model: body.model.trim(),
    prompt: body.prompt.trim(),
    size: body.size?.trim() || '1024x1024',
  }

  if (body.quality?.trim()) payload.quality = body.quality.trim()
  if (typeof body.n === 'number' && body.n > 1) payload.n = body.n
  if (body.stream === true) payload.stream = true

  return payload
}

export function buildProviderEditFormData(
  input: {
    model: string
    prompt: string
    images: File[]
    size?: string
    quality?: string
    n?: number
  },
) {
  const formData = new FormData()

  formData.append('model', input.model.trim())
  formData.append('prompt', input.prompt.trim())
  for (const imageFile of input.images) {
    formData.append('image', imageFile)
  }
  if (input.size?.trim()) formData.append('size', input.size.trim())
  if (input.quality?.trim()) formData.append('quality', input.quality.trim())
  if (typeof input.n === 'number' && input.n > 1) formData.append('n', String(input.n))

  return formData
}
