import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { getGenerationTaskDomainStore } from '../lib/domain-store'
import type { StoredGenerationTask, StoredWork } from '../auth/types'
import { consumeQuota, refundQuota } from '../billing/ledger'
import { storeRepository } from '../lib/store'
import { findStoredProviderConfigByUserId, resolveEffectiveProviderConfig, type ResolvedProviderRuntimeConfig } from '../provider-config/provider.service'
import { joinProviderUrl } from '../provider-config/provider.utils'

const generationEndpoint = '/v1/images/generations'
const editEndpoint = '/v1/images/edits'
const activeTaskIds = new Set<string>()
const activeControllers = new Map<string, AbortController>()
let started = false
let tickTimer: NodeJS.Timeout | null = null
let draining = false

const defaultTimeoutSec = 90

type WorkerLogger = {
  info?: (payload: unknown, message?: string) => void
  warn?: (payload: unknown, message?: string) => void
  error?: (payload: unknown, message?: string) => void
}

type ExecutionResult = {
  imageUrl: string
  responseText: string
  mode: StoredGenerationTask['payload']['mode']
  providerModel: string
}

type TaskClaim = {
  task: StoredGenerationTask
  chargedQuota: boolean
}

function getWorkerRuntimeConfig() {
  return {
    intervalMs: Number(process.env.GENERATION_WORKER_INTERVAL_MS ?? 1200),
    concurrency: Math.max(1, Number(process.env.GENERATION_WORKER_CONCURRENCY ?? 2)),
    fallbackProxyOrigin: process.env.GENERATION_PROXY_ORIGIN ?? 'http://127.0.0.1:5173',
  }
}

function resolveProviderRequestUrl(task: StoredGenerationTask, config: Pick<ResolvedProviderRuntimeConfig, 'apiUrl'>) {
  const baseUrl = config.apiUrl
  const endpoint = task.payload.mode === 'image2image' || task.payload.mode === 'draw-image2image'
    ? editEndpoint
    : generationEndpoint
  return joinProviderUrl(baseUrl, endpoint)
}

function resolveSnapshotRequestUrl(task: StoredGenerationTask, requestUrl: string, exposeApiUrl: boolean) {
  if (exposeApiUrl) return requestUrl
  return task.payload.mode === 'image2image' || task.payload.mode === 'draw-image2image'
    ? editEndpoint
    : generationEndpoint
}

function extractImageSrc(payload: string) {
  try {
    const json = JSON.parse(payload)
    const item = json.data?.[0]
    const b64 = item?.b64_json || item?.b64 || item?.image_base64
    if (b64) return String(b64).startsWith('data:') ? String(b64) : `data:image/png;base64,${String(b64)}`
    return String(item?.url || json.url || json.image_url || '')
  } catch {
    const dataUrl = payload.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/)?.[0]
    if (dataUrl) return dataUrl
    const b64 = payload.match(/"b64_json"\s*:\s*"([^"]+)"/)?.[1]
    if (b64) return `data:image/png;base64,${b64}`
    return ''
  }
}

function extractGenerationError(payload: string) {
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
    }
  }

  return ''
}

async function readGenerationResponse(response: Response) {
  const contentType = response.headers.get('content-type') || ''
  if (!response.body || !contentType.includes('text/event-stream')) return await response.text()

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
  }

  if (buffer) fullText += buffer
  return fullText
}

function buildTaskResult(
  task: StoredGenerationTask,
  execution: ExecutionResult,
  workId: string,
  snapshotId: string,
  requestUrl: string,
  apiUrl: string,
) {
  return {
    workId,
    imageUrl: execution.imageUrl,
    meta: task.payload.meta,
    title: task.payload.title,
    promptText: task.payload.requestPrompt,
    promptSnippet: task.payload.requestPrompt.slice(0, 180),
    size: task.payload.size,
    quality: task.payload.quality,
    providerModel: execution.providerModel,
    snapshotId,
    mode: execution.mode,
    batchId: task.payload.draw?.batchId,
    drawIndex: task.payload.draw?.drawIndex,
    variation: task.payload.draw?.variation,
    generationSnapshot: {
      id: snapshotId,
      createdAt: Date.now(),
      mode: execution.mode,
      prompt: task.payload.requestPrompt,
      requestPrompt: task.payload.requestPrompt,
      workspacePrompt: task.payload.workspacePrompt,
      size: task.payload.size,
      quality: task.payload.quality,
      model: execution.providerModel,
      providerId: task.payload.providerId,
      apiUrl,
      requestUrl,
      stream: task.payload.stream,
      references: task.payload.referenceImages
        ? {
            count: task.payload.referenceImages.length,
            sources: task.payload.referenceImages.map((reference) => ({
              source: reference.source,
              name: reference.name,
              assetId: reference.assetId,
              assetRemoteKey: reference.assetRemoteKey,
            })),
            note: '服务端任务执行结果快照',
          }
        : undefined,
      draw: task.payload.draw,
    },
  }
}

