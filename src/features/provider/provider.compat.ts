import { editEndpoint, generationEndpoint } from '@/features/generation/generation.constants'
import { resolveImageApiUrl } from '@/shared/utils/url'
import type { ProviderConfig } from './provider.types'

type ProviderFamily = 'sub2api' | 'openai' | 'azure-openai' | 'openai-compatible' | 'custom'

export type ProviderCapabilities = {
  family: ProviderFamily
  familyLabel: string
  normalizedApiUrl: string
  baseUrl: string
  generationUrl: string
  editUrl: string
  supportsQuality: boolean
  supportsStream: boolean
  supportsImageEdits: boolean
  editSupportConfidence: 'high' | 'medium' | 'low'
  warnings: string[]
  omittedJsonParams: string[]
  omittedEditParams: string[]
}

type GenerationJsonBody = {
  model: string
  prompt: string
  size?: string
  quality?: string
  n?: number
  stream?: boolean
}

type NormalizedGenerationJsonBody = {
  model: string
  prompt: string
  size: string
  quality?: string
  n?: number
  stream?: boolean
}

type EditImageFormInput = {
  model: string
  prompt: string
  images: File[]
  size?: string
  quality?: string
  n?: number
}

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

function detectProviderFamily(config: Pick<ProviderConfig, 'providerId' | 'apiUrl' | 'model'>): ProviderFamily {
  const providerId = config.providerId.trim().toLowerCase()
  const apiUrl = config.apiUrl.trim().toLowerCase()

  if (!apiUrl || providerId === 'sub2api' || apiUrl.startsWith('/sub2api')) return 'sub2api'
  if (apiUrl.includes('azure.com/openai')) return 'azure-openai'
  if (providerId === 'openai' || apiUrl.includes('api.openai.com')) return 'openai'
  if (/openai|oneapi|newapi|openrouter|siliconflow|302\.ai|ppinfra/.test(apiUrl)) return 'openai-compatible'
  return 'custom'
}

function providerFamilyLabel(family: ProviderFamily) {
  if (family === 'sub2api') return 'Sub2API 代理'
  if (family === 'openai') return 'OpenAI Images'
  if (family === 'azure-openai') return 'Azure OpenAI 风格'
  if (family === 'openai-compatible') return 'OpenAI 兼容网关'
  return '自定义兼容服务'
}

export function normalizeProviderApiUrlInput(apiUrl: string) {
  const raw = apiUrl.trim()
  if (!raw) return ''
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    return removeKnownEndpointSuffix(raw)
  }

  try {
    const url = new URL(raw)
    return removeKnownEndpointSuffix(url.toString())
  } catch {
    return removeKnownEndpointSuffix(raw)
  }
}

export function normalizeProviderConfig(config: ProviderConfig): ProviderConfig {
  return {
    providerId: config.providerId.trim(),
    apiUrl: normalizeProviderApiUrlInput(config.apiUrl),
    model: config.model.trim(),
    apiKey: config.apiKey.trim(),
  }
}

export function detectProviderCapabilities(config: Pick<ProviderConfig, 'providerId' | 'apiUrl' | 'model'>): ProviderCapabilities {
  const normalizedApiUrl = normalizeProviderApiUrlInput(config.apiUrl)
  const family = detectProviderFamily({ ...config, apiUrl: normalizedApiUrl })
  const model = config.model.trim()
  const isGptImageModel = /^gpt-image-/i.test(model)
  const supportsQuality = family === 'sub2api' || family === 'openai' || family === 'openai-compatible' || isGptImageModel
  const supportsStream = family === 'sub2api' || family === 'openai' || family === 'openai-compatible' || isGptImageModel
  const supportsImageEdits = family !== 'azure-openai'
  const editSupportConfidence = family === 'sub2api' || family === 'openai' || family === 'openai-compatible'
    ? 'high'
    : family === 'azure-openai'
      ? 'low'
      : 'medium'
  const warnings: string[] = []

  if (!normalizedApiUrl) warnings.push('未填写 API URL，将默认走 `/sub2api` 代理。')
  if (family === 'azure-openai') warnings.push('Azure OpenAI 常见地址不直接兼容标准 `/v1/images/*` 路径。')
  if (!supportsQuality) warnings.push('当前配置会自动省略 `quality` 参数，避免触发不兼容错误。')
  if (!supportsStream) warnings.push('当前配置会自动省略 `stream` 参数，避免触发不兼容错误。')

  return {
    family,
    familyLabel: providerFamilyLabel(family),
    normalizedApiUrl,
    baseUrl: normalizedApiUrl || '/sub2api',
    generationUrl: resolveImageApiUrl(normalizedApiUrl, generationEndpoint),
    editUrl: resolveImageApiUrl(normalizedApiUrl, editEndpoint),
    supportsQuality,
    supportsStream,
    supportsImageEdits,
    editSupportConfidence,
    warnings,
    omittedJsonParams: [
      supportsQuality ? '' : 'quality',
      supportsStream ? '' : 'stream',
    ].filter(Boolean),
    omittedEditParams: [supportsQuality ? '' : 'quality'].filter(Boolean),
  }
}

export function mapGenerationJsonBody(
  body: GenerationJsonBody,
  config: Pick<ProviderConfig, 'providerId' | 'apiUrl' | 'model'>,
): NormalizedGenerationJsonBody {
  const capabilities = detectProviderCapabilities(config)
  const payload: NormalizedGenerationJsonBody = {
    model: body.model.trim(),
    prompt: body.prompt.trim(),
    size: body.size?.trim() || '1024x1024',
  }

  if (capabilities.supportsQuality && body.quality?.trim()) payload.quality = body.quality.trim()
  if (typeof body.n === 'number' && body.n > 1) payload.n = body.n
  if (capabilities.supportsStream && body.stream === true) payload.stream = true

  return payload
}

export function buildEditImageFormData(
  input: EditImageFormInput,
  config: Pick<ProviderConfig, 'providerId' | 'apiUrl' | 'model'>,
) {
  const capabilities = detectProviderCapabilities(config)
  const formData = new FormData()

  formData.append('model', input.model.trim())
  formData.append('prompt', input.prompt.trim())
  for (const imageFile of input.images) {
    formData.append('image', imageFile)
  }
  if (input.size?.trim()) formData.append('size', input.size.trim())
  if (capabilities.supportsQuality && input.quality?.trim()) formData.append('quality', input.quality.trim())
  if (typeof input.n === 'number' && input.n > 1) formData.append('n', String(input.n))

  return formData
}
