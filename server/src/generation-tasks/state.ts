import type { GenerationTaskStatus, StoredGenerationTask } from '../auth/types'

const terminalTaskStatuses = new Set<GenerationTaskStatus>(['succeeded', 'failed', 'cancelled', 'timeout'])
const activeTaskStatuses = new Set<GenerationTaskStatus>(['pending', 'queued', 'running'])
const retryableTaskStatuses = new Set<GenerationTaskStatus>(['failed', 'cancelled', 'timeout'])

const allowedTaskTransitions: Record<GenerationTaskStatus, Set<GenerationTaskStatus>> = {
  pending: new Set(['pending', 'queued', 'running', 'failed', 'cancelled', 'timeout']),
  queued: new Set(['queued', 'running', 'failed', 'cancelled', 'timeout']),
  running: new Set(['running', 'succeeded', 'failed', 'cancelled', 'timeout']),
  succeeded: new Set(['succeeded']),
  failed: new Set(['failed']),
  cancelled: new Set(['cancelled']),
  timeout: new Set(['timeout']),
}

function toTimestamp(value: string) {
  return Number(new Date(value))
}

export function isTerminalTaskStatus(status: GenerationTaskStatus) {
  return terminalTaskStatuses.has(status)
}

export function isActiveTaskStatus(status: GenerationTaskStatus) {
  return activeTaskStatuses.has(status)
}

export function getTaskRetryAttempt(task: StoredGenerationTask) {
  return task.payload.tracking?.retryAttempt ?? 0
}

export function getTaskRootTaskId(task: StoredGenerationTask) {
  return task.payload.tracking?.rootTaskId ?? task.id
}

export function getTaskBatchId(task: StoredGenerationTask) {
  return task.payload.draw?.batchId ?? task.result?.batchId
}

export function getTaskDrawIndex(task: StoredGenerationTask) {
  return task.payload.draw?.drawIndex ?? task.result?.drawIndex
}

export function getTaskVariation(task: StoredGenerationTask) {
  return task.result?.variation ?? task.payload.draw?.variation
}

export function getTaskSlotKey(task: StoredGenerationTask) {
  const batchId = getTaskBatchId(task)
  if (batchId) {
    return `${batchId}:${String(getTaskDrawIndex(task) ?? getTaskRootTaskId(task))}`
  }
  return getTaskRootTaskId(task)
}

export function sortTaskAttemptsDesc(left: StoredGenerationTask, right: StoredGenerationTask) {
  const retryDiff = getTaskRetryAttempt(right) - getTaskRetryAttempt(left)
  if (retryDiff !== 0) return retryDiff

  const updatedDiff = toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt)
  if (updatedDiff !== 0) return updatedDiff

  return toTimestamp(right.createdAt) - toTimestamp(left.createdAt)
}

export function buildLatestTaskMap(tasks: StoredGenerationTask[]) {
  const latestBySlot = new Map<string, StoredGenerationTask>()

  for (const task of tasks) {
    const slotKey = getTaskSlotKey(task)
    const current = latestBySlot.get(slotKey)
    if (!current || sortTaskAttemptsDesc(task, current) < 0) {
      latestBySlot.set(slotKey, task)
    }
  }

  return latestBySlot
}

export function canTransitionTaskStatus(currentStatus: GenerationTaskStatus, nextStatus: GenerationTaskStatus) {
  return allowedTaskTransitions[currentStatus]?.has(nextStatus) ?? false
}

export function isTaskRetryable(task: StoredGenerationTask, latestTaskMap?: Map<string, StoredGenerationTask>) {
  if (!retryableTaskStatuses.has(task.status)) return false
  if (!latestTaskMap) return true
  return latestTaskMap.get(getTaskSlotKey(task))?.id === task.id
}

export function sanitizeTask(task: StoredGenerationTask, latestTaskMap?: Map<string, StoredGenerationTask>) {
  return {
    ...task,
    batchId: getTaskBatchId(task),
    drawIndex: getTaskDrawIndex(task),
    variation: getTaskVariation(task),
    retryAttempt: getTaskRetryAttempt(task),
    rootTaskId: getTaskRootTaskId(task),
    parentTaskId: task.payload.tracking?.parentTaskId,
    retryable: isTaskRetryable(task, latestTaskMap),
    payload: {
      ...task.payload,
    },
  }
}

export type DerivedBatchSummary = {
  count: number
  successCount: number
  failedCount: number
  cancelledCount: number
  interruptedCount: number
  timeoutCount: number
  pendingCount: number
  queuedCount: number
  runningCount: number
}

export function summarizeBatchTasks(tasks: StoredGenerationTask[]) {
  const summaries = new Map<string, DerivedBatchSummary>()

  for (const task of buildLatestTaskMap(tasks).values()) {
    const batchId = getTaskBatchId(task)
    if (!batchId) continue

    const summary = summaries.get(batchId) ?? {
      count: 0,
      successCount: 0,
      failedCount: 0,
      cancelledCount: 0,
      interruptedCount: 0,
      timeoutCount: 0,
      pendingCount: 0,
      queuedCount: 0,
      runningCount: 0,
    }

    summary.count += 1
    if (task.status === 'succeeded') summary.successCount += 1
    else if (task.status === 'failed') summary.failedCount += 1
    else if (task.status === 'cancelled') summary.cancelledCount += 1
    else if (task.status === 'timeout') summary.timeoutCount += 1
    else if (task.status === 'pending') summary.pendingCount += 1
    else if (task.status === 'queued') summary.queuedCount += 1
    else if (task.status === 'running') summary.runningCount += 1

    summaries.set(batchId, summary)
  }

  return summaries
}
