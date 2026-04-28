import { readGenerationResponse, responseDebugHeaders } from './generation.parser'

export type ImageApiTransportResult = {
  response: Response
  debugHeaders: string
  text: string
  latestImageSrc: string
}

type JsonGenerationParams = {
  requestUrl: string
  apiKey: string
  signal: AbortSignal
  body: Record<string, unknown>
  onImage?: (src: string) => void
}

type FormGenerationParams = {
  requestUrl: string
  apiKey: string
  signal: AbortSignal
  formData: FormData
  onImage?: (src: string) => void
}

export async function postJsonImageGeneration(params: JsonGenerationParams): Promise<ImageApiTransportResult> {
  const response = await fetch(params.requestUrl, {
    method: 'POST',
    signal: params.signal,
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params.body),
  })

  const debugHeaders = responseDebugHeaders(response)
  let latestImageSrc = ''
  const text = await readGenerationResponse(response, (src) => {
    latestImageSrc = src
    params.onImage?.(src)
  })

  return { response, debugHeaders, text, latestImageSrc }
}

export async function postFormImageGeneration(params: FormGenerationParams): Promise<ImageApiTransportResult> {
  const response = await fetch(params.requestUrl, {
    method: 'POST',
    signal: params.signal,
    headers: { Authorization: `Bearer ${params.apiKey}` },
    body: params.formData,
  })

  const debugHeaders = responseDebugHeaders(response)
  let latestImageSrc = ''
  const text = await readGenerationResponse(response, (src) => {
    latestImageSrc = src
    params.onImage?.(src)
  })

  return { response, debugHeaders, text, latestImageSrc }
}
