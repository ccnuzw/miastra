import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuthSession } from '@/features/auth/useAuthSession'
import type { DrawBatch, DrawStrategy, DrawTask, DrawTaskStatus, VariationStrength } from '@/features/draw-card/drawCard.types'
import { drawStrategyOptions, variationDimensions } from '@/features/draw-card/drawCard.constants'
import { listGenerationTasks, updateGenerationTask, type GenerationTaskRecord } from '@/features/generation/generation.api'
import { clampDrawConcurrency, drawStatusMeta } from '@/features/draw-card/drawCard.utils'
import type { GalleryImage } from '@/features/works/works.types'
import { readStoredDrawBatches, writeStoredDrawBatches } from './drawCard.storage'

const activeStatuses = new Set<DrawTaskStatus>(['pending', 'running', 'receiving', 'retrying'])

type DrawShortcut = 'safe3' | 'balanced5' | 'fast8' | 'turbo10'

type DrawShortcutResult = {
  quality: string
}

function normalizeBatch(batch: DrawBatch): DrawBatch {
  return {
    ...batch,
    cancelledCount: batch.cancelledCount ?? 0,
    interruptedCount: batch.interruptedCount ?? 0,
    timeoutCount: batch.timeoutCount ?? 0,
  }
}

function reconcileInterruptedTasks(tasks: DrawTask[]) {
  const now = Date.now()
  const interruptedTaskIds: string[] = []
  const nextTasks = tasks.map((task) => {
    if (!activeStatuses.has(task.status)) return task
    interruptedTaskIds.push(task.id)
    return {
      ...task,
      status: 'interrupted' as const,
      error: '工作台页面已刷新或会话中断，任务状态已转为中断，可手动重试',
      errorCode: 'interrupted',
      retryable: true,
      finishedAt: task.finishedAt ?? now,
      updatedAt: now,
    }
  })
  return { nextTasks, interruptedTaskIds }
}

function applyBatchCounts(batches: DrawBatch[], tasks: DrawTask[]) {
  if (!batches.length) return batches.map(normalizeBatch)
  return batches.map((batch) => {
    const relatedTasks = tasks.filter((task) => task.batchId === batch.id)
    return {
      ...normalizeBatch(batch),
      successCount: relatedTasks.filter((task) => task.status === 'success').length,
      failedCount: relatedTasks.filter((task) => task.status === 'failed').length,
      cancelledCount: relatedTasks.filter((task) => task.status === 'cancelled').length,
      interruptedCount: relatedTasks.filter((task) => task.status === 'interrupted').length,
      timeoutCount: relatedTasks.filter((task) => task.status === 'timeout').length,
    }
  })
}

function getLatestTaskSlotKey(task: GenerationTaskRecord) {
  if (task.batchId) return `${task.batchId}:${task.drawIndex ?? task.rootTaskId}`
  return task.rootTaskId
}

function getTaskTimestamp(task: GenerationTaskRecord) {
  return new Date(task.updatedAt).getTime() || new Date(task.createdAt).getTime()
}

function getDrawTaskStatus(status: GenerationTaskRecord['status']): DrawTaskStatus {
  if (status === 'succeeded') return 'success'
  if (status === 'failed') return 'failed'
  if (status === 'cancelled') return 'cancelled'
  if (status === 'timeout') return 'timeout'
  if (status === 'running') return 'running'
  return 'pending'
}

function buildLatestGenerationTaskMap(tasks: GenerationTaskRecord[]) {
  const latest = new Map<string, GenerationTaskRecord>()
  for (const task of tasks) {
    if (!task.payload.draw) continue
    const slotKey = getLatestTaskSlotKey(task)
    const current = latest.get(slotKey)
    if (!current) {
      latest.set(slotKey, task)
      continue
    }

    const retryDiff = (task.retryAttempt ?? 0) - (current.retryAttempt ?? 0)
    if (retryDiff > 0 || (retryDiff === 0 && getTaskTimestamp(task) > getTaskTimestamp(current))) {
      latest.set(slotKey, task)
    }
  }
  return latest
}

