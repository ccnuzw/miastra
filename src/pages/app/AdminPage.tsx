import { useEffect, useState } from 'react'
import { AdminLogsPanel } from '@/features/admin/AdminLogsPanel'
import { AdminOverviewCards } from '@/features/admin/AdminOverviewCards'
import { fetchAdminDashboard, fetchAdminTasks, fetchAdminUsers, fetchAdminWorks, type AdminDashboardData, type AdminGenerationTaskRecord, type AdminUserRecord, type AdminWorkRecord } from '@/features/admin/admin.api'
import { useAdminPageActions } from '@/features/admin/useAdminPageActions'
import { apiRequest } from '@/shared/http/client'

type AuditLogRecord = {
  id: string
  actorUserId: string
  actorRole: 'user' | 'operator' | 'admin'
  action: string
  targetType: string
  targetId: string
  payload: unknown
  ip?: string
  createdAt: string
}

type SessionRecord = {
  id: string
  userId: string
  createdAt: string
  expiresAt: string
  revokedAt: string | null
  current: boolean
}

async function fetchMySessions() {
  return apiRequest<SessionRecord[]>('/api/auth/sessions')
}

export function AdminPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [works, setWorks] = useState<AdminWorkRecord[]>([])
  const [tasks, setTasks] = useState<AdminGenerationTaskRecord[]>([])
  const [logs, setLogs] = useState<AuditLogRecord[]>([])
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AdminUserRecord['role']>>({})
  const [message, setMessage] = useState('')

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const [nextDashboard, nextUsers, nextWorks, nextTasks, nextSessions] = await Promise.all([
        fetchAdminDashboard(),
        fetchAdminUsers(),
        fetchAdminWorks(),
        fetchAdminTasks(),
        fetchMySessions(),
      ])
      setData(nextDashboard)
      setUsers(nextUsers.items)
      setWorks(nextWorks.items)
      setTasks(nextTasks.items)
      setLogs(nextDashboard.logs ?? [])
      setSessions(nextSessions)
      setRoleDrafts(Object.fromEntries(nextUsers.items.map((item) => [item.id, item.role])))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const {
    busyId,
    handleSaveRole,
    handleRevokeSessions,
    handleRevokeMySession,
    handleRevokeOtherSessions,
  } = useAdminPageActions({
    roleDrafts,
    refresh,
    setError,
    setMessage,
  })

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-screen-xl px-4 pb-10 pt-32 md:px-8">
      <section className="panel-shell w-full">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Admin</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">后台</h1>
            <p className="mt-2 text-sm text-porcelain-100/60">查看用户、作品、任务、审计日志与系统概览。</p>
          </div>
          <button type="button" className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan" onClick={() => void refresh()}>刷新</button>
        </div>

        {loading ? <p className="mt-6 text-sm text-porcelain-100/60">正在加载后台概览…</p> : null}
        {error ? <p className="mt-6 text-sm text-signal-coral">{error}</p> : null}
        {message ? <p className="mt-6 text-sm text-signal-cyan">{message}</p> : null}

        {data ? (
          <>
            <AdminOverviewCards counts={data.overview.counts} />

            <div className="mt-8 grid gap-6 xl:grid-cols-3">
              <article className="progress-card">
                <h2 className="text-lg font-semibold text-porcelain-50">用户管理</h2>
                <div className="mt-4 space-y-3 text-sm text-porcelain-100/70">
                  {users.map((user) => (
                    <div key={user.id} className="rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.45] p-3">
                      <p>{user.nickname} · {user.email}</p>
                      <p className="mt-1 text-xs text-porcelain-100/45">角色：{user.role} / 作品 {user.workCount} / 任务 {user.taskCount}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <select className="input-shell py-2 text-sm" value={roleDrafts[user.id] ?? user.role} onChange={(e) => setRoleDrafts((current) => ({ ...current, [user.id]: e.target.value as AdminUserRecord['role'] }))}>
                          <option value="user">user</option>
                          <option value="operator">operator</option>
                          <option value="admin">admin</option>
                        </select>
                        <button type="button" className="rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-3 py-2 text-xs text-signal-cyan disabled:opacity-40" onClick={() => void handleSaveRole(user.id)} disabled={busyId === user.id}>{busyId === user.id ? '保存中…' : '保存角色'}</button>
                        <button type="button" className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-3 py-2 text-xs text-signal-coral disabled:opacity-40" onClick={() => void handleRevokeSessions(user.id)} disabled={busyId === 'sessions:' + user.id}>{busyId === 'sessions:' + user.id ? '撤销中…' : '撤销会话'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
              <article className="progress-card">
                <h2 className="text-lg font-semibold text-porcelain-50">最近作品</h2>
                <div className="mt-4 space-y-3 text-sm text-porcelain-100/70">{works.map((work) => <div key={work.id} className="rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.45] p-3"><p>{work.title}</p><p className="mt-1 text-xs text-porcelain-100/45">{work.userNickname ?? work.userEmail ?? '—'}</p></div>)}</div>
              </article>
              <article className="progress-card">
                <h2 className="text-lg font-semibold text-porcelain-50">最近任务</h2>
                <div className="mt-4 space-y-3 text-sm text-porcelain-100/70">{tasks.map((task) => <div key={task.id} className="rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.45] p-3"><p>{task.payload.title}</p><p className="mt-1 text-xs text-porcelain-100/45">状态：{task.status} / {task.userNickname ?? task.userEmail ?? '—'}</p></div>)}</div>
              </article>
            </div>

            <article className="mt-8 progress-card">
              <h2 className="text-lg font-semibold text-porcelain-50">会话管理</h2>
              <div className="mt-4 space-y-3 text-sm text-porcelain-100/70">
                {sessions.length ? sessions.map((session) => (
                  <div key={session.id} className="rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.45] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p>{session.current ? '当前会话' : '其他会话'} · {session.id}</p>
                        <p className="mt-1 text-xs text-porcelain-100/45">{new Date(session.createdAt).toLocaleString()} / {new Date(session.expiresAt).toLocaleString()}</p>
                      </div>
                      {!session.current && !session.revokedAt ? (
                        <button type="button" className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-3 py-2 text-xs text-signal-coral" onClick={() => void handleRevokeMySession(session.id)} disabled={busyId === 'my:' + session.id}>{busyId === 'my:' + session.id ? '撤销中…' : '撤销'}</button>
                      ) : null}
                    </div>
                  </div>
                )) : <p className="text-sm text-porcelain-100/60">当前没有可显示会话。</p>}
              </div>
            </article>

            <AdminLogsPanel logs={logs} busyId={busyId} onRevokeOtherSessions={() => void handleRevokeOtherSessions()} />
          </>
        ) : null}
      </section>
    </main>
  )
}
