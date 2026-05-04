import { Activity, Boxes, ScrollText, Shield, UserCog, WandSparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminOverviewCards } from '@/features/admin/AdminOverviewCards'
import { AdminPageHeader } from '@/features/admin/AdminPageHeader'
import { type AdminDashboardData, fetchAdminDashboard } from '@/features/admin/admin.api'
import {
  adminRoleLabels,
  adminTaskStatusLabels,
  formatAdminDateTime,
  formatAuditPayload,
  roleTone,
  taskStatusTone,
} from '@/features/admin/admin.utils'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'

const quickLinks = [
  {
    to: '/app/admin/users',
    label: '用户管理',
    icon: UserCog,
    description: '调整角色、撤销会话、查看活跃用户。',
  },
  {
    to: '/app/admin/tasks',
    label: '任务管理',
    icon: WandSparkles,
    description: '跟踪生成任务状态，处理失败和取消。',
  },
  {
    to: '/app/admin/works',
    label: '作品管理',
    icon: Boxes,
    description: '筛查用户作品，处理删除与追溯。',
  },
  {
    to: '/app/admin/providers',
    label: '公共 Provider',
    icon: Shield,
    description: '维护系统级公共模型接入配置。',
  },
  {
    to: '/app/admin/audit',
    label: '审计日志',
    icon: ScrollText,
    description: '查看关键操作记录与排障线索。',
  },
] as const

