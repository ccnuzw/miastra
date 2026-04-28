import type { Dispatch, FormEvent, MutableRefObject, SetStateAction } from 'react'
import type { ProviderConfig } from '@/features/provider/provider.types'
import type { ReferenceImage } from '@/features/references/reference.types'
import type { GalleryImage } from '@/features/works/works.types'
import type { DrawBatch, DrawStrategy, DrawTask, VariationStrength } from '@/features/draw-card/drawCard.types'
import { drawStrategyOptions, variationStrengthText } from '@/features/draw-card/drawCard.constants'
import { clampDrawCount, clampDrawConcurrency, pickVariationPrompts } from '@/features/draw-card/drawCard.utils'
import type { GenerationStage, GenerationStatus } from '@/features/generation/generation.types'
import { singleGenerationTimeoutSec } from '@/features/generation/generation.constants'
import { requestGenerationImage } from '@/features/generation/generation.request'
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
  abortRef: MutableRefObject<AbortController | null>
  cancelRequestedRef: MutableRefObject<boolean>
  debounceTimerRef: MutableRefObject<number | null>
  startedAtRef: MutableRefObject<number>
  status: GenerationStatus
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
  abortRef,
  cancelRequestedRef,
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


  async function requestGeneration(options: Parameters<typeof requestGenerationImage>[1]) {
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
    startedAtRef.current = Date.now()
    setStatus('loading')
    setStage('connecting')
    setElapsedMs(0)
    setStatusText('正在连接生图服务')
    setResponseText('')
    setLiveImageSrc('')
    setPreviewImage(null)

    try {
      const snapshotId = crypto.randomUUID()
      const nextImage = await requestGeneration({
        promptText: buildPrompt(),
        title: prompt.slice(0, 28),
        meta: `${hasReferenceImage ? '图生图' : '文生图'} · ${config.model} · ${size} · ${quality}`,
        timeoutSec: singleGenerationTimeoutSec,
        snapshotId,
      })
      setGallery((items) => [nextImage, ...items])
      setStatus('success')
      setStage('success')
      setStatusText(nextImage.src ? '生成成功，图片已加入作品区' : '请求成功，未解析到图片，已保留响应')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setStatus('idle')
        setStage('cancelled')
        setStatusText('已取消当前生成任务')
        return
      }
      setStatus('error')
      setStage('error')
      const message = error instanceof Error ? error.message : '未知错误'
      const isFetchFailure = /failed to fetch/i.test(message)
      setStatusText(isFetchFailure ? '生成失败：浏览器无法访问远端 API，通常是 CORS 或网络不可达' : `生成失败：${message}`)
    } finally {
      startedAtRef.current = 0
      abortRef.current = null
    }
  }

  async function runDrawGeneration() {
    if (!validateGenerationInput() || abortRef.current) return
    const total = clampDrawCount(drawCount)
    const stableQuality = drawSafeMode ? 'low' : quality
    const stableStream = true
    const batchId = `Batch ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`
    const snapshotId = crypto.randomUUID()
    const concurrency = clampDrawConcurrency(drawConcurrency)
    const tasks: DrawTask[] = Array.from({ length: total }, (_, taskIndex) => {
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
        snapshotId,
        status: 'pending',
        retryCount: 0,
      }
    })
    const results: GalleryImage[] = []
    const failures: DrawTask[] = []
    let cursor = 0
    let completed = 0
    let running = 0

    const patchTask = (taskId: string, patch: Partial<DrawTask>) => {
      setDrawTasks((items) => items.map((item) => (item.id === taskId ? { ...item, ...patch } : item)))
    }

    const updateQueueStatus = () => {
      const pending = Math.max(0, total - completed - running)
      setStatusText(`抽卡中：${completed}/${total} 已处理 · ${running} 运行中 · ${pending} 排队中 · 并发 ${concurrency}`)
    }

    async function executeTask(task: DrawTask) {
      running += 1
      patchTask(task.id, { status: 'running', startedAt: Date.now(), error: undefined })
      updateQueueStatus()
      for (let attempt = 0; attempt <= drawRetries; attempt += 1) {
        if (cancelRequestedRef.current) throw new DOMException('cancelled', 'AbortError')
        if (attempt > 0) {
          patchTask(task.id, { status: 'retrying', retryCount: attempt })
          setStatusText(`第 ${task.index} 张重试中（${attempt}/${drawRetries}）`)
          await sleep(900)
        }
        try {
          const image = await requestGeneration({
            promptText: task.prompt,
            title: task.title,
            meta: task.meta,
            variation: task.variation,
            batchId: task.batchId,
            drawIndex: task.index,
            snapshotId: task.snapshotId,
            timeoutSec: drawTimeoutSec,
            qualityValue: stableQuality,
            streamValue: stableStream,
            previewMode: 'none',
            onReceiveImage: () => patchTask(task.id, { status: 'receiving', retryCount: attempt }),
          })
          results.push(image)
          patchTask(task.id, { status: 'success', image, retryCount: attempt, finishedAt: Date.now() })
          setGallery((items) => [image, ...items])
          setPreviewImage(image)
          return
        } catch (error) {
          if (cancelRequestedRef.current) throw error
          const message = error instanceof Error ? error.message : '未知错误'
          if (attempt >= drawRetries) {
            failures.push({ ...task, status: 'failed', error: message, retryCount: attempt, finishedAt: Date.now() })
            patchTask(task.id, { status: 'failed', error: message, retryCount: attempt, finishedAt: Date.now() })
            return
          }
        }
      }
    }

    async function worker() {
      while (!cancelRequestedRef.current) {
        const task = tasks[cursor]
        cursor += 1
        if (!task) return
        try {
          await executeTask(task)
        } finally {
          running = Math.max(0, running - 1)
          completed += 1
          updateQueueStatus()
          if (drawDelayMs > 0 && cursor < total && !cancelRequestedRef.current) await sleep(drawDelayMs)
        }
      }
    }

    cancelRequestedRef.current = false
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
      snapshotId,
    }, ...items].slice(0, 12))
    setStatusText(`${hasReferenceImage ? '参考图抽卡' : '抽卡'}队列启动：${drawStrategyOptions.find((item) => item.value === drawStrategy)?.label} · 并发 ${concurrency} · 共 ${total} 张`)

    try {
      await Promise.all(Array.from({ length: concurrency }, () => worker()))
      if (cancelRequestedRef.current) throw new DOMException('cancelled', 'AbortError')
      setDrawBatches((items) => items.map((item) => item.id === batchId ? { ...item, successCount: results.length, failedCount: failures.length } : item))
      setStatus(failures.length ? 'error' : 'success')
      setStage(failures.length ? 'error' : 'success')
      setStatusText(failures.length ? `抽卡完成：成功 ${results.length} 张，失败 ${failures.length} 张` : `抽卡完成：成功生成 ${results.length} 张相近变体`)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setStatus('idle')
        setStage('cancelled')
        setDrawTasks((items) => items.map((item) => (item.status === 'pending' || item.status === 'running' || item.status === 'receiving' || item.status === 'retrying') ? { ...item, status: 'cancelled' } : item))
        setDrawBatches((items) => items.map((item) => item.id === batchId ? { ...item, successCount: results.length, failedCount: failures.length } : item))
        setStatusText(`抽卡已取消，已保留成功生成的 ${results.length} 张`)
        return
      }
      setStatus('error')
      setStage('error')
      const message = error instanceof Error ? error.message : '未知错误'
      setStatusText(`抽卡中断：${message}。已保留成功生成的 ${results.length} 张`)
    } finally {
      startedAtRef.current = 0
      abortRef.current = null
    }
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
    cancelRequestedRef.current = true
    abortRef.current?.abort()
  }

  return {
    handleGenerate,
    handleCancelGeneration,
    runGeneration,
    runDrawGeneration,
  }
}