function buildWorkRecord(task: StoredGenerationTask, execution: ExecutionResult, requestUrl: string, apiUrl: string): StoredWork {
  const createdAt = Date.now()
  const snapshotId = task.payload.snapshotId || randomUUID()
  const workId = randomUUID()
  const result = buildTaskResult(task, execution, workId, snapshotId, requestUrl, apiUrl)
  const assetRemoteUrl = /^https?:\/\//i.test(execution.imageUrl) ? execution.imageUrl : undefined
  return {
    id: workId,
    userId: task.userId,
    title: task.payload.title,
    src: execution.imageUrl,
    assetStorage: execution.imageUrl.startsWith('data:image/') ? 'inline' : execution.imageUrl.startsWith('blob:') ? 'blob' : 'remote',
    assetSyncStatus: assetRemoteUrl ? 'synced' : execution.imageUrl.startsWith('http://') || execution.imageUrl.startsWith('https://') ? 'pending-sync' : 'local-only',
    assetRemoteUrl,
    meta: task.payload.meta,
    variation: task.payload.draw?.variation,
    batchId: task.payload.draw?.batchId,
    drawIndex: task.payload.draw?.drawIndex,
    taskStatus: 'success',
    error: undefined,
    retryable: false,
    retryCount: task.payload.tracking?.retryAttempt ?? 0,
    createdAt,
    mode: execution.mode,
    providerModel: execution.providerModel,
    size: task.payload.size,
    quality: task.payload.quality,
    snapshotId,
    generationSnapshot: result.generationSnapshot,
    promptSnippet: task.payload.requestPrompt.slice(0, 180),
    promptText: task.payload.requestPrompt,
    isFavorite: false,
    tags: [],
  }
}

async function dataUrlToFile(dataUrl: string, fileName: string) {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/)
  if (!match) throw new Error('参考图数据格式不正确')
  const mimeType = match[1] || 'application/octet-stream'
  const payload = match[3] || ''
  const bytes = Buffer.from(payload, 'base64')
  return new File([bytes], fileName, { type: mimeType })
}

async function referenceToFile(reference: NonNullable<StoredGenerationTask['payload']['referenceImages']>[number], index: number) {
  const name = reference.name?.trim() || `reference-${index + 1}.png`
  if (reference.src.startsWith('data:')) return await dataUrlToFile(reference.src, name)
  if (/^https?:\/\//i.test(reference.src)) {
    const response = await fetch(reference.src)
    if (!response.ok) throw new Error(`参考图下载失败：HTTP ${response.status}`)
    const blob = await response.blob()
    return new File([blob], name, { type: blob.type || 'application/octet-stream' })
  }
  throw new Error('当前仅支持 data URL 或 http(s) 参考图')
}

async function executeGenerationTask(task: StoredGenerationTask, config: ResolvedProviderRuntimeConfig, signal: AbortSignal): Promise<ExecutionResult> {
  const requestUrl = resolveProviderRequestUrl(task, config)
  const headers = new Headers({ authorization: `Bearer ${config.apiKey}` })
  let response: Response

  if (task.payload.mode === 'image2image' || task.payload.mode === 'draw-image2image') {
    const references = task.payload.referenceImages ?? []
    if (!references.length) throw new Error('图生图任务缺少参考图')
    const files = await Promise.all(references.map((reference, index) => referenceToFile(reference, index)))
    const formData = new FormData()
    formData.append('model', config.model.trim())
    formData.append('prompt', task.payload.requestPrompt)
    files.forEach((file) => {
      formData.append('image', file)
    })
    formData.append('size', task.payload.size)
    if (task.payload.quality?.trim()) formData.append('quality', task.payload.quality.trim())
    response = await fetch(requestUrl, {
      method: 'POST',
      signal,
      headers,
      body: formData,
    })
  } else {
    headers.set('content-type', 'application/json')
    response = await fetch(requestUrl, {
      method: 'POST',
      signal,
      headers,
      body: JSON.stringify({
        model: config.model.trim(),
        prompt: task.payload.requestPrompt,
        size: task.payload.size,
        quality: task.payload.quality,
        stream: task.payload.stream,
      }),
    })
  }

  const responseText = await readGenerationResponse(response)
  const upstreamMessage = extractGenerationError(responseText)
  if (!response.ok) throw new Error(upstreamMessage || `HTTP ${response.status} ${response.statusText}`)
  if (upstreamMessage) throw new Error(upstreamMessage)

  const imageUrl = extractImageSrc(responseText)
  if (!imageUrl) throw new Error('接口返回成功，但未解析到图片数据')

  return {
    imageUrl,
    responseText,
    mode: task.payload.mode,
    providerModel: config.model.trim(),
  }
}

async function claimTaskForExecution(logger?: WorkerLogger): Promise<TaskClaim | null> {
  const generationStore = getGenerationTaskDomainStore()
  const task = await generationStore.claimNextQueuedGenerationTask(new Date().toISOString(), [...activeTaskIds])
  if (!task) return null

  const quota = await consumeQuota(task.userId, 1)
  if (!quota.ok) {
    await generationStore.updateGenerationTask(task.id, {
      status: 'failed',
      progress: task.progress ?? 15,
      errorMessage: '额度不足，请前往 Billing 补充额度后重试',
      updatedAt: new Date().toISOString(),
    })
    logger?.warn?.({ taskId: task.id, userId: task.userId }, 'generation task blocked by quota')
    return null
  }

  return { task, chargedQuota: true }
}