export function AdminOverviewPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetchAdminDashboard())
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const alerts = useMemo(() => {
    if (!data) return []

    const failedTasks = data.overview.taskStatusBreakdown.failed ?? 0
    const runningTasks = data.overview.taskStatusBreakdown.running ?? 0
    const queuedTasks = data.overview.taskStatusBreakdown.queued ?? 0
    const adminCount = data.overview.roleBreakdown.admin ?? 0

    return [
      {
        title: '失败任务',
        value: failedTasks,
        tone:
          failedTasks > 0
            ? 'border-signal-coral/25 bg-signal-coral/10 text-signal-coral'
            : 'border-porcelain-50/10 bg-ink-950/[0.42] text-porcelain-50',
        hint: failedTasks > 0 ? '建议进入任务页排查失败原因。' : '当前没有失败任务。',
      },
      {
        title: '排队与运行',
        value: runningTasks + queuedTasks,
        tone:
          runningTasks + queuedTasks > 0
            ? 'border-amber-400/25 bg-amber-400/10 text-amber-200'
            : 'border-porcelain-50/10 bg-ink-950/[0.42] text-porcelain-50',
        hint: '用于观察系统积压和正在执行的压力。',
      },
      {
        title: '管理员账号',
        value: adminCount,
        tone:
          adminCount > 1
            ? 'border-signal-cyan/25 bg-signal-cyan/10 text-signal-cyan'
            : 'border-porcelain-50/10 bg-ink-950/[0.42] text-porcelain-50',
        hint: adminCount > 1 ? '建议定期审查高权限账号。' : '当前后台高权限账号较少。',
      },
    ]
  }, [data])

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Overview"
        title="后台总览"
        description="把后台首页收敛成监控面板和分发中心，帮助管理员快速识别风险、进入对应模块，而不是在一个页面里滚动查找。"
        meta={
          data ? (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="status-pill">系统状态：{data.system.status}</span>
              <span className="status-pill">系统时间：{formatAdminDateTime(data.system.now)}</span>
            </div>
          ) : null
        }
        actions={
          <button
            type="button"
            className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan"
            onClick={() => void refresh()}
          >
            刷新总览
          </button>
        }
      />

      {loading ? <p className="text-sm text-porcelain-100/60">正在加载总览数据…</p> : null}
      {error ? <ErrorNotice error={error} /> : null}

      {data ? (
        <>
          <AdminOverviewCards counts={data.overview.counts} />

          <div className="grid gap-4 xl:grid-cols-3">
            {alerts.map((alert) => (
              <article key={alert.title} className={`progress-card border ${alert.tone}`}>
                <p className="text-xs uppercase tracking-[0.22em] text-current/70">{alert.title}</p>
                <p className="mt-3 text-4xl font-semibold text-current">{alert.value}</p>
                <p className="mt-3 text-sm text-porcelain-100/60">{alert.hint}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <article className="progress-card">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-signal-cyan/20 bg-signal-cyan/10 text-signal-cyan">
                  <Activity className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-porcelain-50">当前态势</h2>
                  <p className="mt-1 text-sm text-porcelain-100/55">后台对象分布与任务状态概览。</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-porcelain-100/40">
                    角色分布
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Object.entries(data.overview.roleBreakdown).map(([role, count]) => (
                      <span
                        key={role}
                        className={`rounded-full border px-3 py-2 text-xs ${roleTone(role as keyof typeof adminRoleLabels)}`}
                      >
                        {adminRoleLabels[role as keyof typeof adminRoleLabels] ?? role} · {count}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-porcelain-100/40">
                    任务状态
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Object.entries(data.overview.taskStatusBreakdown).map(([status, count]) => (
                      <span
                        key={status}
                        className={`rounded-full border px-3 py-2 text-xs ${taskStatusTone(status as keyof typeof adminTaskStatusLabels)}`}
                      >
                        {adminTaskStatusLabels[status as keyof typeof adminTaskStatusLabels] ??
                          status}{' '}
                        · {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </article>

            <article className="progress-card">
              <h2 className="text-lg font-semibold text-porcelain-50">快捷入口</h2>
              <div className="mt-4 grid gap-3">
                {quickLinks.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4 transition hover:border-signal-cyan/35 hover:bg-signal-cyan/[0.07]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl border border-signal-cyan/20 bg-signal-cyan/10 text-signal-cyan">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-porcelain-50">{item.label}</p>
                          <p className="mt-1 text-xs text-porcelain-100/50">{item.description}</p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </article>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <article className="progress-card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-porcelain-50">最近用户</h2>
                <Link to="/app/admin/users" className="text-xs text-signal-cyan">
                  查看全部
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {data.users.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-3 text-sm text-porcelain-100/72"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-porcelain-50">{user.nickname}</p>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] ${roleTone(user.role)}`}
                      >
                        {adminRoleLabels[user.role]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-porcelain-100/45">{user.email}</p>
                    <p className="mt-2 text-xs text-porcelain-100/45">
                      会话 {user.activeSessionCount} / 作品 {user.workCount} / 任务 {user.taskCount}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="progress-card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-porcelain-50">最近任务</h2>
                <Link to="/app/admin/tasks" className="text-xs text-signal-cyan">
                  查看全部
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {data.recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-3 text-sm text-porcelain-100/72"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-porcelain-50">
                        {task.payload.title || '未命名任务'}
                      </p>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] ${taskStatusTone(task.status)}`}
                      >
                        {adminTaskStatusLabels[task.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-porcelain-100/45">
                      {task.userNickname ?? task.userEmail ?? '—'}
                    </p>
                    <p className="mt-2 text-xs text-porcelain-100/45">
                      模型：{task.payload.providerId} / {task.payload.model}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="progress-card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-porcelain-50">最近作品</h2>
                <Link to="/app/admin/works" className="text-xs text-signal-cyan">
                  查看全部
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {data.recentWorks.map((work) => (
                  <div
                    key={work.id}
                    className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-3 text-sm text-porcelain-100/72"
                  >
                    <p className="font-semibold text-porcelain-50">{work.title}</p>
                    <p className="mt-1 text-xs text-porcelain-100/45">
                      {work.userNickname ?? work.userEmail ?? '—'}
                    </p>
                    <p className="mt-2 text-xs text-porcelain-100/45">
                      创建时间：{formatAdminDateTime(work.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <article className="progress-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-porcelain-50">最近审计记录</h2>
              <Link to="/app/admin/audit" className="text-xs text-signal-cyan">
                查看全部
              </Link>
            </div>
            <div className="mt-4 grid gap-3">
              {(data.logs ?? []).map((log) => (
                <details
                  key={log.id}
                  className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-porcelain-50">{log.action}</p>
                        <p className="mt-1 text-xs text-porcelain-100/45">
                          {log.actorNickname ?? log.actorEmail ?? log.actorUserId} ·{' '}
                          {log.targetType} / {log.targetId}
                        </p>
                      </div>
                      <p className="text-xs text-porcelain-100/40">
                        {formatAdminDateTime(log.createdAt)}
                      </p>
                    </div>
                  </summary>
                  <pre className="mt-3 overflow-x-auto rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.72] p-3 text-xs leading-6 text-porcelain-100/60">
                    {formatAuditPayload(log.payload)}
                  </pre>
                </details>
              ))}
              {!data.logs?.length ? (
                <p className="text-sm text-porcelain-100/60">当前还没有审计日志。</p>
              ) : null}
            </div>
          </article>
        </>
      ) : null}
    </div>
  )
}
