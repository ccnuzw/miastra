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

const operatorShortcuts = [
  {
    to: '/app/admin/tasks?preset=failed&status=failed',
    label: '失败任务',
  },
  {
    to: '/app/admin/tasks?preset=queued&status=queued',
    label: '排队任务',
  },
  {
    to: '/app/admin/users?preset=admins&role=admin',
    label: '管理员账号',
  },
  {
    to: '/app/admin/audit?preset=provider-change&targetType=managed_provider',
    label: 'Provider 变更',
  },
  {
    to: '/app/admin/audit?preset=work-delete&action=work.deleted&targetType=work',
    label: '作品删除记录',
  },
] as const

type AdminPriorityItem = {
  title: string
  description: string
  to: string
  tone: string
}

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
        to: '/app/admin/tasks?preset=failed&status=failed',
        tone:
          failedTasks > 0
            ? 'border-signal-coral/25 bg-signal-coral/10 text-signal-coral'
            : 'border-porcelain-50/10 bg-ink-950/[0.42] text-porcelain-50',
        hint: failedTasks > 0 ? '建议进入任务页排查失败原因。' : '当前没有失败任务。',
      },
      {
        title: '执行中任务',
        value: runningTasks,
        to: '/app/admin/tasks?preset=running&status=running',
        tone:
          runningTasks > 0
            ? 'border-amber-400/25 bg-amber-400/10 text-amber-200'
            : 'border-porcelain-50/10 bg-ink-950/[0.42] text-porcelain-50',
        hint: runningTasks > 0 ? '适合跟进长时间执行中的任务。' : '当前没有执行中的任务。',
      },
      {
        title: '排队任务',
        value: queuedTasks,
        to: '/app/admin/tasks?preset=queued&status=queued',
        tone:
          queuedTasks > 0
            ? 'border-amber-400/25 bg-amber-400/10 text-amber-200'
            : 'border-porcelain-50/10 bg-ink-950/[0.42] text-porcelain-50',
        hint: queuedTasks > 0 ? '适合排查积压和吞吐压力。' : '当前没有排队任务。',
      },
      {
        title: '管理员账号',
        value: adminCount,
        to: '/app/admin/users?preset=admins&role=admin',
        tone:
          adminCount > 1
            ? 'border-signal-cyan/25 bg-signal-cyan/10 text-signal-cyan'
            : 'border-porcelain-50/10 bg-ink-950/[0.42] text-porcelain-50',
        hint: adminCount > 1 ? '建议定期审查高权限账号。' : '当前后台高权限账号较少。',
      },
    ]
  }, [data])

  const priorities = useMemo(() => {
    if (!data) return []

    const providerDisabled = data.overview.providerHealth.disabled
    const providerMissingApiKey = data.overview.providerHealth.missingApiKey
    const failedTasks = data.overview.taskStatusBreakdown.failed ?? 0
    const queuedTasks = data.overview.taskStatusBreakdown.queued ?? 0
    const runningTasks = data.overview.taskStatusBreakdown.running ?? 0
    const adminCount = data.overview.roleBreakdown.admin ?? 0

    const items: Array<AdminPriorityItem | null> = [
      failedTasks > 0
        ? {
            title: '优先处理失败任务',
            description: `当前有 ${failedTasks} 个失败任务，建议优先排查模型、上游返回和配额异常。`,
            to: '/app/admin/tasks?preset=failed&status=failed',
            tone: 'border-signal-coral/25 bg-signal-coral/10 text-signal-coral',
          }
        : null,
      queuedTasks > 0
        ? {
            title: '关注任务积压',
            description: `当前有 ${queuedTasks} 个任务仍在排队，建议检查吞吐和上游可用性。`,
            to: '/app/admin/tasks?preset=queued&status=queued',
            tone: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
          }
        : null,
      runningTasks > 0
        ? {
            title: '跟进长时间执行中的任务',
            description: `当前有 ${runningTasks} 个执行中任务，建议确认是否存在超时或重试链路异常。`,
            to: '/app/admin/tasks?preset=running&status=running',
            tone: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
          }
        : null,
      providerDisabled > 0
        ? {
            title: '检查已停用 Provider',
            description: `当前有 ${providerDisabled} 个公共 Provider 处于停用状态，建议确认是否影响前台可选能力。`,
            to: '/app/admin/providers',
            tone: 'border-signal-coral/25 bg-signal-coral/10 text-signal-coral',
          }
        : null,
      providerMissingApiKey > 0
        ? {
            title: '补齐 Provider 凭证',
            description: `当前有 ${providerMissingApiKey} 个公共 Provider 未配置 API Key，建议优先补齐或下线。`,
            to: '/app/admin/providers',
            tone: 'border-signal-coral/25 bg-signal-coral/10 text-signal-coral',
          }
        : null,
      adminCount > 1
        ? {
            title: '复核高权限账号',
            description: `当前有 ${adminCount} 个管理员账号，建议定期审查高权限账号是否仍有必要。`,
            to: '/app/admin/users?preset=admins&role=admin',
            tone: 'border-signal-cyan/25 bg-signal-cyan/10 text-signal-cyan',
          }
        : null,
    ]
    return items.filter((item): item is AdminPriorityItem => item !== null)
  }, [data])

  return (
    <div className="admin-page-content">
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

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-porcelain-50">待处理中心</h2>
                <p className="mt-1 text-sm text-porcelain-100/55">
                  首页优先展示当前需要跟进的对象，减少在后台内反复跳转查找。
                </p>
              </div>
              <span className="status-pill">共 {alerts.reduce((sum, item) => sum + item.value, 0)} 个重点对象</span>
            </div>
          <div className="grid gap-4 xl:grid-cols-4">
            {alerts.map((alert) => (
              <Link key={alert.title} to={alert.to} className={`progress-card block border transition hover:-translate-y-0.5 ${alert.tone}`}>
                <p className="text-xs uppercase tracking-[0.22em] text-current/70">{alert.title}</p>
                <p className="mt-3 text-4xl font-semibold text-current">{alert.value}</p>
                <p className="mt-3 text-sm text-porcelain-100/60">{alert.hint}</p>
                <p className="mt-4 text-xs font-semibold text-current/80">进入处理</p>
              </Link>
            ))}
          </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-porcelain-50">建议优先处理</h2>
              <p className="mt-1 text-sm text-porcelain-100/55">
                把后台当前最值得跟进的异常和运营动作收敛到一处，避免只看总数。
              </p>
            </div>
            {priorities.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {priorities.map((item) => (
                  <Link
                    key={item.title}
                    to={item.to}
                    className={`progress-card block border transition hover:-translate-y-0.5 ${item.tone}`}
                  >
                    <p className="text-sm font-semibold text-current">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-porcelain-100/68">{item.description}</p>
                    <p className="mt-4 text-xs font-semibold text-current/80">立即查看</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="progress-card border border-signal-cyan/20 bg-signal-cyan/10 text-signal-cyan">
                <p className="text-sm font-semibold">当前没有需要优先处理的异常。</p>
                <p className="mt-2 text-sm text-porcelain-100/70">系统状态平稳，可以继续做例行巡检和抽样检查。</p>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-porcelain-50">运营捷径</h2>
              <p className="mt-1 text-sm text-porcelain-100/55">
                直接进入后台里最常用的几个处理视角，减少从模块页再二次筛选的成本。
              </p>
            </div>
            <div className="admin-filter-strip">
              {operatorShortcuts.map((item) => (
                <Link key={item.to} to={item.to} className="admin-filter-chip">
                  {item.label}
                </Link>
              ))}
            </div>
          </section>

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
                  <Link
                    key={user.id}
                    to={`/app/admin/users?selected=${user.id}`}
                    className="block rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-3 text-sm text-porcelain-100/72"
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
                  </Link>
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
                  <Link
                    key={task.id}
                    to={`/app/admin/tasks?selected=${task.id}`}
                    className="block rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-3 text-sm text-porcelain-100/72"
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
                  </Link>
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
                  <Link
                    key={work.id}
                    to={`/app/admin/works?selected=${work.id}`}
                    className="block rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-3 text-sm text-porcelain-100/72"
                  >
                    <p className="font-semibold text-porcelain-50">{work.title}</p>
                    <p className="mt-1 text-xs text-porcelain-100/45">
                      {work.userNickname ?? work.userEmail ?? '—'}
                    </p>
                    <p className="mt-2 text-xs text-porcelain-100/45">
                      创建时间：{formatAdminDateTime(work.createdAt)}
                    </p>
                  </Link>
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