function inferFailureStatus(error: unknown): StoredGenerationTask['status'] {
  if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
  const message = error instanceof Error ? error.message : String(error)
  if (/timeout|超时/i.test(message)) return 'timeout'
  return 'failed'
}

async function processTask(claim: TaskClaim, logger?: WorkerLogger) {
  const { task, chargedQuota } = claim
  activeTaskIds.add(task.id)
  const controller = new AbortController()
  activeControllers.set(task.id, controller)
  const generationStore = getGenerationTaskDomainStore()
  const timeoutSec = Math.max(20, task.payload.draw?.timeoutSec ?? defaultTimeoutSec)
  const timeout = setTimeout(() => controller.abort(), timeoutSec * 1000)

  try {
    const store = await storeRepository.read()
    const storedConfig = findStoredProviderConfigByUserId(store, task.userId)
    const resolvedProvider = resolveEffectiveProviderConfig({ store, config: storedConfig })
    if (resolvedProvider.error || !resolvedProvider.config) {
      await generationStore.updateGenerationTask(task.id, {
        status: 'failed',
        progress: task.progress ?? 15,
        errorMessage: resolvedProvider.error?.message ?? '请先补全 Provider 配置后再提交任务',
        updatedAt: new Date().toISOString(),
      })
      if (chargedQuota) await refundQuota(task.userId, 1).catch(() => undefined)
      return
    }

    logger?.info?.({ taskId: task.id, userId: task.userId }, 'generation task started')
    const config = resolvedProvider.config
    const requestUrl = resolveProviderRequestUrl(task, config)
    const snapshotRequestUrl = resolveSnapshotRequestUrl(task, requestUrl, config.exposeApiUrl)
    const execution = await executeGenerationTask(task, config, controller.signal)
    if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
    const snapshotApiUrl = config.exposeApiUrl ? config.apiUrl : ''
    const work = buildWorkRecord(task, execution, snapshotRequestUrl, snapshotApiUrl)
    const completed = await generationStore.completeGenerationTaskAndInsertWork(task.id, {
      status: 'succeeded',
      progress: 100,
      updatedAt: new Date().toISOString(),
      errorMessage: undefined,
      result: buildTaskResult(task, execution, work.id, work.snapshotId || randomUUID(), snapshotRequestUrl, snapshotApiUrl),
    }, work)
    if (completed) logger?.info?.({ taskId: task.id, workId: work.id }, 'generation task succeeded')
    else logger?.warn?.({ taskId: task.id }, 'generation task completion skipped because task is no longer running')
  } catch (error) {
    const status = inferFailureStatus(error)
    const message = error instanceof Error ? error.message : String(error)
    if (chargedQuota && status !== 'cancelled') {
      await refundQuota(task.userId, 1).catch(() => undefined)
    }
    await generationStore.updateGenerationTask(task.id, {
      status,
      progress: task.progress ?? 15,
      errorMessage: message,
      updatedAt: new Date().toISOString(),
    })
    logger?.warn?.({ taskId: task.id, status, error: message }, 'generation task failed')
  } finally {
    clearTimeout(timeout)
    activeControllers.delete(task.id)
    activeTaskIds.delete(task.id)
  }
}

async function tick(logger?: WorkerLogger) {
  if (draining) return
  draining = true
  const { concurrency } = getWorkerRuntimeConfig()
  try {
    while (activeTaskIds.size < concurrency) {
      const claim = await claimTaskForExecution(logger)
      if (!claim) break
      void processTask(claim, logger)
    }
  } catch (error) {
    logger?.error?.({ error }, 'generation worker tick failed')
  } finally {
    draining = false
  }
}

export function startGenerationTaskWorker(logger?: WorkerLogger) {
  if (started) return
  started = true
  const runtime = getWorkerRuntimeConfig()
  void tick(logger)
  tickTimer = setInterval(() => {
    void tick(logger)
  }, runtime.intervalMs)
}

export async function cancelGenerationTaskProcessing(taskId?: string) {
  const generationStore = getGenerationTaskDomainStore()
  if (!taskId) {
    await Promise.all([...activeControllers.values()].map(async (controller) => controller.abort()))
    return
  }

  const activeController = activeControllers.get(taskId)
  if (activeController) {
    activeController.abort()
    return
  }

  const task = await generationStore.findGenerationTaskById(taskId)
  if (!task) return
  if (task.status === 'queued' || task.status === 'pending') {
    await generationStore.updateGenerationTask(taskId, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
      errorMessage: '任务已取消',
    })
  }
}

export async function stopGenerationTaskWorker() {
  if (tickTimer) clearInterval(tickTimer)
  tickTimer = null
  started = false
  draining = false
  await cancelGenerationTaskProcessing()
}