function toDrawTask(task: GenerationTaskRecord): DrawTask | null {
  const draw = task.payload.draw
  if (!draw) return null

  const status = getDrawTaskStatus(task.status)
  const imageUrl = task.result?.imageUrl?.trim()
  const image: GalleryImage | undefined = imageUrl ? {
    id: task.result?.workId ?? task.id,
    title: task.result?.title ?? task.payload.title,
    src: imageUrl,
    meta: task.result?.meta ?? task.payload.meta,
    variation: task.result?.variation ?? draw.variation,
    batchId: task.result?.batchId ?? draw.batchId,
    drawIndex: task.result?.drawIndex ?? draw.drawIndex,
    taskStatus: status,
    error: task.errorMessage,
    retryable: task.retryable,
    retryCount: task.retryAttempt,
    snapshotId: task.result?.snapshotId ?? task.payload.snapshotId,
    generationSnapshot: task.result?.generationSnapshot as GalleryImage['generationSnapshot'],
    promptSnippet: task.result?.promptSnippet,
    promptText: task.result?.promptText,
    mode: task.result?.mode ?? task.payload.mode,
    providerModel: task.result?.providerModel,
    size: task.result?.size,
    quality: task.result?.quality,
    generationTaskId: task.id,
  } : undefined

  return {
    id: task.id,
    index: draw.drawIndex,
    title: task.payload.title,
    prompt: task.payload.requestPrompt,
    meta: task.payload.meta,
    variation: draw.variation,
    batchId: draw.batchId,
    status,
    image,
    error: task.errorMessage,
    errorCode: task.status === 'timeout' ? 'timeout' : undefined,
    retryable: task.retryable,
    retryCount: task.retryAttempt,
    snapshotId: task.payload.snapshotId,
    generationTaskId: task.id,
    startedAt: undefined,
    finishedAt: undefined,
    updatedAt: getTaskTimestamp(task),
  }
}

function buildDrawTasksFromGenerationTasks(tasks: GenerationTaskRecord[]) {
  return [...buildLatestGenerationTaskMap(tasks).values()]
    .map((task) => toDrawTask(task))
    .filter((task): task is DrawTask => Boolean(task))
    .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))
}

