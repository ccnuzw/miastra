import { useEffect, useMemo, useState } from 'react'
import {
  cancelGenerationTask,
  listGenerationTasks,
  type GenerationTaskRecord,
} from '@/features/generation/generation.api'

const activeTaskRefreshIntervalMs = 4000
const terminalStatuses = new Set<GenerationTaskRecord['status']>(['succeeded', 'failed', 'cancelled', 'timeout'])

function statusTone(status: GenerationTaskRecord['status']) {
  if (status === 'succeeded') return 'text-signal-cyan border-signal-cyan/25 bg-signal-cyan/[0.08]'
  if (status === 'failed' || status === 'timeout' || status === 'cancelled') return 'text-signal-coral border-signal-coral/25 bg-signal-coral/10'
  return 'text-porcelain-50 border-porcelain-50/10 bg-ink-950/[0.55]'
}

export function TasksPage() {
  const [tasks, setTasks] = useState<GenerationTaskRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [expandedId, setExpandedId] = useState('')
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' ? true : document.visibilityState === 'visible')

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const nextTasks = await listGenerationTasks()
      setTasks(nextTasks)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    function handleVisibilityChange() {
      setPageVisible(document.visibilityState === 'visible')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const hasActiveTasks = useMemo(() => tasks.some((task) => !terminalStatuses.has(task.status)), [tasks])

  useEffect(() => {
    if (!hasActiveTasks || !pageVisible) return
    const timer = window.setInterval(() => { void refresh() }, activeTaskRefreshIntervalMs)
    return () => window.clearInterval(timer)
  }, [hasActiveTasks, pageVisible])

  async function handleCancel(taskId: string) {
    setBusyId(taskId)
    setError('')
    try {
      await cancelGenerationTask(taskId)
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    } finally {
      setBusyId('')
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-screen-xl px-4 pb-10 pt-32 md:px-8">
      <section className="panel-shell w-full">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Tasks</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">生成任务</h1>
            <p className="mt-2 text-sm text-porcelain-100/60">这里会展示当前账号的所有生成任务，进行中的任务会自动刷新状态。</p>
          </div>
          <button className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={loading} onClick={() => void refresh()}>{loading ? '刷新中…' : '刷新'}</button>
        </div>

        {error ? <p className="mt-6 rounded-2xl border border-signal-coral/30 bg-signal-coral/10 px-4 py-3 text-sm text-signal-coral">{error}</p> : null}

        <div className="mt-8 grid gap-4">
          {tasks.map((task) => {
            const finished = terminalStatuses.has(task.status)
            const imageUrl = task.result?.imageUrl
            const expanded = expandedId === task.id

            return (
              <article key={task.id} className="progress-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-porcelain-50">{task.payload.title || '未命名任务'}</h2>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(task.status)}`}>{task.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-porcelain-100/60">{task.payload.meta}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-porcelain-100/45">
                      <span>模型：{task.payload.model}</span>
                      <span>模式：{task.payload.mode}</span>
                      <span>进度：{task.progress ?? 0}%</span>
                      <span>更新时间：{new Date(task.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="rounded-full border border-porcelain-50/10 px-4 py-2 text-sm" onClick={() => setExpandedId(expanded ? '' : task.id)}>{expanded ? '收起详情' : '展开详情'}</button>
                    {!finished ? (
                      <button type="button" className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-4 py-2 text-sm font-semibold text-signal-coral transition hover:bg-signal-coral hover:text-ink-950 disabled:cursor-not-allowed disabled:opacity-40" disabled={busyId === task.id} onClick={() => void handleCancel(task.id)}>{busyId === task.id ? '取消中…' : '取消任务'}</button>
                    ) : null}
                  </div>
                </div>

                {expanded ? (
                  <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-4">
                      <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">工作台 Prompt</p>
                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-porcelain-100/72">{task.payload.workspacePrompt || task.payload.promptText}</p>
                      </div>
                      <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">请求 Prompt</p>
                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-porcelain-100/72">{task.payload.requestPrompt || task.payload.promptText}</p>
                      </div>
                      {task.errorMessage ? (
                        <div className="rounded-[1.35rem] border border-signal-coral/25 bg-signal-coral/10 p-4 text-sm text-signal-coral">{task.errorMessage}</div>
                      ) : null}
                    </div>

                    <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.45] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-porcelain-100/40">结果预览</p>
                      {imageUrl ? (
                        <img className="mt-4 h-72 w-full rounded-2xl object-cover" src={imageUrl} alt={task.result?.title || task.payload.title || '任务结果'} />
                      ) : (
                        <div className="mt-4 flex h-72 items-center justify-center rounded-2xl bg-porcelain-50/[0.05] text-sm text-porcelain-100/45">当前还没有图片结果</div>
                      )}
                      <div className="mt-4 grid gap-2 text-sm text-porcelain-100/60">
                        <p>尺寸：{task.result?.size ?? task.payload.size}</p>
                        <p>质量：{task.result?.quality ?? task.payload.quality}</p>
                        <p>快照：{task.result?.snapshotId ?? task.payload.snapshotId ?? '—'}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            )
          })}

          {!loading && tasks.length === 0 ? <div className="progress-card text-sm text-porcelain-100/60">当前还没有生成任务。</div> : null}
        </div>
      </section>
    </main>
  )
}
