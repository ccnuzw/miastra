import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  cancelGenerationTask,
  type GenerationBatchRecord,
  type GenerationTaskRecord,
  listDrawBatches,
  listGenerationTasks,
  rerunDrawBatch,
  retryGenerationTask,
} from '@/features/generation/generation.api'
import {
  buildTaskReplayWork,
  getTaskVersionSourceSummary,
  getWorkReplayActionLabels,
  getWorkReplayGuide,
  getWorkReplayHint,
  getWorkReplayReferenceSummary,
  getWorkReplayStatusText,
  queueWorkReplayPayload,
} from '@/features/works/workReplay'
import type { GalleryImage } from '@/features/works/works.types'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'
import { getErrorDisplay } from '@/shared/errors/app-error'
import { apiRequest } from '@/shared/http/client'

const activeTaskRefreshIntervalMs = 4000
const terminalStatuses = new Set<GenerationTaskRecord['status']>([
  'succeeded',
  'failed',
  'cancelled',
  'timeout',
])
const activeStatuses = new Set<GenerationTaskRecord['status']>(['pending', 'queued', 'running'])
const failedStatuses = new Set<GenerationTaskRecord['status']>(['failed', 'timeout'])

type TaskSlotView = {
  slotId: string
  title: string
  latestTask: GenerationTaskRecord
  attempts: GenerationTaskRecord[]
}

type TaskBatchView = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  total: number
  status: 'running' | 'failed' | 'cancelled' | 'queued' | 'succeeded'
  strategy?: GenerationBatchRecord['strategy']
  concurrency?: number
  snapshotId?: string
  isStandalone: boolean
  slots: TaskSlotView[]
  stats: {
    succeeded: number
    failed: number
    running: number
    cancelled: number
    pending: number
    retrying: number
  }
}

type WorkIndexes = {
  byId: Map<string, GalleryImage>
  bySnapshotId: Map<string, GalleryImage>
  byBatchSlot: Map<string, GalleryImage>
}

function statusTone(status: TaskBatchView['status'] | GenerationTaskRecord['status']) {
  if (status === 'succeeded') return 'text-signal-cyan border-signal-cyan/25 bg-signal-cyan/[0.08]'
  if (status === 'failed' || status === 'timeout' || status === 'cancelled')
    return 'text-signal-coral border-signal-coral/25 bg-signal-coral/10'
  return 'text-porcelain-50 border-porcelain-50/10 bg-ink-950/[0.55]'
}

function statusLabel(status: TaskBatchView['status'] | GenerationTaskRecord['status']) {
  const labels: Record<string, string> = {
    pending: '待调度',
    queued: '排队中',
    running: '进行中',
    succeeded: '已成功',
    failed: '失败',
    cancelled: '已取消',
    timeout: '超时',
  }
  return labels[status] ?? status
}

function modeLabel(mode: string) {
  if (mode === 'text2image' || mode === 'draw-text2image') return '文生图'
  if (mode === 'image2image' || mode === 'draw-image2image') return '图生图'
  return mode
}

function strategyLabel(strategy?: GenerationBatchRecord['strategy']) {
  if (strategy === 'linear') return 'Linear'
  if (strategy === 'smart') return 'Smart'
  if (strategy === 'turbo') return 'Turbo'
  return '—'
}

function formatDateTime(value?: string | number) {
  if (!value) return '—'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function toTimestamp(value?: string | number) {
  if (!value) return 0
  return new Date(value).getTime()
}

function getWorkBatchSlotKey(batchId: string, drawIndex: number) {
  return `${batchId}:${drawIndex}`
}

function getTaskSlotKey(task: GenerationTaskRecord) {
  if (task.batchId) return `${task.batchId}:${task.drawIndex ?? task.rootTaskId}`
  return task.rootTaskId
}

function readGenerationSnapshotId(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== 'object') return undefined
  const id = (snapshot as { id?: unknown }).id
  return typeof id === 'string' ? id : undefined
}

function resolveTaskWork(task: GenerationTaskRecord, indexes: WorkIndexes) {
  if (task.result?.workId) {
    const directMatch = indexes.byId.get(task.result.workId)
    if (directMatch) return directMatch
  }

  const snapshotCandidates = [task.result?.snapshotId, task.payload.snapshotId].filter(
    Boolean,
  ) as string[]
  for (const snapshotId of snapshotCandidates) {
    const work = indexes.bySnapshotId.get(snapshotId)
    if (work) return work
  }

  if (task.batchId && task.drawIndex !== undefined) {
    return indexes.byBatchSlot.get(getWorkBatchSlotKey(task.batchId, task.drawIndex))
  }

  return undefined
}

function sortAttemptsDesc(left: GenerationTaskRecord, right: GenerationTaskRecord) {
  const retryDiff = right.retryAttempt - left.retryAttempt
  if (retryDiff !== 0) return retryDiff
  return toTimestamp(right.createdAt) - toTimestamp(left.createdAt)
}

