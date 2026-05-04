import { Ban, Eye, RotateCcw } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { AdminDetailDrawer } from '@/features/admin/AdminDetailDrawer'
import { AdminPageHeader } from '@/features/admin/AdminPageHeader'
import { AdminPagination } from '@/features/admin/AdminPagination'
import { AdminSelectionBar } from '@/features/admin/AdminSelectionBar'
import {
  type AdminGenerationTaskRecord,
  type AdminTaskStatus,
  cancelAdminTask,
  cancelAdminTasksBulk,
  fetchAdminTaskById,
  fetchAdminTasks,
} from '@/features/admin/admin.api'
import {
  adminTaskStatusLabels,
  formatAdminDateTime,
  isTaskCancellable,
  parsePositivePage,
  taskStatusTone,
} from '@/features/admin/admin.utils'
import { useAdminSearchParams } from '@/features/admin/useAdminSearchParams'
import { useAdminSelection } from '@/features/admin/useAdminSelection'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'

const statusOptions: Array<AdminTaskStatus | ''> = [
  '',
  'pending',
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
  'timeout',
]

export function AdminTasksPage() {
  const { searchParams, updateSearchParams } = useAdminSearchParams()
  const page = parsePositivePage(searchParams.get('page'))
  const appliedQuery = searchParams.get('query') ?? ''
  const statusFilter = (searchParams.get('status') as AdminTaskStatus | '') || ''
  const selectedTaskId = searchParams.get('selected') ?? ''

  const [tasks, setTasks] = useState<AdminGenerationTaskRecord[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [searchInput, setSearchInput] = useState(appliedQuery)
  const [selectedTask, setSelectedTask] = useState<AdminGenerationTaskRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [message, setMessage] = useState('')
  const selection = useAdminSelection()

  useEffect(() => {
    setSearchInput(appliedQuery)
  }, [appliedQuery])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAdminTasks({
        page,
        limit: 12,
        query: appliedQuery || undefined,
        status: statusFilter || undefined,
      })
      setTasks(result.items)
      setTotal(result.total)
      setTotalPages(result.totalPages)

      if (selectedTaskId) {
        setSelectedTask(await fetchAdminTaskById(selectedTaskId))
      }
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [appliedQuery, page, selectedTaskId, statusFilter])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!selectedTaskId) {
      setSelectedTask(null)
      return
    }

    setDetailLoading(true)
    void fetchAdminTaskById(selectedTaskId)
      .then((detail) => setSelectedTask(detail))
      .catch((nextError) => setError(nextError))
      .finally(() => setDetailLoading(false))
  }, [selectedTaskId])

  const pageIds = useMemo(() => tasks.map((item) => item.id), [tasks])
  const selectedOnPageCount = useMemo(
    () => pageIds.filter((id) => selection.selectedIdSet.has(id)).length,
    [pageIds, selection.selectedIdSet],
  )
  const allSelectedOnPage = pageIds.length > 0 && selectedOnPageCount === pageIds.length

  async function handleCancelTask(taskId: string) {
    if (!window.confirm('确定要取消这个任务吗？')) return

    setBusyId(taskId)
    setError(null)
    setMessage('')
    try {
      await cancelAdminTask(taskId)
      setMessage('任务已取消。')
      await refresh()
    } catch (nextError) {
      setError(nextError)
    } finally {
      setBusyId('')
    }
  }

  async function handleBulkCancel() {
    if (!selection.selectedIds.length) return
    if (!window.confirm(`确定要批量取消 ${selection.selectedIds.length} 个任务吗？`)) return

    setBulkBusy(true)
    setError(null)
    setMessage('')
    try {
      const result = await cancelAdminTasksBulk(selection.selectedIds)
      selection.clearSelection()
      setMessage(`已处理 ${result.processedCount} 个任务，成功取消 ${result.succeeded.length} 个。`)
      await refresh()
    } catch (nextError) {
      setError(nextError)
    } finally {
      setBulkBusy(false)
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateSearchParams({
      page: '1',
      query: searchInput.trim() || undefined,
      selected: undefined,
    })
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Tasks"
        title="任务管理"
        description="任务页改成异常处理工作台，优先展示状态、所属用户、执行模型和时间线，便于管理员快速排查和取消。"
        meta={<span className="status-pill">当前结果：{total} 个任务</span>}
        actions={
          <button
            type="button"
            className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan"
            onClick={() => void refresh()}
          >
            刷新任务
          </button>
        }
      />

      <AdminSelectionBar
        count={selection.selectedCount}
        label="可批量取消选中的任务"
        actions={
          <>
            <button
              type="button"
              className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-4 py-2 text-sm font-semibold text-signal-coral disabled:opacity-35"
              onClick={() => void handleBulkCancel()}
              disabled={bulkBusy}
            >
              {bulkBusy ? '处理中…' : '批量取消'}
            </button>
            <button
              type="button"
              className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.72] px-4 py-2 text-sm font-semibold text-porcelain-50"
              onClick={() => selection.clearSelection()}
            >
              清空选择
            </button>
          </>
        }
      />

      <article className="progress-card">
        <form
          className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_160px]"
          onSubmit={handleSearchSubmit}
        >
          <label className="field-block">
            <span className="field-label">搜索任务</span>
            <input
              className="input-shell"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="标题、提示词、所属用户"
            />
          </label>

          <label className="field-block">
            <span className="field-label">状态筛选</span>
            <select
              className="input-shell"
              value={statusFilter}
              onChange={(event) =>
                updateSearchParams({
                  page: '1',
                  status: event.target.value,
                  selected: undefined,
                })
              }
            >
              {statusOptions.map((status) => (
                <option key={status || 'all'} value={status}>
                  {status ? adminTaskStatusLabels[status] : '全部状态'}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="h-12 rounded-2xl bg-signal-cyan px-4 text-sm font-bold text-ink-950"
            >
              应用筛选
            </button>
            <button
              type="button"
              className="grid h-12 w-12 place-items-center rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.72] text-porcelain-50"
              onClick={() =>
                updateSearchParams({
                  page: '1',
                  query: undefined,
                  status: undefined,
                  selected: undefined,
                })
              }
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </form>
      </article>

      {loading ? <p className="text-sm text-porcelain-100/60">正在加载任务列表…</p> : null}
      {error ? <ErrorNotice error={error} /> : null}
      {message ? (
        <p className="rounded-2xl border border-signal-cyan/25 bg-signal-cyan/10 px-4 py-3 text-sm text-signal-cyan">
          {message}
        </p>
      ) : null}

      <section className="admin-table-shell">
        <div className="flex items-center justify-between border-b border-porcelain-50/10 px-4 py-3 text-xs text-porcelain-100/45">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allSelectedOnPage}
              onChange={(event) => selection.toggleMany(pageIds, event.target.checked)}
            />
            选中当前页
          </label>
          <p>优先查看运行中、失败和积压任务</p>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-12" />
                <th>任务</th>
                <th>用户</th>
                <th>状态</th>
                <th>Provider / Model</th>
                <th>进度</th>
                <th>更新时间</th>
                <th className="w-[180px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className={selectedTaskId === task.id ? 'admin-table-row-active' : undefined}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selection.isSelected(task.id)}
                      onChange={() => selection.toggleSelection(task.id)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => updateSearchParams({ selected: task.id })}
                    >
                      <p className="font-semibold text-porcelain-50">
                        {task.payload.title || '未命名任务'}
                      </p>
                      <p className="mt-1 max-w-[28rem] break-words text-xs text-porcelain-100/45">
                        {task.payload.promptText || task.payload.requestPrompt || '无 prompt'}
                      </p>
                    </button>
                  </td>
                  <td>{task.userNickname ?? task.userEmail ?? '—'}</td>
                  <td>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] ${taskStatusTone(task.status)}`}
                    >
                      {adminTaskStatusLabels[task.status]}
                    </span>
                  </td>
                  <td>
                    <p className="text-porcelain-50">{task.payload.providerId}</p>
                    <p className="mt-1 text-xs text-porcelain-100/45">{task.payload.model}</p>
                  </td>
                  <td>{typeof task.progress === 'number' ? `${task.progress}%` : '—'}</td>
                  <td>{formatAdminDateTime(task.updatedAt)}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.72] px-3 py-2 text-xs font-semibold text-porcelain-50"
                        onClick={() => updateSearchParams({ selected: task.id })}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Eye className="h-3.5 w-3.5" />
                          查看
                        </span>
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-3 py-2 text-xs font-semibold text-signal-coral disabled:opacity-35"
                        onClick={() => void handleCancelTask(task.id)}
                        disabled={busyId === task.id || !isTaskCancellable(task.status)}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Ban className="h-3.5 w-3.5" />
                          {busyId === task.id ? '处理中…' : '取消'}
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!loading && !tasks.length ? (
        <p className="text-sm text-porcelain-100/60">没有匹配的任务。</p>
      ) : null}

      <AdminPagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={(nextPage) => updateSearchParams({ page: String(nextPage) })}
      />

      <AdminDetailDrawer
        open={Boolean(selectedTaskId)}
        title={selectedTask?.payload.title || '任务详情'}
        subtitle={
          selectedTask ? `${selectedTask.payload.providerId} / ${selectedTask.payload.model}` : ''
        }
        onClose={() => updateSearchParams({ selected: undefined })}
        actions={
          selectedTask && isTaskCancellable(selectedTask.status) ? (
            <button
              type="button"
              className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-4 py-2 text-sm font-semibold text-signal-coral disabled:opacity-35"
              onClick={() => selectedTaskId && void handleCancelTask(selectedTaskId)}
              disabled={busyId === selectedTaskId}
            >
              {busyId === selectedTaskId ? '处理中…' : '取消任务'}
            </button>
          ) : null
        }
      >
        {detailLoading && !selectedTask ? (
          <p className="text-sm text-porcelain-100/60">正在加载任务详情…</p>
        ) : null}

        {selectedTask ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">状态</p>
                <p className="mt-2 text-base font-semibold text-porcelain-50">
                  {adminTaskStatusLabels[selectedTask.status]}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">进度</p>
                <p className="mt-2 text-base font-semibold text-porcelain-50">
                  {typeof selectedTask.progress === 'number' ? `${selectedTask.progress}%` : '—'}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">用户</p>
                <p className="mt-2 text-base font-semibold text-porcelain-50">
                  {selectedTask.userNickname ?? selectedTask.userEmail ?? '—'}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">尺寸</p>
                <p className="mt-2 text-base font-semibold text-porcelain-50">
                  {selectedTask.payload.size}
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">Prompt</p>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-porcelain-100/70">
                  {selectedTask.payload.promptText ||
                    selectedTask.payload.requestPrompt ||
                    '无 prompt'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                  执行信息
                </p>
                <div className="mt-3 space-y-2 text-sm text-porcelain-100/70">
                  <p>任务 ID：{selectedTask.id}</p>
                  <p>模式：{selectedTask.payload.mode}</p>
                  <p>质量：{selectedTask.payload.quality}</p>
                  <p>流式：{selectedTask.payload.stream ? '是' : '否'}</p>
                  <p>创建时间：{formatAdminDateTime(selectedTask.createdAt)}</p>
                  <p>更新时间：{formatAdminDateTime(selectedTask.updatedAt)}</p>
                  {selectedTask.errorMessage ? (
                    <p className="text-signal-coral">错误：{selectedTask.errorMessage}</p>
                  ) : null}
                </div>
              </div>
            </div>

            {selectedTask.result?.imageUrl ? (
              <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                  结果预览
                </p>
                <img
                  src={selectedTask.result.imageUrl}
                  alt={selectedTask.result.title || selectedTask.payload.title}
                  className="mt-4 max-h-[420px] w-full rounded-[1.2rem] object-contain"
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminDetailDrawer>
    </div>
  )
}
