import type { Dispatch, FormEvent, MutableRefObject, SetStateAction } from 'react'
import type { ProviderConfig } from '@/features/provider/provider.types'
import type { ReferenceImage } from '@/features/references/reference.types'
import type { GalleryImage } from '@/features/works/works.types'
import type { DrawBatch, DrawStrategy, DrawTask, VariationStrength } from '@/features/draw-card/drawCard.types'
import { drawStrategyOptions, variationStrengthText } from '@/features/draw-card/drawCard.constants'
import { clampDrawCount, clampDrawConcurrency, pickVariationPrompts } from '@/features/draw-card/drawCard.utils'
import {
  createGenerationTask,
  updateGenerationTask,
  type CreateGenerationTaskInput,
  type GenerationTaskRecord,
  type UpdateGenerationTaskInput,
} from '@/features/generation/generation.api'
import { singleGenerationTimeoutSec } from '@/features/generation/generation.constants'
import { requestGenerationImage } from '@/features/generation/generation.request'
import { readStoredGenerationRuntimeTasks, writeStoredGenerationRuntimeTasks } from '@/features/generation/generationTask.storage'
import type { LocalGenerationTaskRecord } from '@/features/generation/generationTask.types'
import type { GenerationError, GenerationMode, GenerationRequestOptions, GenerationStage, GenerationStatus, GenerationSnapshot } from '@/features/generation/generation.types'
import { sleep } from '@/shared/utils/sleep'

type UseGenerationFlowOptions = {
  config: ProviderConfig
  requestUrl: string
  editRequestUrl: string
  prompt: string
  studioMode: 'create' | 'draw'
  size: string
  quality: string
  stream: boolean
  referenceImages: ReferenceImage[]
  hasReferenceImage: boolean
  drawCount: number
  drawStrategy: DrawStrategy
  drawConcurrency: number
  drawSafeMode: boolean
  drawTimeoutSec: number
  drawDelayMs: number
  drawRetries: number
  variationStrength: VariationStrength
  enabledVariationDimensions: string[]
  buildPrompt: (extraPrompt?: string) => string
  setSettingsOpen: (open: boolean) => void
  setGallery: Dispatch<SetStateAction<GalleryImage[]>>
  setDrawTasks: Dispatch<SetStateAction<DrawTask[]>>
  setDrawBatches: Dispatch<SetStateAction<DrawBatch[]>>
  setActiveBatchId: Dispatch<SetStateAction<string>>
  setStatus: Dispatch<SetStateAction<GenerationStatus>>
  setStatusText: Dispatch<SetStateAction<string>>
  setResponseText: Dispatch<SetStateAction<string>>
  setLiveImageSrc: Dispatch<SetStateAction<string>>
  setPreviewImage: Dispatch<SetStateAction<GalleryImage | null>>
  setStage: Dispatch<SetStateAction<GenerationStage>>
  setElapsedMs: Dispatch<SetStateAction<number>>
  setDebounceMs: Dispatch<SetStateAction<number>>
  setDrawQueuePaused: Dispatch<SetStateAction<boolean>>
  abortRef: MutableRefObject<AbortController | null>
  cancelRequestedRef: MutableRefObject<boolean>
  drawQueuePausedRef: MutableRefObject<boolean>
  taskControllersRef: MutableRefObject<Map<string, AbortController>>
  drawTaskSnapshotsRef: MutableRefObject<Map<string, DrawTask>>
  pauseResolversRef: MutableRefObject<Array<() => void>>
  debounceTimerRef: MutableRefObject<number | null>
  startedAtRef: MutableRefObject<number>
  status: GenerationStatus
}