function buildTaskBatchView(params: {
  id: string
  title: string
  tasks: GenerationTaskRecord[]
  createdAt: number
  strategy?: GenerationBatchRecord['strategy']
  concurrency?: number
  snapshotId?: string
  isStandalone?: boolean
  fallbackTotal?: number
}): TaskBatchView {
  const slotMap = new Map<string, GenerationTaskRecord[]>()
  for (const task of params.tasks) {
    const slotId = getTaskSlotKey(task)
    slotMap.set(slotId, [...(slotMap.get(slotId) ?? []), task])
  }

  const slots = [...slotMap.entries()]
    .map(([slotId, attempts]) => {
      const sortedAttempts = [...attempts].sort(sortAttemptsDesc)
      const latestTask = sortedAttempts[0]
      return {
        slotId,
        title:
          latestTask.payload.title || `任务 ${latestTask.drawIndex ?? latestTask.id.slice(0, 8)}`,
        latestTask,
        attempts: sortedAttempts,
      }
    })
    .sort((left, right) => {
      const leftActive = activeStatuses.has(left.latestTask.status) ? 1 : 0
      const rightActive = activeStatuses.has(right.latestTask.status) ? 1 : 0
      if (leftActive !== rightActive) return rightActive - leftActive
      return toTimestamp(right.latestTask.updatedAt) - toTimestamp(left.latestTask.updatedAt)
    })

  const stats = slots.reduce(
    (accumulator, slot) => {
      if (slot.latestTask.status === 'succeeded') accumulator.succeeded += 1
      else if (failedStatuses.has(slot.latestTask.status)) accumulator.failed += 1
      else if (slot.latestTask.status === 'cancelled') accumulator.cancelled += 1
      else if (slot.latestTask.status === 'pending' || slot.latestTask.status === 'queued')
        accumulator.pending += 1
      else accumulator.running += 1

      accumulator.retrying += Math.max(0, slot.attempts.length - 1)
      return accumulator
    },
    {
      succeeded: 0,
      failed: 0,
      running: 0,
      cancelled: 0,
      pending: 0,
      retrying: 0,
    },
  )

  let status: TaskBatchView['status'] = 'queued'
  if (stats.running > 0 || stats.pending > 0) status = 'running'
  else if (stats.failed > 0) status = 'failed'
  else if (stats.cancelled > 0 && !stats.succeeded) status = 'cancelled'
  else if (slots.length > 0 && stats.succeeded === slots.length) status = 'succeeded'

  return {
    id: params.id,
    title: params.title,
    createdAt: params.createdAt,
    updatedAt: Math.max(
      ...slots.map((slot) => toTimestamp(slot.latestTask.updatedAt)),
      params.createdAt,
    ),
    total: Math.max(params.fallbackTotal ?? 0, slots.length),
    status,
    strategy: params.strategy,
    concurrency: params.concurrency,
    snapshotId: params.snapshotId,
    isStandalone: Boolean(params.isStandalone),
    slots,
    stats,
  }
}

function getCompactDeltaItems(versionSource: ReturnType<typeof getTaskVersionSourceSummary>) {
  const changedItems = versionSource.deltaItems.filter((item) => item.tone !== 'carry')
  return changedItems.length ? changedItems.slice(0, 2) : versionSource.deltaItems.slice(0, 1)
}

function getRecommendedDirectLinks(versionSource: ReturnType<typeof getTaskVersionSourceSummary>) {
  return versionSource.recommendedDirectLinkIds.reduce<typeof versionSource.directLinks>(
    (accumulator, id) => {
      const matchedLink = versionSource.directLinks.find((item) => item.id === id)
      return matchedLink ? [...accumulator, matchedLink] : accumulator
    },
    [],
  )
}

