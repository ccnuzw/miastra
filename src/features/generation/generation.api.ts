import { apiRequest } from '@/shared/http/client'
import { editEndpoint, generationEndpoint } from './generation.constants'
import { extractGenerationError, extractImageSrc, readGenerationResponse, responseDebugHeaders } from './generation.parser'

export type GenerationTaskRecord = {
  id: string
  userId: string
  status: 'pending' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'timeout'
  progress?: number
  createdAt: string
  updatedAt: string
  errorMessage?: string
  payload: {
    mode: string
    title: string
    meta: string
    promptText: string
    workspacePrompt: string
    requestPrompt: string
    snapshotId?: string
    size: string
    quality: string
    model: string
    providerId: string
    stream: boolean
  }
  result?: {
    imageUrl?: string
    meta?: string
    title?: string
    promptText?: string
    promptSnippet?: string
    size?: string
    quality?: string
    providerModel?: string
    snapshotId?: string
    mode?: string
    batchId?: string
    drawIndex?: number
    variation?: string
    generationSnapshot?: unknown
  }
}

type GenerationRequestBody = {
  model: string
  prompt: string
  size: string
  quality?: string
  n?: number
  stream?: boolean
}

type GenerationFormResult = {
  response: Response
  debugHeaders: string
  text: string
  latestImageSrc: string
}

export async function postJsonImageGeneration(params: {
  requestUrl: string
  apiKey: string
  signal: AbortSignal
  body: GenerationRequestBody
  onImage?: (src: string) => void
}): Promise<GenerationFormResult> {
  const response = await fetch(params.requestUrl || generationEndpoint, {
    method: 'POST',
    signal: params.signal,
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params.body),
  })

  const text = await readGenerationResponse(response, (src) => params.onImage?.(src))
  return {
    response,
    debugHeaders: responseDebugHeaders(response),
    text,
    latestImageSrc: extractImageSrc(text),
  }
}

export async function postFormImageGeneration(params: {
  requestUrl: string
  apiKey: string
  signal: AbortSignal
  formData: FormData
  onImage?: (src: string) => void
}): Promise<GenerationFormResult> {
  const response = await fetch(params.requestUrl || editEndpoint, {
    method: 'POST',
    signal: params.signal,
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: params.formData,
  })

  const text = await readGenerationResponse(response, (src) => params.onImage?.(src))
  return {
    response,
    debugHeaders: responseDebugHeaders(response),
    text,
    latestImageSrc: extractImageSrc(text),
  }
}

export { extractGenerationError, extractImageSrc, readGenerationResponse, responseDebugHeaders }

export async function listGenerationTasks() {
  return apiRequest<GenerationTaskRecord[]>('/api/generation-tasks')
}

export async function cancelGenerationTask(id: string) {
  return apiRequest<GenerationTaskRecord>(`/api/generation-tasks/${id}/cancel`, { method: 'POST' })
}