function isActiveDrawStatus(status: DrawTask['status']) {
  return status === 'pending' || status === 'running' || status === 'receiving' || status === 'retrying'
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function isGenerationError(value: unknown): value is GenerationError {
  return Boolean(value && typeof value === 'object' && 'code' in value && 'message' in value && 'retryable' in value)
}

function toReferencePayload(referenceImages: ReferenceImage[]) {
  return referenceImages.map((reference) => ({
    source: reference.source,
    name: reference.name,
    src: reference.src,
  }))
}

function buildTaskResult(image: GalleryImage): NonNullable<LocalGenerationTaskRecord['result']> {
  return {
    imageUrl: image.src,
    meta: image.meta,
    title: image.title,
    promptText: image.promptText,
    promptSnippet: image.promptSnippet,
    size: image.size,
    quality: image.quality,
    providerModel: image.providerModel,
    snapshotId: image.snapshotId,
    mode: image.mode,
    batchId: image.batchId,
    drawIndex: image.drawIndex,
    variation: image.variation,
    generationSnapshot: image.generationSnapshot as GenerationSnapshot | undefined,
  }
}

function toLocalTaskStatus(status: UpdateGenerationTaskInput['status']): LocalGenerationTaskRecord['status'] {
  if (status === 'succeeded') return 'succeeded'
  if (status === 'queued') return 'queued'
  if (status === 'pending') return 'queued'
  if (status === 'running') return 'running'
  if (status === 'failed') return 'failed'
  if (status === 'cancelled') return 'cancelled'
  return 'timeout'
}

function trimRuntimeTasks(tasks: LocalGenerationTaskRecord[]) {
  return [...tasks].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 30)
}

function getDrawFailureStatus(error?: GenerationError): DrawTask['status'] {
  if (error?.code === 'timeout' || error?.code === 'gateway-timeout') return 'timeout'
  return 'failed'
}

function getServerFailureStatus(error?: GenerationError): UpdateGenerationTaskInput['status'] {
  if (error?.code === 'timeout' || error?.code === 'gateway-timeout') return 'timeout'
  return 'failed'
}

function getRetryDelayMs(attempt: number) {
  return Math.min(5000, 1000 * 2 ** Math.max(0, attempt - 1))
}

