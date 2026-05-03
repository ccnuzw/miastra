import { generationEndpoint } from '@/features/generation/generation.constants'
import { extractGenerationErrorDetails, readGenerationResponse, responseDebugHeaders } from '@/features/generation/generation.parser'
import { resolveImageApiUrl } from '@/shared/utils/url'
import type { ProviderConfig } from './provider.types'
import { detectProviderCapabilities, mapGenerationJsonBody, normalizeProviderConfig } from './provider.compat'

const testTimeoutMs = 20_000

export type ProviderConnectionTestResult = {
  message: string
  requestUrl: string
}

function buildValidationError(message: string) {
  return new Error(message)
}

function buildNetworkError(message: string, cause?: unknown) {
  const error = new Error(message) as Error & { cause?: unknown }
  if (cause !== undefined) error.cause = cause
  return error
}

export async function testProviderConnection(input: ProviderConfig): Promise<ProviderConnectionTestResult> {
  const config = normalizeProviderConfig(input)

  if (!config.model) throw buildValidationError('请先填写 Model 再测试连接。')
  if (!config.apiKey) throw buildValidationError('请先填写 API Key 再测试连接。')

  const capabilities = detectProviderCapabilities(config)
  const requestUrl = resolveImageApiUrl(config.apiUrl, generationEndpoint)
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), testTimeoutMs)

  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'x-miastra-charge-quota': '0',
      },
      body: JSON.stringify(mapGenerationJsonBody({
        model: config.model,
        prompt: 'connectivity test image, simple monochrome square, no text',
        size: '1024x1024',
        quality: 'low',
        n: 1,
        stream: capabilities.supportsStream,
      }, config)),
    })

    const text = await readGenerationResponse(response)
    const details = extractGenerationErrorDetails(text)

    if (!response.ok) {
      const fallback = `HTTP ${response.status} ${response.statusText}`.trim()
      const debugHeaders = responseDebugHeaders(response)
      throw buildNetworkError(
        [details?.message || fallback, debugHeaders].filter(Boolean).join('\n'),
      )
    }

    if (details?.message) {
      throw buildNetworkError(details.message)
    }

    return {
      message: `连接成功，已收到 ${capabilities.familyLabel} 的有效响应。`,
      requestUrl,
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw buildNetworkError(`测试连接超过 ${testTimeoutMs / 1000}s，已自动取消。`, error)
    }

    if (error instanceof Error) throw error
    throw buildNetworkError('测试连接失败，请检查网络、API URL、Model 和 API Key。', error)
  } finally {
    window.clearTimeout(timeout)
  }
}
