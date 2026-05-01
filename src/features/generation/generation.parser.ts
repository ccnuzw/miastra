import type { GenerationError } from './generation.types'

export function extractImageSrc(payload: string) {
  try {
    const json = JSON.parse(payload)
    const item = json.data?.[0]
    const b64 = item?.b64_json || item?.b64 || item?.image_base64
    if (b64) return b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`
    return item?.url || json.url || json.image_url || ''
  } catch {
    const dataUrl = payload.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/)?.[0]
    if (dataUrl) return dataUrl
    const b64 = payload.match(/"b64_json"\s*:\s*"([^"]+)"/)?.[1]
    if (b64) return `data:image/png;base64,${b64}`
    return ''
  }
}

function buildGenerationError(code: GenerationError['code'], message: string, retryable: boolean, cause?: unknown): GenerationError {
  return { code, message, retryable, cause }
}

function parseHttpStatus(message: string) {
  const match = message.match(/^HTTP\s+(\d{3})/i)
  return match ? Number(match[1]) : undefined
}

export function normalizeGenerationError(error: unknown): GenerationError {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return buildGenerationError('abort', '请求已取消', false, error)
  }

  if (error instanceof TypeError && /failed to fetch/i.test(error.message)) {
    return buildGenerationError('network', '浏览器无法访问远端 API，通常是 CORS 或网络不可达', true, error)
  }

  if (error instanceof Error) {
    const message = error.message || '未知错误'
    if (/请先上传|请先在右上角设置里补全/i.test(message)) return buildGenerationError('invalid-input', message, false, error)
    if (/504 Gateway Time-out|openresty/i.test(message)) return buildGenerationError('gateway-timeout', '远端网关超时 504', true, error)
    if (/超过 .*s|timeout/i.test(message)) return buildGenerationError('timeout', message, true, error)
    if (/不支持标准 \/v1\/images\/edits/i.test(message)) return buildGenerationError('provider-unsupported', message, false, error)
    if (/未解析到图片数据|响应格式/i.test(message)) return buildGenerationError('invalid-response', message, true, error)

    const httpStatus = parseHttpStatus(message)
    if (httpStatus) {
      const retryable = httpStatus >= 500 || httpStatus === 408 || httpStatus === 425 || httpStatus === 429
      return buildGenerationError('http-error', message, retryable, error)
    }

    return buildGenerationError('unknown', message, true, error)
  }

  return buildGenerationError('unknown', '未知错误', true, error)
}

export function extractGenerationError(payload: string) {
  const candidates: string[] = []
  payload.split('\n').forEach((line) => {
    if (!line.startsWith('data:')) return
    candidates.push(line.replace(/^data:\s*/, '').trim())
  })
  candidates.push(payload.trim())

  for (const candidate of candidates) {
    if (!candidate || candidate === '[DONE]') continue
    try {
      const json = JSON.parse(candidate)
      const error = json.error ?? json
      const message = error?.message || json.message
      if (message) return String(message)
    } catch {
      if (/event:\s*error/i.test(payload)) return candidate
    }
  }

  if (/event:\s*error/i.test(payload)) return '远端流式响应返回 error 事件，但未提供可解析的错误信息'
  return ''
}

export function imageSrcFromEventData(data: string) {
  if (!data || data === '[DONE]') return ''
  return extractImageSrc(data)
}

export async function readGenerationResponse(
  response: Response,
  onImage?: (src: string) => void,
) {
  const contentType = response.headers.get('content-type') || ''
  if (!response.body || !contentType.includes('text/event-stream')) return response.text()

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    fullText += chunk
    buffer += chunk
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''
    events.forEach((event) => {
      event.split('\n').forEach((line) => {
        if (!line.startsWith('data:')) return
        const data = line.replace(/^data:\s*/, '').trim()
        const src = imageSrcFromEventData(data)
        if (src) onImage?.(src)
      })
    })
  }

  if (buffer) fullText += buffer
  return fullText
}

export function isGatewayTimeoutPayload(status: number, payload: string) {
  return status === 504 || /504 Gateway Time-out|openresty/i.test(payload)
}

export function responseDebugHeaders(response: Response) {
  const allowList = ['x-request-id', 'server', 'date', 'content-type']
  return allowList
    .map((key) => {
      const value = response.headers.get(key)
      return value ? `${key}: ${value}` : ''
    })
    .filter(Boolean)
    .join('\n')
}
