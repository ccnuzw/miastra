import { useEffect, useMemo, useRef, useState } from 'react'
import type { DrawBatch, DrawStrategy, DrawTask, DrawTaskStatus, VariationStrength } from '@/features/draw-card/drawCard.types'
import { drawStrategyOptions, variationDimensions } from '@/features/draw-card/drawCard.constants'
import { clampDrawConcurrency, drawStatusMeta } from '@/features/draw-card/drawCard.utils'
import type { GalleryImage } from '@/features/works/works.types'
import { readStoredDrawBatches, writeStoredDrawBatches } from './drawCard.storage'

type DrawShortcut = 'safe3' | 'balanced5' | 'fast8' | 'turbo10'

type DrawShortcutResult = {
  quality: string
}

export function useDrawCardSettings() {
  const [drawCount, setDrawCount] = useState(5)
  const [drawStrategy, setDrawStrategy] = useState<DrawStrategy>('smart')
  const [drawConcurrency, setDrawConcurrency] = useState(4)
  const [drawTasks, setDrawTasks] = useState<DrawTask[]>([])
  const [drawBatches, setDrawBatches] = useState<DrawBatch[]>([])
  const batchesHydratedRef = useRef(false)
  const [activeBatchId, setActiveBatchId] = useState<string>('all')


  useEffect(() => {
    let cancelled = false
    readStoredDrawBatches().then((items) => {
      if (cancelled) return
      setDrawBatches((current) => (current.length ? current : items))
      batchesHydratedRef.current = true
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!batchesHydratedRef.current) return
    void writeStoredDrawBatches(drawBatches)
  }, [drawBatches])
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
      meta: drawStatusMeta(task.status, task.error),
      variation: task.variation,
      batchId: task.batchId,
      drawIndex: task.index,
      taskStatus: task.status,
      error: task.error,
      retryCount: task.retryCount,
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
