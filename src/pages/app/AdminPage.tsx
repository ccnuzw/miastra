import { useCallback, useEffect, useState } from 'react'
import { AdminLogsPanel } from '@/features/admin/AdminLogsPanel'
import { AdminOverviewCards } from '@/features/admin/AdminOverviewCards'
import { deleteAdminProvider, fetchAdminDashboard, fetchAdminPolicies, fetchAdminProviders, fetchAdminTasks, fetchAdminUsers, fetchAdminWorks, upsertAdminProvider, type AdminDashboardData, type AdminGenerationTaskRecord, type AdminManagedProviderRecord, type AdminPoliciesData, type AdminUserRecord, type AdminWorkRecord } from '@/features/admin/admin.api'
import { useAdminPageActions } from '@/features/admin/useAdminPageActions'
import { useAuthSession } from '@/features/auth/useAuthSession'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'
import { apiRequest } from '@/shared/http/client'

type AuditLogRecord = {
  id: string
  actorUserId: string
  actorRole: 'user' | 'operator' | 'admin'
  actorEmail?: string
  actorNickname?: string
  action: string
  targetType: string
  targetId: string
  payload: unknown
  ip?: string
  requestId?: string
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

const allRoles: Array<AdminUserRecord['role']> = ['user', 'operator', 'admin']
const roleLabels: Record<AdminUserRecord['role'], string> = {
  user: '普通用户',
  operator: '运营',
  admin: '管理员',
}

type ProviderDraft = {
  id: string
  name: string
  description: string
  apiUrl: string
  apiKey: string
  modelsText: string
  defaultModel: string
  enabled: boolean
}

const emptyProviderDraft: ProviderDraft = {
  id: '',
  name: '',
  description: '',
  apiUrl: '',
  apiKey: '',
  modelsText: '',
  defaultModel: '',
  enabled: true,
}

export function AdminPage() {
  const { isAuthenticated, loading: authLoading } = useAuthSession()
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [policies, setPolicies] = useState<AdminPoliciesData | null>(null)
  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [works, setWorks] = useState<AdminWorkRecord[]>([])
  const [tasks, setTasks] = useState<AdminGenerationTaskRecord[]>([])
  const [providers, setProviders] = useState<AdminManagedProviderRecord[]>([])
  const [logs, setLogs] = useState<AuditLogRecord[]>([])
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AdminUserRecord['role']>>({})
  const [providerDraft, setProviderDraft] = useState<ProviderDraft>(emptyProviderDraft)
  const [providerBusy, setProviderBusy] = useState('')
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setData(null)
      setPolicies(null)
      setUsers([])
      setWorks([])
      setTasks([])
      setProviders([])
      setLogs([])
      setSessions([])
      setRoleDrafts({})
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [nextDashboard, nextPolicies, nextUsers, nextWorks, nextTasks, nextProviders, nextSessions] = await Promise.all([
        fetchAdminDashboard(),
        fetchAdminPolicies(),
        fetchAdminUsers(),
        fetchAdminWorks(),
        fetchAdminTasks(),
        fetchAdminProviders(),
        fetchMySessions(),
      ])
      setData(nextDashboard)
      setPolicies(nextPolicies)
      setUsers(nextUsers.items)
      setWorks(nextWorks.items)
      setTasks(nextTasks.items)
      setProviders(nextProviders.items)
      setLogs(nextDashboard.logs ?? [])
      setSessions(nextSessions)
      setRoleDrafts(Object.fromEntries(nextUsers.items.map((item) => [item.id, item.role])))
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (authLoading) return
    void refresh()
  }, [authLoading, refresh])

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

  function resetProviderDraft() {
    setProviderDraft(emptyProviderDraft)
  }

  function handleEditProvider(provider: AdminManagedProviderRecord) {
    setProviderDraft({
      id: provider.id,
      name: provider.name,
      description: provider.description ?? '',
      apiUrl: provider.apiUrl,
      apiKey: provider.apiKey,
      modelsText: provider.models.join('\n'),
      defaultModel: provider.defaultModel,
      enabled: provider.enabled,
    })
  }

  async function handleSaveProvider() {
    const providerId = providerDraft.id.trim()
    if (!providerId) {
      setError(new Error('Provider ID 不能为空'))
      return
    }
    const models = providerDraft.modelsText
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
    setProviderBusy(`save:${providerId}`)
    setError(null)
    try {
      await upsertAdminProvider(providerId, {
        name: providerDraft.name,
        description: providerDraft.description || undefined,
        apiUrl: providerDraft.apiUrl,
        apiKey: providerDraft.apiKey,
        models,
        defaultModel: providerDraft.defaultModel,
        enabled: providerDraft.enabled,
      })
      setMessage(`Provider ${providerId} 已保存`)
      resetProviderDraft()
      await refresh()
    } catch (nextError) {
      setError(nextError)
    } finally {
      setProviderBusy('')
    }
  }

  async function handleDeleteProvider(id: string) {
    setProviderBusy(`delete:${id}`)
    setError(null)
    try {
      await deleteAdminProvider(id)
      if (providerDraft.id === id) resetProviderDraft()
      setMessage(`Provider ${id} 已删除`)
      await refresh()
    } catch (nextError) {
      setError(nextError)
    } finally {
      setProviderBusy('')
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-screen-xl px-4 pb-10 pt-32 md:px-8">
      <section className="panel-shell w-full">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Admin</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">后台</h1>
            <p className="mt-2 text-sm text-porcelain-100/60">查看用户、作品、任务、审计日志与系统概览。</p>
            {policies ? (
              <p className="mt-2 text-xs text-porcelain-100/45">
                当前角色：{roleLabels[policies.actorRole]}。
                {policies.operatorScope === 'users-only' ? ' 仅可管理普通用户。' : ' 可管理全部后台账号。'}
                {policies.selfProtection.keepCurrentSessionOnBulkRevoke ? ' 撤销自己的会话时会保留当前登录。' : ''}
              </p>
            ) : null}
          </div>
          <button type="button" className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan" onClick={() => void refresh()}>刷新</button>
        </div>

        {loading ? <p className="mt-6 text-sm text-porcelain-100/60">正在加载后台概览…</p> : null}
        {error ? <ErrorNotice error={error} className="mt-6" /> : null}
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
                      <p className="mt-1 text-xs text-porcelain-100/45">角色：{user.role} / 活跃会话 {user.activeSessionCount} / 作品 {user.workCount} / 任务 {user.taskCount}</p>
                      {user.management.reason ? <p className="mt-2 text-xs text-porcelain-100/45">管理边界：{user.management.reason}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <select className="input-shell py-2 text-sm disabled:opacity-50" value={roleDrafts[user.id] ?? user.role} onChange={(e) => setRoleDrafts((current) => ({ ...current, [user.id]: e.target.value as AdminUserRecord['role'] }))} disabled={!user.management.canChangeRole}>
                          {allRoles.map((role) => (
                            <option key={role} value={role} disabled={!user.management.assignableRoles.includes(role)}>
                              {role}
                            </option>
                          ))}
                        </select>
                        <button type="button" className="rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-3 py-2 text-xs text-signal-cyan disabled:opacity-40" onClick={() => void handleSaveRole(user.id)} disabled={busyId === user.id || !user.management.canChangeRole || (roleDrafts[user.id] ?? user.role) === user.role}>{busyId === user.id ? '保存中…' : '保存角色'}</button>
                        <button type="button" className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-3 py-2 text-xs text-signal-coral disabled:opacity-40" onClick={() => void handleRevokeSessions(user.id)} disabled={busyId === `sessions:${user.id}` || !user.management.canRevokeSessions}>{busyId === `sessions:${user.id}` ? '撤销中…' : user.management.isSelf ? '撤销其他会话' : '撤销会话'}</button>
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-porcelain-50">公共 Provider 管理</h2>
                  <p className="mt-2 text-sm text-porcelain-100/60">这里配置的 Provider 会出现在前台供用户选择。用户只能看到名称、说明和模型列表，看不到 Base URL 与 API Key。</p>
                </div>
                <button type="button" className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan" onClick={resetProviderDraft}>新建 Provider</button>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3">
                  {providers.length ? providers.map((provider) => (
                    <div key={provider.id} className="rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.45] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-porcelain-50">{provider.name}</p>
                          <p className="mt-1 font-mono text-xs text-porcelain-100/45">{provider.id}</p>
                          <p className="mt-2 text-xs text-porcelain-100/55">{provider.description || '无描述'}</p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs ${provider.enabled ? 'border-signal-cyan/30 bg-signal-cyan/10 text-signal-cyan' : 'border-signal-coral/30 bg-signal-coral/10 text-signal-coral'}`}>
                          {provider.enabled ? '已启用' : '已停用'}
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-porcelain-100/55">Base URL：{provider.apiUrl || '留空后走服务端默认上游'}</p>
                      <p className="mt-1 text-xs text-porcelain-100/55">默认模型：{provider.defaultModel}</p>
                      <p className="mt-1 text-xs text-porcelain-100/55">模型列表：{provider.models.join(' / ')}</p>
                      <p className="mt-1 text-xs text-porcelain-100/45">API Key：{provider.apiKey ? '已配置' : '未配置'}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" className="rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-3 py-2 text-xs text-signal-cyan" onClick={() => handleEditProvider(provider)} disabled={providerBusy === `delete:${provider.id}`}>编辑</button>
                        <button type="button" className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-3 py-2 text-xs text-signal-coral disabled:opacity-40" onClick={() => void handleDeleteProvider(provider.id)} disabled={providerBusy === `delete:${provider.id}` || providerBusy === `save:${provider.id}`}>{providerBusy === `delete:${provider.id}` ? '删除中…' : '删除'}</button>
                      </div>
                    </div>
                  )) : <p className="text-sm text-porcelain-100/60">还没有公共 Provider。</p>}
                </div>

                <div className="rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.45] p-4">
                  <h3 className="text-base font-semibold text-porcelain-50">{providerDraft.id ? `编辑 ${providerDraft.id}` : '新建 Provider'}</h3>
                  <div className="mt-4 space-y-3">
                    <label className="field-block">
                      <span className="field-label">Provider ID</span>
                      <input value={providerDraft.id} onChange={(event) => setProviderDraft((current) => ({ ...current, id: event.target.value }))} className="input-shell" placeholder="例如 openai-main" />
                    </label>
                    <label className="field-block">
                      <span className="field-label">名称</span>
                      <input value={providerDraft.name} onChange={(event) => setProviderDraft((current) => ({ ...current, name: event.target.value }))} className="input-shell" />
                    </label>
                    <label className="field-block">
                      <span className="field-label">说明</span>
                      <textarea value={providerDraft.description} onChange={(event) => setProviderDraft((current) => ({ ...current, description: event.target.value }))} className="input-shell min-h-[96px]" />
                    </label>
                    <label className="field-block">
                      <span className="field-label">Base URL</span>
                      <input value={providerDraft.apiUrl} onChange={(event) => setProviderDraft((current) => ({ ...current, apiUrl: event.target.value }))} className="input-shell" placeholder="例如 https://api.openai.com" />
                    </label>
                    <label className="field-block">
                      <span className="field-label">API Key</span>
                      <input value={providerDraft.apiKey} onChange={(event) => setProviderDraft((current) => ({ ...current, apiKey: event.target.value }))} className="input-shell" type="password" placeholder="sk-..." />
                    </label>
                    <label className="field-block">
                      <span className="field-label">模型列表</span>
                      <textarea value={providerDraft.modelsText} onChange={(event) => setProviderDraft((current) => ({ ...current, modelsText: event.target.value }))} className="input-shell min-h-[120px]" placeholder={'每行一个模型，例如\ngpt-image-2'} />
                    </label>
                    <label className="field-block">
                      <span className="field-label">默认模型</span>
                      <input value={providerDraft.defaultModel} onChange={(event) => setProviderDraft((current) => ({ ...current, defaultModel: event.target.value }))} className="input-shell" />
                    </label>
                    <label className="flex items-center gap-3 text-sm text-porcelain-100/75">
                      <input type="checkbox" checked={providerDraft.enabled} onChange={(event) => setProviderDraft((current) => ({ ...current, enabled: event.target.checked }))} />
                      发布给前台用户可选
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-4 py-2 text-sm font-semibold text-signal-cyan disabled:opacity-40" onClick={() => void handleSaveProvider()} disabled={providerBusy === `save:${providerDraft.id}`}>{providerBusy === `save:${providerDraft.id}` ? '保存中…' : '保存 Provider'}</button>
                      <button type="button" className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50" onClick={resetProviderDraft}>重置</button>
                    </div>
                  </div>
                </div>
              </div>
            </article>

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
                        <button type="button" className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-3 py-2 text-xs text-signal-coral" onClick={() => void handleRevokeMySession(session.id)} disabled={busyId === `my:${session.id}`}>{busyId === `my:${session.id}` ? '撤销中…' : '撤销'}</button>
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