export function TasksPage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<GenerationTaskRecord[]>([])
  const [batches, setBatches] = useState<GenerationBatchRecord[]>([])
  const [works, setWorks] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [actionMessage, setActionMessage] = useState('')
  const [actionMessageTone, setActionMessageTone] = useState<'success' | 'error'>('success')
  const [busyKey, setBusyKey] = useState('')
  const [expandedSlotId, setExpandedSlotId] = useState('')
  const [expandedBatchIds, setExpandedBatchIds] = useState<string[]>([])
  const [pendingFocusBatchId, setPendingFocusBatchId] = useState('')
  const [pageVisible, setPageVisible] = useState(() =>
    typeof document === 'undefined' ? true : document.visibilityState === 'visible',
  )
  const replayLabels = getWorkReplayActionLabels('task')

  const refresh = useCallback(async (background = false) => {
    if (background) setRefreshing(true)
    else setLoading(true)

    setError(null)

    try {
      const [nextTasks, nextBatches, nextWorks] = await Promise.all([
        listGenerationTasks(),
        listDrawBatches(),
        apiRequest<GalleryImage[]>('/api/works'),
      ])
      setTasks(nextTasks)
      setBatches(nextBatches)
      setWorks(nextWorks)
    } catch (nextError) {
      setError(nextError)
    } finally {
      if (background) setRefreshing(false)
      else {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    function handleVisibilityChange() {
      setPageVisible(document.visibilityState === 'visible')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const hasActiveTasks = useMemo(
    () => tasks.some((task) => !terminalStatuses.has(task.status)),
    [tasks],
  )

  useEffect(() => {
    if (!hasActiveTasks || !pageVisible) return
    const timer = window.setInterval(() => {
      void refresh(true)
    }, activeTaskRefreshIntervalMs)
    return () => window.clearInterval(timer)
  }, [hasActiveTasks, pageVisible, refresh])

  const batchViews = useMemo(() => {
    const batchTaskMap = new Map<string, GenerationTaskRecord[]>()
    const standaloneTasks: GenerationTaskRecord[] = []

    for (const task of tasks) {
      if (task.batchId) {
        batchTaskMap.set(task.batchId, [...(batchTaskMap.get(task.batchId) ?? []), task])
      } else {
        standaloneTasks.push(task)
      }
    }

    const knownBatchIds = new Set(batches.map((batch) => batch.id))
    const items: TaskBatchView[] = batches.map((batch) =>
      buildTaskBatchView({
        id: batch.id,
        title: batch.title,
        tasks: batchTaskMap.get(batch.id) ?? [],
        createdAt: batch.createdAt,
        strategy: batch.strategy,
        concurrency: batch.concurrency,
        snapshotId: batch.snapshotId,
        fallbackTotal: batch.count,
      }),
    )

    for (const [batchId, batchTasks] of batchTaskMap.entries()) {
      if (knownBatchIds.has(batchId)) continue
      items.push(
        buildTaskBatchView({
          id: batchId,
          title: batchId,
          tasks: batchTasks,
          createdAt: Math.min(...batchTasks.map((task) => toTimestamp(task.createdAt))),
          snapshotId:
            batchTasks[0]?.payload.draw?.batchSnapshotId ?? batchTasks[0]?.payload.snapshotId,
          fallbackTotal: batchTasks.length,
        }),
      )
    }

    if (standaloneTasks.length) {
      items.push(
        buildTaskBatchView({
          id: 'standalone',
          title: '独立任务',
          tasks: standaloneTasks,
          createdAt: Math.min(...standaloneTasks.map((task) => toTimestamp(task.createdAt))),
          isStandalone: true,
          fallbackTotal: standaloneTasks.length,
        }),
      )
    }

    return items.sort((left, right) => {
      const leftActive = left.status === 'running' ? 1 : 0
      const rightActive = right.status === 'running' ? 1 : 0
      if (leftActive !== rightActive) return rightActive - leftActive
      return right.updatedAt - left.updatedAt
    })
  }, [batches, tasks])

  useEffect(() => {
    const validBatchIds = new Set(batchViews.map((batch) => batch.id))
    setExpandedBatchIds((current) => {
      const next = current.filter((item) => validBatchIds.has(item))
      if (pendingFocusBatchId && validBatchIds.has(pendingFocusBatchId)) {
        return next.includes(pendingFocusBatchId) ? next : [pendingFocusBatchId, ...next]
      }
      if (next.length) return next
      const preferred =
        batchViews.find((batch) => batch.status === 'running' || batch.stats.failed > 0) ??
        batchViews[0]
      return preferred ? [preferred.id] : []
    })
  }, [batchViews, pendingFocusBatchId])

  useEffect(() => {
    if (!pendingFocusBatchId) return
    if (!batchViews.some((batch) => batch.id === pendingFocusBatchId)) return
    setPendingFocusBatchId('')
  }, [batchViews, pendingFocusBatchId])

  useEffect(() => {
    if (!expandedSlotId) return
    const exists = batchViews.some((batch) =>
      batch.slots.some((slot) => slot.slotId === expandedSlotId),
    )
    if (!exists) setExpandedSlotId('')
  }, [batchViews, expandedSlotId])

  const overallStats = useMemo(
    () =>
      batchViews.reduce(
        (accumulator, batch) => {
          accumulator.batchCount += batch.isStandalone ? 0 : 1
          accumulator.slotCount += batch.slots.length
          accumulator.succeeded += batch.stats.succeeded
          accumulator.failed += batch.stats.failed
          accumulator.running += batch.stats.running + batch.stats.pending
          accumulator.cancelled += batch.stats.cancelled
          accumulator.retrying += batch.stats.retrying
          return accumulator
        },
        {
          batchCount: 0,
          slotCount: 0,
          succeeded: 0,
          failed: 0,
          running: 0,
          cancelled: 0,
          retrying: 0,
        },
      ),
    [batchViews],
  )

  const overallSuccessRate =
    overallStats.slotCount > 0
      ? Math.round((overallStats.succeeded / overallStats.slotCount) * 100)
      : 0
  const hasRecoverableFailures = overallStats.failed > 0
  const hasRunningTasks = overallStats.running > 0
  const autoRefreshPaused = hasRunningTasks && !pageVisible

  const workIndexes = useMemo<WorkIndexes>(() => {
    const byId = new Map<string, GalleryImage>()
    const bySnapshotId = new Map<string, GalleryImage>()
    const byBatchSlot = new Map<string, GalleryImage>()

    for (const work of works) {
      byId.set(work.id, work)
      if (work.snapshotId && !bySnapshotId.has(work.snapshotId))
        bySnapshotId.set(work.snapshotId, work)
      if (work.batchId && work.drawIndex !== undefined) {
        const key = getWorkBatchSlotKey(work.batchId, work.drawIndex)
        if (!byBatchSlot.has(key)) byBatchSlot.set(key, work)
      }
    }

    return { byId, bySnapshotId, byBatchSlot }
  }, [works])
  const pendingResultMappingCount = useMemo(
    () => tasks.filter((task) => Boolean(task.result) && !resolveTaskWork(task, workIndexes)).length,
    [tasks, workIndexes],
  )

  async function handleCancel(taskId: string) {
    setBusyKey(`cancel:${taskId}`)
    setError(null)
    try {
      await cancelGenerationTask(taskId)
      setActionMessageTone('success')
      setActionMessage('已发送取消请求，列表会自动刷新到最新状态。')
      await refresh(true)
    } catch (nextError) {
      setActionMessageTone('error')
      setActionMessage(`取消任务失败：${getErrorDisplay(nextError).title}`)
      setError(nextError)
    } finally {
      setBusyKey('')
    }
  }

  async function handleRetry(taskId: string) {
    setBusyKey(`retry:${taskId}`)
    setError(null)
    setActionMessage('')
    try {
      await retryGenerationTask(taskId)
      setActionMessageTone('success')
      setActionMessage('已重新排队该失败项，页面会自动刷新。')
      await refresh(true)
    } catch (nextError) {
      setActionMessageTone('error')
      setActionMessage(`重试失败项失败：${getErrorDisplay(nextError).title}`)
      setError(nextError)
    } finally {
      setBusyKey('')
    }
  }

  async function handleRerunBatch(batchId: string) {
    setBusyKey(`rerun-batch:${batchId}`)
    setError(null)
    setActionMessage('')
    try {
      const rerunResult = await rerunDrawBatch(batchId)
      setPendingFocusBatchId(rerunResult.batch.id)
      setExpandedSlotId('')
      setActionMessageTone('success')
      setActionMessage(`已创建复跑批次，排入 ${rerunResult.slotCount} 个任务槽位。`)
      await refresh(true)
    } catch (nextError) {
      setActionMessageTone('error')
      setActionMessage(`批次复跑失败：${getErrorDisplay(nextError).title}`)
      setError(nextError)
    } finally {
      setBusyKey('')
    }
  }

  function toggleBatch(batchId: string) {
    setExpandedBatchIds((current) =>
      current.includes(batchId)
        ? current.filter((item) => item !== batchId)
        : [...current, batchId],
    )
  }

  function handleReplayToStudio(
    task: GenerationTaskRecord,
    resultWork: GalleryImage | undefined,
    autoGenerate: boolean,
  ) {
    const replayWork = buildTaskReplayWork(task, resultWork)
    queueWorkReplayPayload({
      work: replayWork,
      autoGenerate,
      origin: 'task',
      intent: autoGenerate ? 'retry-version' : 'continue-version',
    })
    navigate('/app/studio')
  }

  return (
    <main className="app-page-shell app-page-shell-full">
      <section className="panel-shell w-full">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Tasks</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">任务与批次</h1>
            <p className="mt-2 text-sm text-porcelain-100/60">
              按批次查看生成进度、失败恢复、重试链路和结果明细。页面可在有活跃任务时自动刷新。
            </p>
          </div>
          <button
            className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={loading || refreshing}
            onClick={() => void refresh(tasks.length > 0)}
          >
            {loading || refreshing ? '刷新中…' : '刷新'}
          </button>
        </div>

        <div className="mt-6 rounded-[1.35rem] border border-signal-cyan/20 bg-signal-cyan/[0.08] px-4 py-3 text-sm text-porcelain-100/78">
          {getWorkReplayGuide('task')}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3 min-[1600px]:grid-cols-5">
          <article className="progress-card">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">
              批次
            </p>
            <p className="mt-3 text-3xl font-semibold text-porcelain-50">
              {overallStats.batchCount}
            </p>
            <p className="mt-2 text-sm text-porcelain-100/55">批量抽卡批次总数</p>
          </article>
          <article className="progress-card">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">
              任务槽位
            </p>
            <p className="mt-3 text-3xl font-semibold text-porcelain-50">
              {overallStats.slotCount}
            </p>
            <p className="mt-2 text-sm text-porcelain-100/55">按批次去重后的可追踪任务项</p>
          </article>
          <article className="progress-card">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">
              进行中
            </p>
            <p className="mt-3 text-3xl font-semibold text-signal-cyan">{overallStats.running}</p>
            <p className="mt-2 text-sm text-porcelain-100/55">包含排队与执行中的任务</p>
          </article>
          <article className="progress-card">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">
              待恢复
            </p>
            <p className="mt-3 text-3xl font-semibold text-signal-coral">{overallStats.failed}</p>
            <p className="mt-2 text-sm text-porcelain-100/55">失败或超时，可单独重试</p>
          </article>
          <article className="progress-card">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">
              成功率
            </p>
            <p className="mt-3 text-3xl font-semibold text-porcelain-50">{overallSuccessRate}%</p>
            <p className="mt-2 text-sm text-porcelain-100/55">按最新槽位状态统计</p>
          </article>
        </div>

        {error ? <ErrorNotice error={error} className="mt-6" /> : null}
        {error ? (
          <div className="mt-6 rounded-[1.3rem] border border-signal-coral/20 bg-signal-coral/10 px-4 py-3 text-sm text-porcelain-100/78">
            任务列表没有完整刷新成功。当前批次进度、结果映射和回流入口可能不是最新状态；继续重试或回到工作台前，建议先完成一次成功刷新。
          </div>
        ) : null}
        {autoRefreshPaused ? (
          <div className="mt-6 rounded-[1.3rem] border border-signal-amber/20 bg-signal-amber/[0.08] px-4 py-3 text-sm text-porcelain-100/78">
            页面当前不在前台，自动刷新已暂停。正在运行的任务可能已经有新结果；回到前台后会继续自动刷新，也可以现在手动刷新一次。
          </div>
        ) : null}
        {!loading && pendingResultMappingCount > 0 ? (
          <div className="mt-6 rounded-[1.3rem] border border-porcelain-50/10 bg-ink-950/[0.35] px-4 py-3 text-sm text-porcelain-100/70">
            当前有 {pendingResultMappingCount} 个任务已经返回结果，但作品映射还没完全恢复。回流控制区前建议先刷新一次，确认结果图和快照都已稳定落盘。
          </div>
        ) : null}
        {!loading ? (
          <div className="mt-6 rounded-[1.3rem] border border-porcelain-50/10 bg-ink-950/[0.35] px-4 py-3 text-sm text-porcelain-100/70">
            {hasRunningTasks
              ? '当前仍有任务在运行或排队，页面会自动刷新。回到工作台继续修改时，建议确认这批任务是否已经稳定出结果。'
              : hasRecoverableFailures
                ? '当前没有进行中的任务，但存在失败或超时项。你可以先在这里重试失败项，也可以把结果回流到工作台后再决定是否派生。'
                : '当前任务链已稳定落盘。需要继续改时，可以直接从任务回流到工作台，普通版和专业版都会沿当前快照继续。'}
          </div>
        ) : null}
        {actionMessage ? (
          <p
            className={`mt-6 rounded-[1.3rem] border px-4 py-3 text-sm ${
              actionMessageTone === 'error'
                ? 'border-signal-coral/25 bg-signal-coral/10 text-porcelain-100/78'
                : 'border-signal-cyan/25 bg-signal-cyan/[0.08] text-signal-cyan'
            }`}
          >
            {actionMessage}
          </p>
        ) : null}

        <div className="mt-8 grid gap-5">
          {!loading && batchViews.length === 0 ? (
            <article className="progress-card">
              <p className="text-base font-semibold text-porcelain-50">当前还没有任务或批次</p>
              <p className="mt-2 text-sm leading-6 text-porcelain-100/60">
                先去工作台发起第一轮生成，这里才会开始积累可回流、可重试、可复跑的任务链路。
              </p>
            </article>
          ) : null}
          {batchViews.map((batch) => {
            const expanded = expandedBatchIds.includes(batch.id)
            const completedCount =
              batch.stats.succeeded + batch.stats.failed + batch.stats.cancelled
            const completionRate =
              batch.total > 0 ? Math.round((completedCount / batch.total) * 100) : 0
            const successRate =
              batch.total > 0 ? Math.round((batch.stats.succeeded / batch.total) * 100) : 0

            return (
              <article key={batch.id} className="progress-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold text-porcelain-50">{batch.title}</h2>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(batch.status)}`}
                      >
                        {statusLabel(batch.status)}
                      </span>
                      {batch.isStandalone ? <span className="status-pill">单任务</span> : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-porcelain-100/52">
                      <span className="rounded-full border border-porcelain-50/10 px-3 py-1">
                        总数 {batch.total}
                      </span>
                      <span className="rounded-full border border-signal-cyan/20 bg-signal-cyan/[0.08] px-3 py-1 text-signal-cyan">
                        成功 {batch.stats.succeeded}
                      </span>
                      <span className="rounded-full border border-signal-coral/20 bg-signal-coral/10 px-3 py-1 text-signal-coral">
                        失败 {batch.stats.failed}
                      </span>
                      <span className="rounded-full border border-porcelain-50/10 px-3 py-1">
                        进行中 {batch.stats.running + batch.stats.pending}
                      </span>
                      <span className="rounded-full border border-porcelain-50/10 px-3 py-1">
                        取消 {batch.stats.cancelled}
                      </span>
                      <span className="rounded-full border border-porcelain-50/10 px-3 py-1">
                        重试链路 {batch.stats.retrying}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-porcelain-100/45">
                      <span>创建时间：{formatDateTime(batch.createdAt)}</span>
                      <span>最后更新：{formatDateTime(batch.updatedAt)}</span>
                      <span>策略：{strategyLabel(batch.strategy)}</span>
                      <span>并发：{batch.concurrency ?? '—'}</span>
                      <span>快照：{batch.snapshotId ?? '—'}</span>
                    </div>
                    <div className="mt-4">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-porcelain-100/52">
                        <span>完成度 {completionRate}%</span>
                        <span>成功率 {successRate}%</span>
                        <span>待恢复 {batch.stats.failed}</span>
                        <span>
                          结果入库{' '}
                          {
                            batch.slots.filter((slot) =>
                              resolveTaskWork(slot.latestTask, workIndexes),
                            ).length
                          }
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-porcelain-50/[0.08]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-signal-cyan via-porcelain-50 to-signal-coral"
                          style={{ width: `${Math.min(100, completionRate)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!batch.isStandalone ? (
                      <button
                        type="button"
                        className="rounded-full border border-signal-cyan/25 bg-signal-cyan/[0.08] px-4 py-2 text-sm font-semibold text-signal-cyan transition hover:bg-signal-cyan hover:text-ink-950 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={busyKey === `rerun-batch:${batch.id}` || batch.slots.length === 0}
                        onClick={() => void handleRerunBatch(batch.id)}
                      >
                        {busyKey === `rerun-batch:${batch.id}` ? '复跑中…' : '一键复跑批次'}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-full border border-porcelain-50/10 px-4 py-2 text-sm"
                      onClick={() => toggleBatch(batch.id)}
                    >
                      {expanded ? '收起批次' : '展开批次'}
                    </button>
                  </div>
                </div>

                {expanded ? (
                  <div className="mt-5 grid gap-4">
                    {batch.slots.length ? (
                      batch.slots.map((slot) => {
                        const task = slot.latestTask
                        const isExpanded = expandedSlotId === slot.slotId
                        const resultWork = resolveTaskWork(task, workIndexes)
                        const replayWork = buildTaskReplayWork(task, resultWork)
                        const replaySummary = getWorkReplayReferenceSummary(replayWork)
                        const replayStatusText = getWorkReplayStatusText(replaySummary)
                        const versionSource = getTaskVersionSourceSummary(task, replayWork)
                        const compactDeltaItems = getCompactDeltaItems(versionSource)
                        const recommendedDirectLinks = getRecommendedDirectLinks(versionSource)
                        const recoverHint = getWorkReplayHint('task', false, replaySummary)
                        const rerunHint = getWorkReplayHint('task', true, replaySummary)
                        const imageUrl = task.result?.imageUrl ?? resultWork?.src
                        const canCancel = activeStatuses.has(task.status)
                        const canRetry =
                          task.retryable &&
                          (task.status === 'failed' ||
                            task.status === 'timeout' ||
                            task.status === 'cancelled')
                        const taskSnapshotId = task.payload.snapshotId ?? '—'
                        const batchSnapshotId =
                          task.payload.draw?.batchSnapshotId ?? batch.snapshotId ?? '—'
                        const resultSnapshotId =
                          task.result?.snapshotId ?? resultWork?.snapshotId ?? '—'
                        const generationSnapshotId =
                          readGenerationSnapshotId(resultWork?.generationSnapshot) ??
                          readGenerationSnapshotId(task.result?.generationSnapshot) ??
                          '—'
                        const resultWorkId = resultWork?.id ?? task.result?.workId ?? '—'
                        const resultStatusLabel = resultWork
                          ? '已映射作品库'
                          : task.result
                            ? '已有结果，待映射'
                            : '尚无结果'
                        const replayActions = [
                          {
                            id: 'continue-version',
                            label:
                              versionSource.recommendedActionId === 'continue-version'
                                ? `推荐：${replayLabels.restore}`
                                : replayLabels.restore,
                            autoGenerate: false,
                            className:
                              versionSource.recommendedActionId === 'continue-version'
                                ? 'rounded-full border border-signal-cyan/35 bg-signal-cyan/[0.14] px-4 py-2 text-sm font-semibold text-signal-cyan transition hover:bg-signal-cyan hover:text-ink-950'
                                : 'rounded-full border border-signal-cyan/25 bg-signal-cyan/[0.08] px-4 py-2 text-sm font-semibold text-signal-cyan transition hover:bg-signal-cyan hover:text-ink-950',
                          },
                          {
                            id: 'retry-version',
                            label:
                              versionSource.recommendedActionId === 'retry-version'
                                ? `推荐：${replayLabels.regenerate}`
                                : replayLabels.regenerate,
                            autoGenerate: true,
                            className:
                              versionSource.recommendedActionId === 'retry-version'
                                ? 'rounded-full border border-signal-amber/35 bg-signal-amber/[0.14] px-4 py-2 text-sm font-semibold text-signal-amber transition hover:bg-signal-amber hover:text-ink-950'
                                : 'rounded-full border border-signal-amber/25 bg-signal-amber/[0.08] px-4 py-2 text-sm font-semibold text-signal-amber transition hover:bg-signal-amber hover:text-ink-950',
                          },
                        ].sort(
                          (left, right) =>
                            Number(right.id === versionSource.recommendedActionId) -
                            Number(left.id === versionSource.recommendedActionId),
                        )

                        return (
                          <article
                            key={slot.slotId}
                            className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <h3 className="text-lg font-semibold text-porcelain-50">
                                    {slot.title}
                                  </h3>
                                  <span
                                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(task.status)}`}
                                  >
                                    {statusLabel(task.status)}
                                  </span>
                                  {slot.attempts.length > 1 ? (
                                    <span className="status-pill">尝试 {slot.attempts.length}</span>
                                  ) : null}
                                  {resultWork ? (
                                    <span className="status-pill">结果已入库</span>
                                  ) : null}
                                </div>
                                <p className="mt-2 text-sm text-porcelain-100/60">
                                  {task.payload.meta}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <span className="rounded-full border border-signal-cyan/20 bg-signal-cyan/[0.08] px-3 py-1 text-[11px] font-semibold text-signal-cyan">
                                    {versionSource.originLabel}
                                  </span>
                                  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-1 text-[11px] font-semibold text-emerald-200">
                                    {versionSource.sourceKindLabel}
                                  </span>
                                  <span className="rounded-full border border-signal-amber/20 bg-signal-amber/[0.08] px-3 py-1 text-[11px] font-semibold text-signal-amber">
                                    建议：{versionSource.recommendedActionLabel}
                                  </span>
                                  <span className="rounded-full border border-porcelain-50/10 bg-porcelain-50/[0.04] px-3 py-1 text-[11px] text-porcelain-100/58">
                                    场景：{versionSource.sceneLabel}
                                  </span>
                                  <span className="rounded-full border border-porcelain-50/10 bg-porcelain-50/[0.04] px-3 py-1 text-[11px] text-porcelain-100/58">
                                    {versionSource.currentLabel}
                                  </span>
                                  {versionSource.quickDeltaLabels.map((label) => (
                                    <span
                                      key={`${slot.slotId}:${label}`}
                                      className="rounded-full border border-signal-amber/20 bg-signal-amber/[0.08] px-3 py-1 text-[11px] font-semibold text-signal-amber"
                                    >
                                      {label}
                                    </span>
                                  ))}
                                </div>
                                <div className="mt-3 rounded-[1.1rem] border border-porcelain-50/10 bg-ink-950/[0.32] p-3 text-xs text-porcelain-100/58">
                                  <div className="grid gap-2 md:grid-cols-3">
                                    <div className="rounded-2xl border border-signal-amber/20 bg-signal-amber/[0.08] px-3 py-2">
                                      <p className="text-[11px] font-semibold text-signal-amber">建议动作</p>
                                      <p className="mt-1 font-semibold text-porcelain-50">
                                        {versionSource.recommendedActionLabel}
                                      </p>
                                      <p className="mt-1">{versionSource.recommendedActionSummary}</p>
                                    </div>
                                    <div className="rounded-2xl border border-signal-cyan/20 bg-signal-cyan/[0.08] px-3 py-2">
                                      <p className="text-[11px] font-semibold text-signal-cyan">优先直达</p>
                                      <p className="mt-1 font-semibold text-porcelain-50">
                                        {versionSource.recommendedDirectLinksLabel}
                                      </p>
                                      <p className="mt-1">{versionSource.deltaHeadline}</p>
                                    </div>
                                    <div className="rounded-2xl border border-porcelain-50/10 bg-porcelain-50/[0.03] px-3 py-2">
                                      <p className="text-[11px] font-semibold text-porcelain-50">判断提示</p>
                                      <p className="mt-1">{versionSource.decisionSummary}</p>
                                      <p className="mt-1 text-porcelain-100/45">
                                        {versionSource.actionDecisionReason}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                                    {recommendedDirectLinks.slice(0, 2).map((item) => (
                                      <div
                                        key={`${slot.slotId}:${item.id}`}
                                        className="rounded-2xl border border-porcelain-50/10 bg-porcelain-50/[0.03] px-3 py-2"
                                      >
                                        <p className="text-[11px] font-semibold text-porcelain-50">
                                          {item.label}
                                        </p>
                                        <p className="mt-1">{item.summary}</p>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-3 grid gap-2">
                                    {compactDeltaItems.map((item) => (
                                      <div
                                        key={`${slot.slotId}:${item.id}`}
                                        className="rounded-2xl border border-porcelain-50/10 bg-porcelain-50/[0.03] px-3 py-2"
                                      >
                                        <p className="text-[11px] font-semibold text-porcelain-50">
                                          {item.label} · {item.toneLabel}
                                        </p>
                                        <p className="mt-1">{item.summary}</p>
                                        {item.detail ? (
                                          <p className="mt-1 text-porcelain-100/45">{item.detail}</p>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <p
                                  className={`mt-2 text-xs ${replaySummary.missingReferenceCount > 0 ? 'text-signal-coral' : 'text-signal-cyan'}`}
                                >
                                  {replayStatusText}
                                </p>
                                {replaySummary.missingReferenceCount > 0 ? (
                                  <p className="mt-2 text-xs text-porcelain-100/52">
                                    回到工作台后会先恢复当前可用参数，但需要手动补齐缺失参考图，才适合继续重跑或分叉。
                                  </p>
                                ) : null}
                                <div className="mt-3 flex flex-wrap gap-4 text-xs text-porcelain-100/45">
                                  <span>模式：{modeLabel(task.payload.mode)}</span>
                                  <span>模型：{task.payload.model}</span>
                                  <span>进度：{task.progress ?? 0}%</span>
                                  <span>
                                    批次位序：
                                    {task.drawIndex === undefined ? '—' : task.drawIndex + 1}
                                  </span>
                                  <span>最近尝试：第 {task.retryAttempt + 1} 次</span>
                                  <span>结果：{resultStatusLabel}</span>
                                  <span>更新时间：{formatDateTime(task.updatedAt)}</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {replayActions.map((action) => (
                                  <button
                                    key={`${slot.slotId}:${action.id}`}
                                    type="button"
                                    className={action.className}
                                    onClick={() => handleReplayToStudio(task, resultWork, action.autoGenerate)}
                                  >
                                    {action.label}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  className="rounded-full border border-porcelain-50/10 px-4 py-2 text-sm"
                                  onClick={() => setExpandedSlotId(isExpanded ? '' : slot.slotId)}
                                >
                                  {isExpanded ? '收起详情' : '查看详情'}
                                </button>
                                {canRetry ? (
                                  <button
                                    type="button"
                                    className="rounded-full border border-signal-cyan/25 bg-signal-cyan/[0.08] px-4 py-2 text-sm font-semibold text-signal-cyan transition hover:bg-signal-cyan hover:text-ink-950 disabled:cursor-not-allowed disabled:opacity-40"
                                    disabled={busyKey === `retry:${task.id}`}
                                    onClick={() => void handleRetry(task.id)}
                                  >
                                    {busyKey === `retry:${task.id}` ? '重试中…' : '重试失败项'}
                                  </button>
                                ) : null}
                                {canCancel ? (
                                  <button
                                    type="button"
                                    className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-4 py-2 text-sm font-semibold text-signal-coral transition hover:bg-signal-coral hover:text-ink-950 disabled:cursor-not-allowed disabled:opacity-40"
                                    disabled={busyKey === `cancel:${task.id}`}
                                    onClick={() => void handleCancel(task.id)}
                                  >
                                    {busyKey === `cancel:${task.id}` ? '取消中…' : '取消任务'}
                                  </button>
                                ) : null}
                              </div>
                            </div>

                            {isExpanded ? (
                              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_320px]">
                                <div className="space-y-4">
                                  <div className="grid gap-3 rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-4 md:grid-cols-2">
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">
                                        版本来源
                                      </p>
                                      <div className="mt-3 grid gap-2 text-sm text-porcelain-100/72">
                                        <p>当前来源：{versionSource.originLabel}</p>
                                        <p>来源类型：{versionSource.sourceKindLabel}</p>
                                        <p>动作建议：{versionSource.recommendedActionLabel}</p>
                                        <p>{versionSource.decisionSummary}</p>
                                        <p>{versionSource.actionDecisionReason}</p>
                                        <p>统一场景：{versionSource.sceneLabel}</p>
                                        <p className="font-semibold text-porcelain-50">
                                          {versionSource.deltaHeadline}
                                        </p>
                                        <p>{versionSource.parentDeltaLabel}</p>
                                        <p>{versionSource.sourceDeltaLabel}</p>
                                        <p>{versionSource.sourceDecisionLabel}</p>
                                        <p>{versionSource.structureLabel}</p>
                                        <p>{versionSource.nodePathLabel}</p>
                                        <p>当前节点：{versionSource.currentLabel}</p>
                                        <p>{versionSource.parentLabel}</p>
                                        <p>{versionSource.ancestorLabel}</p>
                                        <p>{versionSource.promptLabel}</p>
                                        <p>恢复状态：{replayStatusText}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">
                                        追踪信息
                                      </p>
                                      <div className="mt-3 grid gap-2 text-sm text-porcelain-100/72">
                                        <p>当前任务 ID：{task.id}</p>
                                        <p>根任务 ID：{task.rootTaskId}</p>
                                        <p>父任务 ID：{task.parentTaskId ?? '—'}</p>
                                        <p>批次 ID：{task.batchId ?? '—'}</p>
                                        <p>
                                          批次序号：
                                          {task.drawIndex === undefined ? '—' : task.drawIndex + 1}
                                        </p>
                                        <p>
                                          变体：
                                          {task.variation ?? task.payload.draw?.variation ?? '—'}
                                        </p>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">
                                        快照与结果
                                      </p>
                                      <div className="mt-3 grid gap-2 text-sm text-porcelain-100/72">
                                        <p>请求快照：{taskSnapshotId}</p>
                                        <p>批次快照：{batchSnapshotId}</p>
                                        <p>结果快照：{resultSnapshotId}</p>
                                        <p>生成快照：{generationSnapshotId}</p>
                                        <p>结果作品 ID：{resultWorkId}</p>
                                        <p>结果状态：{resultStatusLabel}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid gap-3 rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-4 md:grid-cols-2">
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">
                                        请求信息
                                      </p>
                                      <div className="mt-3 grid gap-2 text-sm text-porcelain-100/72">
                                        <p>Provider：{task.payload.providerId}</p>
                                        <p>尺寸：{task.result?.size ?? task.payload.size}</p>
                                        <p>质量：{task.result?.quality ?? task.payload.quality}</p>
                                        <p>流式输出：{task.payload.stream ? '开启' : '关闭'}</p>
                                        <p>创建时间：{formatDateTime(task.createdAt)}</p>
                                        <p>更新时间：{formatDateTime(task.updatedAt)}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">
                                        结果信息
                                      </p>
                                      <div className="mt-3 grid gap-2 text-sm text-porcelain-100/72">
                                        <p>
                                          结果标题：
                                          {resultWork?.title ??
                                            task.result?.title ??
                                            task.payload.title ??
                                            '—'}
                                        </p>
                                        <p>
                                          结果模型：
                                          {resultWork?.providerModel ??
                                            task.result?.providerModel ??
                                            task.payload.model}
                                        </p>
                                        <p>
                                          参考图数量：{task.payload.referenceImages?.length ?? 0}
                                        </p>
                                        <p>
                                          模式来源：
                                          {modeLabel(
                                            task.result?.mode ??
                                              resultWork?.mode ??
                                              task.payload.mode,
                                          )}
                                        </p>
                                        <p>
                                          作品快照来源：
                                          {resultWork ? 'works' : task.result ? 'task-result' : '—'}
                                        </p>
                                        <p>
                                          作品标签：
                                          {resultWork?.tags?.length
                                            ? resultWork.tags.join(' / ')
                                            : '—'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">
                                      版本直达关系
                                    </p>
                                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                                      {versionSource.directLinks.map((item) => (
                                        <article
                                          key={`${slot.slotId}:link:${item.id}`}
                                          className="rounded-2xl border border-porcelain-50/10 bg-porcelain-50/[0.035] p-3"
                                        >
                                          <p className="text-xs font-semibold text-porcelain-50">
                                            {item.label}
                                          </p>
                                          <p className="mt-2 text-sm text-porcelain-100/72">
                                            {item.summary}
                                          </p>
                                        </article>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">
                                      当前版比上一版改了什么
                                    </p>
                                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                                      {versionSource.deltaItems.map((item) => (
                                        <article
                                          key={`${slot.slotId}:${item.id}`}
                                          className="rounded-2xl border border-porcelain-50/10 bg-porcelain-50/[0.035] p-3"
                                        >
                                          <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-xs font-semibold text-porcelain-50">
                                              {item.label}
                                            </span>
                                            <span className="rounded-full border border-porcelain-50/10 px-2 py-1 text-[11px] text-porcelain-100/58">
                                              {item.toneLabel}
                                            </span>
                                          </div>
                                          <p className="mt-2 text-sm text-porcelain-100/72">
                                            {item.summary}
                                          </p>
                                          {item.detail ? (
                                            <p className="mt-1 text-xs leading-6 text-porcelain-100/45">
                                              {item.detail}
                                            </p>
                                          ) : null}
                                        </article>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">
                                      工作台 Prompt
                                    </p>
                                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-porcelain-100/72">
                                      {task.payload.workspacePrompt || task.payload.promptText}
                                    </p>
                                  </div>

                                  <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">
                                      请求 Prompt
                                    </p>
                                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-porcelain-100/72">
                                      {task.payload.requestPrompt || task.payload.promptText}
                                    </p>
                                  </div>

                                  <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">
                                      尝试历史
                                    </p>
                                    <div className="mt-3 grid gap-3">
                                      {slot.attempts.map((attempt) => (
                                        <div
                                          key={attempt.id}
                                          className="rounded-2xl border border-porcelain-50/10 bg-porcelain-50/[0.035] p-3"
                                        >
                                          <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <strong className="text-sm text-porcelain-50">
                                                第 {attempt.retryAttempt + 1} 次
                                              </strong>
                                              <span
                                                className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${statusTone(attempt.status)}`}
                                              >
                                                {statusLabel(attempt.status)}
                                              </span>
                                            </div>
                                            <span className="text-xs text-porcelain-100/45">
                                              {formatDateTime(attempt.updatedAt)}
                                            </span>
                                          </div>
                                          <div className="mt-2 grid gap-1 text-xs text-porcelain-100/58">
                                            <p>任务 ID：{attempt.id}</p>
                                            <p>父任务：{attempt.parentTaskId ?? '—'}</p>
                                            <p>进度：{attempt.progress ?? 0}%</p>
                                          </div>
                                          {attempt.errorMessage ? (
                                            <ErrorNotice
                                              error={attempt.errorMessage}
                                              compact
                                              className="mt-3"
                                            />
                                          ) : null}
                                        </div>
                                      ))}
                                    </div>
                                    {task.errorMessage ? (
                                      <ErrorNotice
                                        error={task.errorMessage}
                                        compact
                                        className="mt-4"
                                      />
                                    ) : null}
                                  </div>

                                  <div className="rounded-[1.35rem] border border-signal-cyan/20 bg-signal-cyan/[0.08] p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">
                                      回到工作台
                                    </p>
                                    <p className="mt-3 text-sm text-porcelain-100/72">
                                      {recoverHint}
                                    </p>
                                    <p className="mt-2 text-sm text-porcelain-100/55">
                                      {rerunHint}
                                    </p>
                                  </div>
                                </div>

                                <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-4">
                                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">
                                    结果预览
                                  </p>
                                  {imageUrl ? (
                                    <img
                                      className="mt-4 h-72 w-full rounded-2xl object-cover"
                                      src={imageUrl}
                                      alt={task.result?.title || task.payload.title || '任务结果'}
                                    />
                                  ) : (
                                    <div className="mt-4 flex h-72 items-center justify-center rounded-2xl bg-porcelain-50/[0.05] text-sm text-porcelain-100/45">
                                      当前还没有图片结果
                                    </div>
                                  )}
                                  <div className="mt-4 grid gap-2 text-sm text-porcelain-100/60">
                                    <p>
                                      结果标题：
                                      {resultWork?.title ??
                                        task.result?.title ??
                                        task.payload.title ??
                                        '—'}
                                    </p>
                                    <p>
                                      结果模型：
                                      {resultWork?.providerModel ??
                                        task.result?.providerModel ??
                                        task.payload.model}
                                    </p>
                                    <p>任务快照：{taskSnapshotId}</p>
                                    <p>结果快照：{resultSnapshotId}</p>
                                    <p>生成快照：{generationSnapshotId}</p>
                                    <p>作品 ID：{resultWorkId}</p>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </article>
                        )
                      })
                    ) : (
                      <div className="rounded-[1.5rem] border border-dashed border-porcelain-50/15 bg-porcelain-50/[0.03] px-4 py-6 text-sm text-porcelain-100/55">
                        该批次暂时没有可展示的任务记录。当前属于空批次态，建议先刷新；如果仍为空，说明这条批次还没有形成可回看的任务快照。
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            )
          })}

          {!loading && batchViews.length === 0 ? (
            <div className="progress-card">
              <p className="text-base font-semibold text-porcelain-50">当前还没有生成任务</p>
              <p className="mt-2 text-sm leading-6 text-porcelain-100/60">
                先去工作台发起一次生成后，这里才会出现批次、失败恢复和任务回流入口。没有任务时，不代表模板或作品链路异常。
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}
