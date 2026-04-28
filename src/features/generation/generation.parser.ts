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
