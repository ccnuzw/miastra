import { generationEndpoint } from '@/features/generation/generation.constants'
import { postJsonImageGeneration } from '@/features/generation/generation.api'
import { extractGenerationError, extractImageSrc, isGatewayTimeoutPayload } from '@/features/generation/generation.parser'
import { resolveImageApiUrl } from '@/shared/utils/url'
import type { ProviderConfig } from './provider.types'

export type ProviderConnectionTestResult = {
  message: string
  requestUrl: string
  status: number
}

const providerConnectionTestTimeoutSec = 30
const providerConnectionTestPrompt = 'Connection test. Generate a simple neutral diagnostic image.'

function assertProviderTestConfig(config: ProviderConfig) {
  const apiKey = config.apiKey.trim()
  const model = config.model.trim()
  const apiUrl = config.apiUrl.trim()
  const requestUrl = resolveImageApiUrl(apiUrl, generationEndpoint)

  if (!model) throw new Error('本地配置缺少 Model，请填写模型名称后再测试连接')
  if (!apiKey) throw new Error('本地配置缺少 API Key，请填写密钥后再测试连接')
  const isSameOriginPath = apiUrl.startsWith('/') && !apiUrl.startsWith('//')
  if (apiUrl && !/^https?:\/\//i.test(apiUrl) && !isSameOriginPath) {
    throw new Error('本地配置中的 API URL 缺少协议：请填写 https://...，或使用以 / 开头的同源代理路径')
  }

  try {
    const parsedUrl = new URL(requestUrl, window.location.origin)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Unsupported protocol')
  } catch {
    throw new Error('本地配置中的 API URL 格式不正确，请检查协议、域名和路径')
  }

  return { apiKey, model, requestUrl }
}

function responseTextSnippet(text: string) {
  return text.trim().replace(/\s+/g, ' ').slice(0, 240)
}

function formatHttpStatus(response: Response) {
  return `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`
}

function normalizeTransportError(error: unknown, didTimeout: boolean) {
  if (didTimeout || (error instanceof DOMException && error.name === 'AbortError')) {
    return new Error(`测试连接超时：${providerConnectionTestTimeoutSec}s 内未收到 Provider 响应，请检查 API URL、代理或模型服务状态`)
  }

  if (error instanceof TypeError) {
    const detail = error.message ? `（${error.message}）` : ''
    return new Error(`网络或 CORS 错误：浏览器无法完成请求${detail}，请检查 API URL 是否可访问，或改用同源代理 /sub2api`)
  }

  return error instanceof Error ? error : new Error('测试连接失败：未知错误')
}

export async function testProviderConnection(config: ProviderConfig): Promise<ProviderConnectionTestResult> {
  const { apiKey, model, requestUrl } = assertProviderTestConfig(config)
  const controller = new AbortController()
  let didTimeout = false
  const timeout = window.setTimeout(() => {
    didTimeout = true
    controller.abort()
  }, providerConnectionTestTimeoutSec * 1000)

  try {
    const { response, text, latestImageSrc } = await postJsonImageGeneration({
      requestUrl,
      apiKey,
      signal: controller.signal,
      body: {
        model,
        prompt: providerConnectionTestPrompt,
        size: '1024x1024',
        n: 1,
        stream: false,
      },
    })

    if (isGatewayTimeoutPayload(response.status, text)) {
      throw new Error(`${formatHttpStatus(response)}：远端网关超时，请稍后重试或检查 Provider 代理`)
    }

    const providerError = extractGenerationError(text)
    if (providerError) {
      const prefix = response.ok ? 'Provider 返回 error' : formatHttpStatus(response)
      throw new Error(`${prefix}：${providerError}`)
    }

    if (!response.ok) {
      const snippet = responseTextSnippet(text)
      throw new Error(`${formatHttpStatus(response)}：请求失败，请检查 API URL、API Key 与 Model${snippet ? `；响应摘要：${snippet}` : ''}`)
    }

    const imageSrc = latestImageSrc || extractImageSrc(text)
    if (!imageSrc) {
      throw new Error('接口已返回成功，但未解析到图片数据，请检查该 Provider 是否兼容 OpenAI Images /v1/images/generations 响应格式')
    }

    return {
      message: `连接成功：${formatHttpStatus(response)}，模型可用`,
      requestUrl,
      status: response.status,
    }
  } catch (error) {
    throw normalizeTransportError(error, didTimeout)
  } finally {
    window.clearTimeout(timeout)
  }
}