export function useDrawCardSettings() {
  const { isAuthenticated, loading: authLoading } = useAuthSession()
  const [drawCount, setDrawCount] = useState(5)
  const [drawStrategy, setDrawStrategy] = useState<DrawStrategy>('smart')
  const [drawConcurrency, setDrawConcurrency] = useState(4)
  const [drawTasks, setDrawTasks] = useState<DrawTask[]>([])
  const [drawBatches, setDrawBatches] = useState<DrawBatch[]>([])
  const batchesHydratedRef = useRef(false)
  const [activeBatchId, setActiveBatchId] = useState<string>('all')

  useEffect(() => {
    if (authLoading) return

    let cancelled = false

    if (!isAuthenticated) {
      batchesHydratedRef.current = false
      setDrawTasks([])
      setDrawBatches([])
      return () => {
        cancelled = true
      }
    }

    void Promise.all([readStoredDrawBatches(), listGenerationTasks()])
      .then(([batches, tasks]) => {
        if (cancelled) return
        const normalizedBatches = batches.map(normalizeBatch)
        const hydratedTasks = buildDrawTasksFromGenerationTasks(tasks)
        const { nextTasks, interruptedTaskIds } = reconcileInterruptedTasks(hydratedTasks)
        const nextBatches = applyBatchCounts(normalizedBatches, nextTasks)
        setDrawTasks((current) => (current.length ? current : nextTasks))
        setDrawBatches((current) => (current.length ? current : nextBatches))
        batchesHydratedRef.current = true

        if (interruptedTaskIds.length) {
          nextTasks
            .filter((task): task is DrawTask & { generationTaskId: string } => (
              interruptedTaskIds.includes(task.id) && typeof task.generationTaskId === 'string'
            ))
            .forEach((task) => {
              void updateGenerationTask(task.generationTaskId, {
                status: 'failed',
                errorMessage: '工作台页面已刷新或会话中断，任务已标记为中断，可手动重试',
              }).catch(() => undefined)
            })
        }
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [authLoading, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !batchesHydratedRef.current) return
    void writeStoredDrawBatches(drawBatches)
  }, [drawBatches, isAuthenticated])

  const [variationStrength, setVariationStrength] = useState<VariationStrength>('medium')
  const [enabledVariationDimensions, setEnabledVariationDimensions] = useState<string[]>(variationDimensions.map((item) => item.id))
  const [drawDelayMs, setDrawDelayMs] = useState(1200)
  const [drawRetries, setDrawRetries] = useState(1)
  const [drawTimeoutSec, setDrawTimeoutSec] = useState(240)
  const [drawSafeMode, setDrawSafeMode] = useState(true)

  const effectiveDrawConcurrency = clampDrawConcurrency(drawConcurrency)
  const drawStats = useMemo(() => drawTasks.reduce((stats, task) => {
    stats[task.status] = (stats[task.status] ?? 0) + 1
    return stats
  }, {} as Partial<Record<DrawTaskStatus, number>>), [drawTasks])
  const taskSlots: GalleryImage[] = useMemo(() => drawTasks
    .filter((task) => !task.image && task.status !== 'success')
    .map((task) => ({
      id: task.id,
      title: task.title,
      src: undefined,
      meta: drawStatusMeta(task.status, task.error, task.retryable),
      variation: task.variation,
      batchId: task.batchId,
      drawIndex: task.index,
      taskStatus: task.status,
      error: task.error,
      errorCode: task.errorCode,
      retryable: task.retryable,
      retryCount: task.retryCount,
      generationTaskId: task.generationTaskId,
    })), [drawTasks])

  function toggleVariationDimension(id: string) {
    setEnabledVariationDimensions((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    )
  }

  function applyDrawStrategy(value: DrawStrategy): DrawShortcutResult | undefined {
    const strategy = drawStrategyOptions.find((item) => item.value === value) ?? drawStrategyOptions[1]
    setDrawStrategy(strategy.value)
    setDrawConcurrency(strategy.concurrency)
    setDrawDelayMs(strategy.delayMs)
    setDrawTimeoutSec(strategy.timeoutSec)
    setDrawRetries(strategy.retries)
    setDrawSafeMode(strategy.safeMode)
    if (strategy.safeMode) return { quality: 'low' }
    return undefined
  }

  function applyDrawShortcut(preset: DrawShortcut): DrawShortcutResult {
    const shortcutMap = {
      safe3: { count: 3, strategy: 'linear' as DrawStrategy, concurrency: 1, delayMs: 2000, timeoutSec: 300, retries: 2, safeMode: true, quality: 'low', variation: 'low' as VariationStrength },
      balanced5: { count: 5, strategy: 'smart' as DrawStrategy, concurrency: 4, delayMs: 1500, timeoutSec: 300, retries: 1, safeMode: true, quality: 'low', variation: 'medium' as VariationStrength },
      fast8: { count: 8, strategy: 'turbo' as DrawStrategy, concurrency: 6, delayMs: 1200, timeoutSec: 300, retries: 1, safeMode: true, quality: 'low', variation: 'medium' as VariationStrength },
      turbo10: { count: 10, strategy: 'turbo' as DrawStrategy, concurrency: 8, delayMs: 1000, timeoutSec: 300, retries: 1, safeMode: false, quality: 'low', variation: 'high' as VariationStrength },
    }[preset]

    setDrawCount(shortcutMap.count)
    setDrawStrategy(shortcutMap.strategy)
    setDrawConcurrency(shortcutMap.concurrency)
    setDrawDelayMs(shortcutMap.delayMs)
    setDrawTimeoutSec(shortcutMap.timeoutSec)
    setDrawRetries(shortcutMap.retries)
    setDrawSafeMode(shortcutMap.safeMode)
    setVariationStrength(shortcutMap.variation)
    return { quality: shortcutMap.quality }
  }

  return {
    drawCount,
    drawStrategy,
    drawConcurrency,
    drawTasks,
    drawBatches,
    activeBatchId,
    variationStrength,
    enabledVariationDimensions,
    drawDelayMs,
    drawRetries,
    drawTimeoutSec,
    drawSafeMode,
    effectiveDrawConcurrency,
    drawStats,
    taskSlots,
    setDrawCount,
    setDrawStrategy,
    setDrawConcurrency,
    setDrawTasks,
    setDrawBatches,
    setActiveBatchId,
    setVariationStrength,
    setEnabledVariationDimensions,
    setDrawDelayMs,
    setDrawRetries,
    setDrawTimeoutSec,
    setDrawSafeMode,
    toggleVariationDimension,
    applyDrawStrategy,
    applyDrawShortcut,
  }
}