export function useGenerationFlow({
  config,
  requestUrl,
  editRequestUrl,
  prompt,
  studioMode,
  size,
  quality,
  stream,
  referenceImages,
  hasReferenceImage,
  drawCount,
  drawStrategy,
  drawConcurrency,
  drawSafeMode,
  drawTimeoutSec,
  drawDelayMs,
  drawRetries,
  variationStrength,
  enabledVariationDimensions,
  buildPrompt,
  setSettingsOpen,
  setGallery,
  setDrawTasks,
  setDrawBatches,
  setActiveBatchId,
  setStatus,
  setStatusText,
  setResponseText,
  setLiveImageSrc,
  setPreviewImage,
  setStage,
  setElapsedMs,
  setDebounceMs,
  setDrawQueuePaused,
  abortRef,
  cancelRequestedRef,
  drawQueuePausedRef,
  taskControllersRef,
  drawTaskSnapshotsRef,
  pauseResolversRef,
  debounceTimerRef,
  startedAtRef,
  status,
}: UseGenerationFlowOptions) {
  function validateGenerationInput() {
    if (!config.model || !config.apiKey || !prompt.trim()) {
      setStatus('error')
      setStage('error')
      setStatusText('请先在右上角设置里补全 Model、API Key 和提示词；Provider API URL 可留空走 /sub2api 代理')
      setSettingsOpen(true)
      return false
    }
    return true
  }

  function syncTaskSnapshots(tasks: DrawTask[]) {
    drawTaskSnapshotsRef.current = new Map(tasks.map((task) => [task.id, task]))
  }

  async function mutateRuntimeTasks(mutator: (tasks: LocalGenerationTaskRecord[]) => LocalGenerationTaskRecord[]) {
    const tasks = await readStoredGenerationRuntimeTasks()
    await writeStoredGenerationRuntimeTasks(trimRuntimeTasks(mutator(tasks)))
  }

  async function upsertRuntimeTask(record: LocalGenerationTaskRecord) {
    await mutateRuntimeTasks((tasks) => {
      const nextTasks = tasks.filter((task) => task.id !== record.id)
      nextTasks.unshift(record)
      return nextTasks
    })
  }

  async function patchRuntimeTask(taskId: string, patch: Partial<LocalGenerationTaskRecord>) {
    await mutateRuntimeTasks((tasks) => tasks.map((task) => task.id === taskId ? {
      ...task,
      ...patch,
      updatedAt: patch.updatedAt ?? Date.now(),
    } : task))
  }

  function buildGenerationTaskPayload(options: {
    mode: GenerationMode
    title: string
    meta: string
    promptText: string
    workspacePrompt: string
    requestPrompt: string
    snapshotId?: string
    drawSnapshot?: GenerationRequestOptions['drawSnapshot']
  }): CreateGenerationTaskInput {
    return {
      mode: options.mode,
      title: options.title,
      meta: options.meta,
      promptText: options.promptText,
      workspacePrompt: options.workspacePrompt,
      requestPrompt: options.requestPrompt,
      snapshotId: options.snapshotId,
      size,
      quality,
      model: config.model,
      providerId: config.providerId,
      stream,
      referenceImages: referenceImages.length ? toReferencePayload(referenceImages) : undefined,
      draw: options.drawSnapshot,
    }
  }

  async function safeCreateGenerationTask(payload: CreateGenerationTaskInput) {
    try {
      return await createGenerationTask(payload)
    } catch {
      return null
    }
  }

  function syncRemoteTask(generationTaskId: string | undefined, payload: UpdateGenerationTaskInput) {
    if (!generationTaskId) return
    void updateGenerationTask(generationTaskId, payload).catch(() => undefined)
  }

  function patchTask(taskId: string, patch: Partial<DrawTask>, remotePatch?: UpdateGenerationTaskInput) {
    const currentTask = drawTaskSnapshotsRef.current.get(taskId)
    const nextPatch = {
      ...patch,
      updatedAt: patch.updatedAt ?? Date.now(),
    }
    setDrawTasks((items) => {
      const nextItems = items.map((item) => (item.id === taskId ? { ...item, ...nextPatch } : item))
      syncTaskSnapshots(nextItems)
      return nextItems
    })
    const generationTaskId = patch.generationTaskId ?? currentTask?.generationTaskId
    if (remotePatch) syncRemoteTask(generationTaskId, remotePatch)
  }

  function updateBatchCounts(batchId: string) {
    const tasks = [...drawTaskSnapshotsRef.current.values()].filter((task) => task.batchId === batchId)
    setDrawBatches((items) => items.map((item) => item.id === batchId ? {
      ...item,
      successCount: tasks.filter((task) => task.status === 'success').length,
      failedCount: tasks.filter((task) => task.status === 'failed').length,
      cancelledCount: tasks.filter((task) => task.status === 'cancelled').length,
      interruptedCount: tasks.filter((task) => task.status === 'interrupted').length,
      timeoutCount: tasks.filter((task) => task.status === 'timeout').length,
    } : item))
  }

  function wakePausedQueue() {
    pauseResolversRef.current.splice(0).forEach((resolve) => resolve())
  }

  async function waitForQueueResume() {
    while (drawQueuePausedRef.current && !cancelRequestedRef.current) {
      setStage('queued')
      setStatusText('抽卡队列已暂停，运行中任务完成后不再领取新任务')
      await new Promise<void>((resolve) => {
        pauseResolversRef.current.push(resolve)
      })
    }
    if (cancelRequestedRef.current) throw new DOMException('cancelled', 'AbortError')
  }

  async function requestGeneration(options: GenerationRequestOptions) {
    return requestGenerationImage({
      config,
      requestUrl,
      editRequestUrl,
      size,
      quality,
      stream,
      referenceImages,
      hasReferenceImage,
      abortRef,
      setStage,
      setResponseText,
      setLiveImageSrc,
      setPreviewImage,
    }, options)
  }

  async function runGeneration() {
    if (!validateGenerationInput() || abortRef.current) return
    cancelRequestedRef.current = false
    const snapshotId = crypto.randomUUID()
    const workspacePrompt = prompt.trim()
    const requestPrompt = buildPrompt()
    const mode: GenerationMode = hasReferenceImage ? 'image2image' : 'text2image'
    const title = prompt.slice(0, 28)
    const meta = `${hasReferenceImage ? '图生图' : '文生图'} · ${config.model} · ${size} · ${quality}`
    const payload = buildGenerationTaskPayload({
      mode,
      title,
      meta,
      promptText: requestPrompt,
      workspacePrompt,
      requestPrompt,
      snapshotId,
    })
    const createdTask = await safeCreateGenerationTask(payload)
    const runtimeTaskId = snapshotId
    const startedAt = Date.now()

    await upsertRuntimeTask({
      id: runtimeTaskId,
      mode,
      title,
      meta,
      promptText: requestPrompt,
      workspacePrompt,
      requestPrompt,
      snapshotId,
      generationTaskId: createdTask?.id,
      status: 'queued',
      createdAt: startedAt,
      updatedAt: startedAt,
      retryCount: 0,
      progress: 5,
    })

    startedAtRef.current = startedAt
    setStatus('loading')
    setStage('connecting')
    setElapsedMs(0)
    setStatusText('正在连接生图服务')
    setResponseText('')
    setLiveImageSrc('')
    setPreviewImage(null)

    syncRemoteTask(createdTask?.id, { status: 'running', progress: 15 })
    await patchRuntimeTask(runtimeTaskId, { status: 'running', progress: 15, startedAt })

    let receivingSynced = false

    try {
      const nextImage = await requestGeneration({
        promptText: requestPrompt,
        workspacePrompt,
        mode,
        title,
        meta,
        timeoutSec: singleGenerationTimeoutSec,
        snapshotId,
        onReceiveImage: () => {
          if (receivingSynced) return
          receivingSynced = true
          syncRemoteTask(createdTask?.id, { status: 'running', progress: 75 })
          void patchRuntimeTask(runtimeTaskId, { status: 'receiving', progress: 75 })
        },
      })
      setGallery((items) => [nextImage, ...items])
      setStatus('success')
      setStage('success')
      setStatusText(nextImage.src ? '生成成功，图片已加入作品区' : '请求成功，未解析到图片，已保留响应')
      const finishedAt = Date.now()
      const result = buildTaskResult(nextImage)
      syncRemoteTask(createdTask?.id, { status: 'succeeded', progress: 100, result })
      await patchRuntimeTask(runtimeTaskId, { status: 'succeeded', progress: 100, result, finishedAt })
    } catch (error) {
      if (isAbortError(error) || isGenerationError(error) && error.code === 'abort') {
        const finishedAt = Date.now()
        setStatus('idle')
        setStage('cancelled')
        setStatusText('已取消当前生成任务')
        syncRemoteTask(createdTask?.id, { status: 'cancelled', errorMessage: '用户已取消当前生成任务' })
        await patchRuntimeTask(runtimeTaskId, {
          status: 'cancelled',
          errorCode: 'abort',
          errorMessage: '用户已取消当前生成任务',
          finishedAt,
        })
        return
      }
      const generationError = isGenerationError(error) ? error : undefined
      const finishedAt = Date.now()
      const failureStatus = getServerFailureStatus(generationError)
      setStatus('error')
      setStage('error')
      setStatusText(`生成失败：${generationError?.message ?? '未知错误'}`)
      syncRemoteTask(createdTask?.id, { status: failureStatus, errorMessage: generationError?.message ?? '未知错误' })
      await patchRuntimeTask(runtimeTaskId, {
        status: toLocalTaskStatus(failureStatus),
        errorCode: generationError?.code ?? 'unknown',
        errorMessage: generationError?.message ?? '未知错误',
        retryable: generationError?.retryable ?? true,
        finishedAt,
      })
    } finally {
      startedAtRef.current = 0
      abortRef.current = null
    }
  }

  function buildDrawRequestOptions(task: DrawTask, attempt: number, total: number, concurrency: number, workspacePrompt: string, drawMode: GenerationMode, batchSnapshotId: string, abortController: AbortController): GenerationRequestOptions {
    return {
      promptText: task.prompt,
      workspacePrompt,
      mode: drawMode,
      title: task.title,
      meta: task.meta,
      variation: task.variation,
      batchId: task.batchId,
      drawIndex: task.index,
      taskId: task.id,
      snapshotId: task.snapshotId,
      timeoutSec: drawTimeoutSec,
      qualityValue: drawSafeMode ? 'low' : quality,
      streamValue: true,
      previewMode: 'none',
      abortController,
      drawSnapshot: {
        count: total,
        strategy: drawStrategy,
        concurrency,
        delayMs: drawDelayMs,
        retries: drawRetries,
        timeoutSec: drawTimeoutSec,
        safeMode: drawSafeMode,
        variationStrength,
        dimensions: [...enabledVariationDimensions],
        batchId: task.batchId,
        batchSnapshotId,
        drawIndex: task.index,
        variation: task.variation,
      },
      onReceiveImage: () => {
        const currentTask = drawTaskSnapshotsRef.current.get(task.id) ?? task
        if (currentTask.status === 'receiving') return
        patchTask(task.id, {
          status: 'receiving',
          retryCount: attempt,
          error: undefined,
          errorCode: undefined,
        }, {
          status: 'running',
          progress: 75,
          errorMessage: undefined,
        })
      },
    }
  }

  async function executeDrawTask(task: DrawTask, options: {
    total: number
    concurrency: number
    workspacePrompt: string
    drawMode: GenerationMode
    batchSnapshotId: string
    maxRetries: number
    manualRetry?: boolean
    onSuccess?: (image: GalleryImage) => void
    onFailure?: (task: DrawTask) => void
  }) {
    const latest = drawTaskSnapshotsRef.current.get(task.id) ?? task
    if (latest.status === 'cancelled') return 'cancelled' as const

    patchTask(task.id, {
      status: 'running',
      startedAt: Date.now(),
      error: undefined,
      errorCode: undefined,
      image: undefined,
      retryable: true,
    }, {
      status: 'running',
      progress: 15,
      errorMessage: undefined,
    })

    for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
      await waitForQueueResume()
      const current = drawTaskSnapshotsRef.current.get(task.id) ?? task
      if (current.status === 'cancelled') return 'cancelled' as const
      if (attempt > 0) {
        patchTask(task.id, { status: 'retrying', retryCount: attempt }, {
          status: 'running',
          progress: 20,
          errorMessage: undefined,
        })
        setStatusText(`第 ${task.index} 张重试中（${attempt}/${options.maxRetries}）`)
        await sleep(getRetryDelayMs(attempt))
        await waitForQueueResume()
      }

      const controller = new AbortController()
      taskControllersRef.current.set(task.id, controller)
      try {
        const image = await requestGeneration(buildDrawRequestOptions(task, attempt, options.total, options.concurrency, options.workspacePrompt, options.drawMode, options.batchSnapshotId, controller))
        taskControllersRef.current.delete(task.id)
        const finishedAt = Date.now()
        patchTask(task.id, {
          status: 'success',
          image,
          retryCount: attempt,
          finishedAt,
          error: undefined,
          errorCode: undefined,
          retryable: undefined,
        }, {
          status: 'succeeded',
          progress: 100,
          result: buildTaskResult(image),
        })
        setGallery((items) => [image, ...items])
        setPreviewImage(image)
        options.onSuccess?.(image)
        return 'success' as const
      } catch (error) {
        taskControllersRef.current.delete(task.id)
        if (controller.signal.aborted || (isGenerationError(error) && error.code === 'abort')) {
          patchTask(task.id, {
            status: 'cancelled',
            error: '用户已取消该任务',
            errorCode: 'abort',
            finishedAt: Date.now(),
            retryable: false,
          }, {
            status: 'cancelled',
            errorMessage: '用户已取消该任务',
          })
          return 'cancelled' as const
        }
        if (cancelRequestedRef.current || isAbortError(error)) throw error
        const generationError = isGenerationError(error) ? error : undefined
        const message = generationError?.message ?? '未知错误'
        if (attempt >= options.maxRetries) {
          const failedStatus = getDrawFailureStatus(generationError)
          const failedTask = {
            ...(drawTaskSnapshotsRef.current.get(task.id) ?? task),
            status: failedStatus,
            error: message,
            errorCode: generationError?.code ?? 'unknown',
            retryable: generationError?.retryable ?? true,
            retryCount: attempt,
            finishedAt: Date.now(),
          }
          patchTask(task.id, failedTask, {
            status: getServerFailureStatus(generationError),
            errorMessage: message,
          })
          options.onFailure?.(failedTask)
          return failedStatus
        }
      }
    }
    return 'failed' as const
  }

  async function runDrawGeneration() {
    if (!validateGenerationInput() || abortRef.current) return
    const total = clampDrawCount(drawCount)
    const stableQuality = drawSafeMode ? 'low' : quality
    const workspacePrompt = prompt.trim()
    const batchId = `Batch ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`
    const batchSnapshotId = crypto.randomUUID()
    const drawMode: GenerationMode = hasReferenceImage ? 'draw-image2image' : 'draw-text2image'
    const concurrency = clampDrawConcurrency(drawConcurrency)
    const draftTasks: DrawTask[] = Array.from({ length: total }, (_, taskIndex) => {
      const index = taskIndex + 1
      const variationPrompts = pickVariationPrompts(enabledVariationDimensions, index)
      const variationLabel = variationPrompts.map((item) => item.split('：')[0]).join(' / ')
      return {
        id: crypto.randomUUID(),
        index,
        title: `变体 #${index}`,
        prompt: buildPrompt([
          '图片抽卡模式：基于完全相同的主提示词、负面提示词和硬参数生成一组相近图片。',
          variationStrengthText[variationStrength],
          `本张轻量变化：${variationPrompts.join('；')}。`,
          '不要改变主体设定，不要跳出原始提示词主题；只允许形成同组作品内的自然差异。',
        ].join('\n')),
        meta: `${batchId} · ${hasReferenceImage ? '参考图抽卡' : '文生图抽卡'} · ${variationLabel} · ${config.model} · ${size} · ${stableQuality}`,
        variation: variationLabel,
        batchId,
        snapshotId: crypto.randomUUID(),
        status: 'pending',
        retryCount: 0,
        updatedAt: Date.now(),
      }
    })

    const tasks: DrawTask[] = await Promise.all(draftTasks.map(async (task) => {
      const payload = buildGenerationTaskPayload({
        mode: drawMode,
        title: task.title,
        meta: task.meta,
        promptText: task.prompt,
        workspacePrompt,
        requestPrompt: task.prompt,
        snapshotId: task.snapshotId,
        drawSnapshot: {
          count: total,
          strategy: drawStrategy,
          concurrency,
          delayMs: drawDelayMs,
          retries: drawRetries,
          timeoutSec: drawTimeoutSec,
          safeMode: drawSafeMode,
          variationStrength,
          dimensions: [...enabledVariationDimensions],
          batchId,
          batchSnapshotId,
          drawIndex: task.index,
          variation: task.variation,
        },
      })
      const createdTask = await safeCreateGenerationTask(payload)
      return {
        ...task,
        generationTaskId: createdTask?.id,
      }
    }))

    const results: GalleryImage[] = []
    const failures: DrawTask[] = []
    let cursor = 0
    let completed = 0
    let running = 0

    const updateQueueStatus = () => {
      const pending = [...drawTaskSnapshotsRef.current.values()].filter((task) => task.status === 'pending').length
      setStatusText(`抽卡中：${completed}/${total} 已处理 · ${running} 运行中 · ${pending} 排队中 · 并发 ${concurrency}${drawQueuePausedRef.current ? ' · 已暂停' : ''}`)
    }

    async function worker() {
      while (!cancelRequestedRef.current) {
        await waitForQueueResume()
        const task = tasks[cursor]
        cursor += 1
        if (!task) return
        const latest = drawTaskSnapshotsRef.current.get(task.id) ?? task
        if (latest.status === 'cancelled') {
          completed += 1
          updateQueueStatus()
          continue
        }
        running += 1
        updateQueueStatus()
        try {
          const outcome = await executeDrawTask(task, {
            total,
            concurrency,
            workspacePrompt,
            drawMode,
            batchSnapshotId,
            maxRetries: drawRetries,
            onSuccess: (image) => results.push(image),
            onFailure: (failedTask) => failures.push(failedTask),
          })
          if (outcome === 'cancelled' || outcome === 'timeout') updateBatchCounts(batchId)
        } finally {
          running = Math.max(0, running - 1)
          completed += 1
          updateQueueStatus()
          if (drawDelayMs > 0 && cursor < total && !cancelRequestedRef.current) {
            await waitForQueueResume()
            await sleep(drawDelayMs)
          }
        }
      }
    }

    cancelRequestedRef.current = false
    drawQueuePausedRef.current = false
    setDrawQueuePaused(false)
    wakePausedQueue()
    taskControllersRef.current.clear()
    syncTaskSnapshots(tasks)
    startedAtRef.current = Date.now()
    setStatus('loading')
    setStage('connecting')
    setElapsedMs(0)
    setResponseText('')
    setLiveImageSrc('')
    setPreviewImage(null)
    setDrawTasks(tasks)
    setActiveBatchId(batchId)
    setDrawBatches((items) => [{
      id: batchId,
      title: batchId,
      createdAt: Date.now(),
      strategy: drawStrategy,
      concurrency,
      count: total,
      successCount: 0,
      failedCount: 0,
      cancelledCount: 0,
      interruptedCount: 0,
      timeoutCount: 0,
      snapshotId: batchSnapshotId,
    }, ...items].slice(0, 12))
    setStatusText(`${hasReferenceImage ? '参考图抽卡' : '抽卡'}队列启动：${drawStrategyOptions.find((item) => item.value === drawStrategy)?.label} · 并发 ${concurrency} · 共 ${total} 张`)

    try {
      await Promise.all(Array.from({ length: concurrency }, () => worker()))
      if (cancelRequestedRef.current) throw new DOMException('cancelled', 'AbortError')
      updateBatchCounts(batchId)
      const timeoutCount = failures.filter((task) => task.status === 'timeout').length
      const failedCount = failures.filter((task) => task.status === 'failed').length
      const interruptedCount = failures.filter((task) => task.status === 'interrupted').length
      setStatus(failures.length ? 'error' : 'success')
      setStage(failures.length ? 'error' : 'success')
      setStatusText(failures.length
        ? `抽卡完成：成功 ${results.length} 张，失败 ${failedCount} 张，超时 ${timeoutCount} 张，中断 ${interruptedCount} 张，可手动重试异常项`
        : `抽卡完成：成功生成 ${results.length} 张相近变体`)
    } catch (error) {
      if (isAbortError(error) || isGenerationError(error) && error.code === 'abort') {
        const finishedAt = Date.now()
        setStatus('idle')
        setStage('cancelled')
        setDrawTasks((items) => {
          const nextItems = items.map((item) => isActiveDrawStatus(item.status) ? {
            ...item,
            status: 'cancelled' as const,
            error: '队列已取消',
            errorCode: 'abort',
            finishedAt,
            updatedAt: finishedAt,
            retryable: false,
          } : item)
          syncTaskSnapshots(nextItems)
          nextItems.forEach((task) => {
            if (task.status === 'cancelled') {
              syncRemoteTask(task.generationTaskId, { status: 'cancelled', errorMessage: '队列已取消' })
            }
          })
          return nextItems
        })
        updateBatchCounts(batchId)
        setStatusText(`抽卡已取消，已保留成功生成的 ${results.length} 张`)
        return
      }
      setStatus('error')
      setStage('error')
      const generationError = isGenerationError(error) ? error : undefined
      setStatusText(`抽卡中断：${generationError?.message ?? '未知错误'}。已保留成功生成的 ${results.length} 张`)
    } finally {
      startedAtRef.current = 0
      abortRef.current = null
      taskControllersRef.current.clear()
      drawQueuePausedRef.current = false
      setDrawQueuePaused(false)
      wakePausedQueue()
    }
  }

  function handlePauseQueue() {
    if (status !== 'loading') return
    drawQueuePausedRef.current = true
    setDrawQueuePaused(true)
    setStatusText('抽卡队列已暂停：运行中任务继续，新的任务和自动重试将等待继续')
  }

  function handleResumeQueue() {
    drawQueuePausedRef.current = false
    setDrawQueuePaused(false)
    wakePausedQueue()
    setStatusText('抽卡队列已继续，等待中的 worker 将恢复领取任务')
  }

  function handleCancelDrawTask(taskId: string) {
    const task = drawTaskSnapshotsRef.current.get(taskId)
    if (!task || task.status === 'success' || task.status === 'failed' || task.status === 'cancelled' || task.status === 'timeout' || task.status === 'interrupted') return
    patchTask(taskId, {
      status: 'cancelled',
      error: '用户已取消该任务',
      errorCode: 'abort',
      finishedAt: Date.now(),
      retryable: false,
    }, {
      status: 'cancelled',
      errorMessage: '用户已取消该任务',
    })
    const controller = taskControllersRef.current.get(taskId)
    if (controller) {
      controller.abort()
      taskControllersRef.current.delete(taskId)
    }
    updateBatchCounts(task.batchId)
    setStatusText(`已取消 ${task.title}，运行中请求会被单独中断，其他任务继续`)
  }

  async function handleRetryDrawTask(taskId: string) {
    if (status === 'loading') {
      setStatusText('队列运行中，请等待当前批次结束后再手动重试失败任务')
      return
    }
    const task = drawTaskSnapshotsRef.current.get(taskId)
    if (!task || !['failed', 'timeout', 'interrupted'].includes(task.status) || task.retryable === false) {
      if (task?.retryable === false) setStatusText(`${task.title} 不可重试`)
      return
    }
    if (!validateGenerationInput()) return
    cancelRequestedRef.current = false
    const batch = [...drawTaskSnapshotsRef.current.values()].filter((item) => item.batchId === task.batchId)
    const total = Math.max(batch.length, task.index)
    const batchSnapshotId = crypto.randomUUID()
    const concurrency = 1
    const drawMode: GenerationMode = hasReferenceImage ? 'draw-image2image' : 'draw-text2image'
    const workspacePrompt = prompt.trim()

    startedAtRef.current = Date.now()
    setStatus('loading')
    setStage('connecting')
    setElapsedMs(0)
    setStatusText(`正在手动重试 ${task.title}`)
    try {
      const outcome = await executeDrawTask(task, {
        total,
        concurrency,
        workspacePrompt,
        drawMode,
        batchSnapshotId,
        maxRetries: 0,
        manualRetry: true,
      })
      updateBatchCounts(task.batchId)
      setStatus(outcome === 'success' ? 'success' : 'error')
      setStage(outcome === 'success' ? 'success' : outcome === 'cancelled' ? 'cancelled' : 'error')
      setStatusText(outcome === 'success' ? `${task.title} 重试成功，图片已加入作品区` : `${task.title} 重试未成功`)
    } catch (error) {
      if (isAbortError(error) || isGenerationError(error) && error.code === 'abort') {
        setStatus('idle')
        setStage('cancelled')
        setStatusText(`${task.title} 重试已取消`)
        return
      }
      const generationError = isGenerationError(error) ? error : undefined
      setStatus('error')
      setStage('error')
      setStatusText(`${task.title} 重试失败：${generationError?.message ?? '未知错误'}`)
    } finally {
      startedAtRef.current = 0
      taskControllersRef.current.delete(taskId)
      drawQueuePausedRef.current = false
      setDrawQueuePaused(false)
      wakePausedQueue()
    }
  }

  function handleCancelAllQueue() {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
      setDebounceMs(0)
    }
    cancelRequestedRef.current = true
    drawQueuePausedRef.current = false
    setDrawQueuePaused(false)
    wakePausedQueue()
    abortRef.current?.abort()
    taskControllersRef.current.forEach((controller) => controller.abort())
    taskControllersRef.current.clear()
    setDrawTasks((items) => {
      const finishedAt = Date.now()
      const nextItems = items.map((item) => isActiveDrawStatus(item.status) ? {
        ...item,
        status: 'cancelled' as const,
        error: '队列已全部取消',
        errorCode: 'abort',
        finishedAt,
        updatedAt: finishedAt,
        retryable: false,
      } : item)
      syncTaskSnapshots(nextItems)
      nextItems.forEach((task) => {
        if (task.status === 'cancelled') {
          syncRemoteTask(task.generationTaskId, { status: 'cancelled', errorMessage: '队列已全部取消' })
        }
      })
      return nextItems
    })
    setStatus('idle')
    setStage('cancelled')
    setStatusText('已取消全部队列任务')
  }

  function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'loading' || debounceTimerRef.current) return
    setStatus('loading')
    setStage('queued')
    setStatusText('已进入防抖队列，马上开始生成')
    setDebounceMs(650)
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null
      setDebounceMs(0)
      void (studioMode === 'draw' ? runDrawGeneration() : runGeneration())
    }, 650)
  }

  function handleCancelGeneration() {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
      setDebounceMs(0)
      setStatus('idle')
      setStage('cancelled')
      setStatusText('已取消排队中的生成任务')
      return
    }
    if (studioMode === 'draw') {
      handleCancelAllQueue()
      return
    }
    cancelRequestedRef.current = true
    abortRef.current?.abort()
  }

  return {
    handleGenerate,
    handleCancelGeneration,
    handlePauseQueue,
    handleResumeQueue,
    handleCancelDrawTask,
    handleRetryDrawTask,
    handleCancelAllQueue,
    runGeneration,
    runDrawGeneration,
  }
}
