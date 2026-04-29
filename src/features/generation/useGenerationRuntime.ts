import { useEffect, useRef, useState } from 'react'
import type { GalleryImage } from '@/features/works/works.types'
import type { DrawTask } from '@/features/draw-card/drawCard.types'
import type { GenerationStage, GenerationStatus } from '@/features/generation/generation.types'
import { stageProgress } from '@/features/generation/generation.constants'

export function useGenerationRuntime() {
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [statusText, setStatusText] = useState('等待生成任务')
  const [responseText, setResponseText] = useState('')
  const [responseCollapsed, setResponseCollapsed] = useState(true)
  const [liveImageSrc, setLiveImageSrc] = useState('')
  const [previewImage, setPreviewImage] = useState<GalleryImage | null>(null)
  const [stage, setStage] = useState<GenerationStage>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [debounceMs, setDebounceMs] = useState(0)
  const [drawQueuePaused, setDrawQueuePaused] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const cancelRequestedRef = useRef(false)
  const drawQueuePausedRef = useRef(false)
  const taskControllersRef = useRef<Map<string, AbortController>>(new Map())
  const drawTaskSnapshotsRef = useRef<Map<string, DrawTask>>(new Map())
  const pauseResolversRef = useRef<Array<() => void>>([])
  const debounceTimerRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(0)

  const progressValue = stage === 'waiting'
    ? Math.min(72, stageProgress.waiting + Math.floor(elapsedMs / 2500))
    : stageProgress[stage]
  const isBusy = status === 'loading'
  const livePreview: GalleryImage | null = liveImageSrc ? {
    id: 'live-preview-image',
    title: '实时预览',
    src: liveImageSrc,
    meta: '正在接收最终图片',
  } : null
  const responseSummary = responseText.split('\n').find((line) => line.trim()) || '等待接口返回'

  useEffect(() => {
    if (status !== 'loading') return
    const timer = window.setInterval(() => {
      if (startedAtRef.current) setElapsedMs(Date.now() - startedAtRef.current)
    }, 250)
    return () => window.clearInterval(timer)
  }, [status])

  useEffect(() => {
    if (debounceMs <= 0) return
    const timer = window.setInterval(() => {
      setDebounceMs((value) => Math.max(0, value - 100))
    }, 100)
    return () => window.clearInterval(timer)
  }, [debounceMs])

  useEffect(() => {
    return () => {
      cancelRequestedRef.current = true
      drawQueuePausedRef.current = false
      setDrawQueuePaused(false)
      abortRef.current?.abort()
      taskControllersRef.current.forEach((controller) => controller.abort())
      taskControllersRef.current.clear()
      pauseResolversRef.current.splice(0).forEach((resolve) => resolve())
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
    }
  }, [])

  return {
    status,
    statusText,
    responseText,
    responseCollapsed,
    liveImageSrc,
    previewImage,
    stage,
    elapsedMs,
    debounceMs,
    drawQueuePaused,
    abortRef,
    cancelRequestedRef,
    drawQueuePausedRef,
    taskControllersRef,
    drawTaskSnapshotsRef,
    pauseResolversRef,
    debounceTimerRef,
    startedAtRef,
    progressValue,
    isBusy,
    livePreview,
    responseSummary,
    setStatus,
    setStatusText,
    setResponseText,
    setResponseCollapsed,
    setLiveImageSrc,
    setPreviewImage,
    setStage,
    setElapsedMs,
    setDebounceMs,
    setDrawQueuePaused,
  }
}
