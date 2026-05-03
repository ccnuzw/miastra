import { useEffect, useMemo, useRef, useState } from 'react'
import type { DrawBatch, DrawStrategy, DrawTask, DrawTaskStatus, VariationStrength } from '@/features/draw-card/drawCard.types'
import { drawStrategyOptions, variationDimensions } from '@/features/draw-card/drawCard.constants'
import { updateGenerationTask } from '@/features/generation/generation.api'
import { clampDrawConcurrency, drawStatusMeta } from '@/features/draw-card/drawCard.utils'
import type { GalleryImage } from '@/features/works/works.types'
import { readStoredDrawBatches, readStoredDrawTasks, writeStoredDrawBatches, writeStoredDrawTasks } from './drawCard.storage'

type DrawShortcut = 'safe3' | 'balanced5' | 'fast8' | 'turbo10'

type DrawShortcutResult = {
  quality: string
}

const activeStatuses = new Set<DrawTaskStatus>(['pending', 'running', 'receiving', 'retrying'])

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

export function useDrawCardSettings() {
  const [drawCount, setDrawCount] = useState(5)
  const [drawStrategy, setDrawStrategy] = useState<DrawStrategy>('smart')
  const [drawConcurrency, setDrawConcurrency] = useState(4)
  const [drawTasks, setDrawTasks] = useState<DrawTask[]>([])
  const [drawBatches, setDrawBatches] = useState<DrawBatch[]>([])
  const batchesHydratedRef = useRef(false)
  const tasksHydratedRef = useRef(false)
  const [activeBatchId, setActiveBatchId] = useState<string>('all')

  useEffect(() => {
    let cancelled = false

    void Promise.all([readStoredDrawBatches(), readStoredDrawTasks()]).then(([batches, tasks]) => {
      if (cancelled) return
      const normalizedBatches = batches.map(normalizeBatch)
      const { nextTasks, interruptedTaskIds } = reconcileInterruptedTasks(tasks)
      const nextBatches = applyBatchCounts(normalizedBatches, nextTasks)
      setDrawTasks((current) => (current.length ? current : nextTasks))
      setDrawBatches((current) => (current.length ? current : nextBatches))
      batchesHydratedRef.current = true
      tasksHydratedRef.current = true

      if (interruptedTaskIds.length) {
        nextTasks
          .filter((task) => interruptedTaskIds.includes(task.id) && task.generationTaskId)
          .forEach((task) => {
            void updateGenerationTask(task.generationTaskId!, {
              status: 'failed',
              errorMessage: '工作台页面已刷新或会话中断，任务已标记为中断，可手动重试',
            }).catch(() => undefined)
          })
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!batchesHydratedRef.current) return
    void writeStoredDrawBatches(drawBatches)
  }, [drawBatches])

  useEffect(() => {
    if (!tasksHydratedRef.current) return
    void writeStoredDrawTasks(drawTasks)
  }, [drawTasks])

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
