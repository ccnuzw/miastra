import { useEffect, useState } from 'react'
import { Header } from '@/components/Header'
import { apiRequest } from '@/shared/http/client'

type SessionRecord = {
  id: string
  userId: string
  createdAt: string
  expiresAt: string
  revokedAt: string | null
  current: boolean
}

type QuotaProfile = {
  userId: string
  planName: string
  quotaTotal: number
  quotaUsed: number
  quotaRemaining: number
  renewsAt?: string | null
  updatedAt: string
}

type BillingInvoice = {
  id: string
  userId: string
  planName: string
  amountCents: number
  currency: string
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  provider: 'mock'
  providerRef?: string
  createdAt: string
  updatedAt: string
}

type MeRecord = {
  id: string
  email: string
  nickname: string
  role: 'user' | 'operator' | 'admin'
  createdAt: string
  updatedAt: string
}

async function fetchMe() {
  return apiRequest<MeRecord | null>('/api/auth/me')
}

async function fetchSessions() {
  return apiRequest<SessionRecord[]>('/api/auth/sessions')
}

async function fetchQuota() {
  return apiRequest<QuotaProfile>('/api/auth/quota')
}

async function fetchInvoices() {
  return apiRequest<BillingInvoice[]>('/api/billing/invoices')
}

async function updatePassword(input: { currentPassword: string; nextPassword: string }) {
  return apiRequest<{ success: true }>('/api/auth/password', { method: 'POST', body: input })
}

async function revokeSession(id: string) {
  return apiRequest<{ success: true }>('/api/auth/sessions/' + id + '/revoke', { method: 'POST' })
}

async function revokeOtherSessions() {
  return apiRequest<{ success: true }>('/api/auth/sessions/revoke-others', { method: 'POST' })
}

export function AccountPage() {
  const [me, setMe] = useState<MeRecord | null>(null)
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [quota, setQuota] = useState<QuotaProfile | null>(null)
  const [invoices, setInvoices] = useState<BillingInvoice[]>([])
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const [nextMe, nextSessions, nextQuota, nextInvoices] = await Promise.all([fetchMe(), fetchSessions(), fetchQuota(), fetchInvoices()])
      setMe(nextMe)
      setSessions(nextSessions)
      setQuota(nextQuota)
      setInvoices(nextInvoices)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('password')
    setError('')
    setMessage('')
    try {
      await updatePassword({ currentPassword, nextPassword })
      setCurrentPassword('')
      setNextPassword('')
      setMessage('密码已更新。')
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    } finally {
      setBusy('')
    }
  }

  async function handleRevoke(id: string) {
    setBusy(id)
    setError('')
    try {
      await revokeSession(id)
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    } finally {
      setBusy('')
    }
  }

  async function handleRevokeOthers() {
    setBusy('others')
    setError('')
    try {
      await revokeOtherSessions()
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-screen w-full max-w-screen-xl px-4 pb-10 pt-32 md:px-8">
        <section className="panel-shell w-full">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Account</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">账户</h1>
              <p className="mt-2 text-sm text-porcelain-100/60">查看账号、会话、套餐配额与最近账单，并修改密码。</p>
            </div>
            <button type="button" className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan" onClick={() => void refresh()}>刷新</button>
          </div>

          {loading ? <p className="mt-6 text-sm text-porcelain-100/60">正在加载账户信息…</p> : null}
          {error ? <p className="mt-6 rounded-2xl border border-signal-coral/30 bg-signal-coral/10 px-4 py-3 text-sm text-signal-coral">{error}</p> : null}
          {message ? <p className="mt-6 rounded-2xl border border-signal-cyan/30 bg-signal-cyan/10 px-4 py-3 text-sm text-signal-cyan">{message}</p> : null}

          {me ? (
            <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_1.2fr]">
              <article className="progress-card space-y-4">
                <h2 className="text-lg font-semibold text-porcelain-50">当前用户</h2>
                <div className="grid gap-3 text-sm text-porcelain-100/70">
                  <p>邮箱：{me.email}</p>
                  <p>昵称：{me.nickname}</p>
                  <p>角色：{me.role}</p>
                  <p>创建时间：{new Date(me.createdAt).toLocaleString()}</p>
                  <p>更新时间：{new Date(me.updatedAt).toLocaleString()}</p>
                </div>
              </article>

              <article className="progress-card space-y-4">
                <h2 className="text-lg font-semibold text-porcelain-50">套餐 / 配额</h2>
                {quota ? (
                  <div className="grid gap-3 text-sm text-porcelain-100/70">
                    <p>套餐：{quota.planName}</p>
                    <p>总额度：{quota.quotaTotal}</p>
                    <p>已用额度：{quota.quotaUsed}</p>
                    <p>剩余额度：{quota.quotaRemaining}</p>
                    <p>下次续期：{quota.renewsAt ? new Date(quota.renewsAt).toLocaleString() : '未设置'}</p>
                  </div>
                ) : <p className="text-sm text-porcelain-100/60">当前没有套餐信息。</p>}
              </article>
            </div>
          ) : null}

          <article className="mt-6 progress-card space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-porcelain-50">修改密码</h2>
              <button type="button" className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-4 py-2 text-sm font-semibold text-signal-coral transition hover:bg-signal-coral hover:text-ink-950" onClick={() => void handleRevokeOthers()} disabled={busy === 'others'}>{busy === 'others' ? '处理中…' : '退出其他设备'}</button>
            </div>
            <form className="grid gap-4 xl:max-w-xl" onSubmit={handlePasswordSubmit}>
              <label className="field-block"><span className="field-label">当前密码</span><input className="input-shell" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
              <label className="field-block"><span className="field-label">新密码</span><input className="input-shell" type="password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} minLength={6} required /></label>
              <button className="rounded-2xl bg-signal-cyan px-4 py-3 text-sm font-bold text-ink-950 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={busy === 'password'}>{busy === 'password' ? '保存中…' : '保存密码'}</button>
            </form>
          </article>

          <article className="mt-6 progress-card space-y-4">
            <h2 className="text-lg font-semibold text-porcelain-50">会话列表</h2>
            <div className="grid gap-3">
              {sessions.map((session) => (
                <div key={session.id} className="rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.45] px-4 py-3 text-sm text-porcelain-100/70">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p>会话：{session.id}</p>
                      <p>创建：{new Date(session.createdAt).toLocaleString()}</p>
                      <p>过期：{new Date(session.expiresAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={session.current ? 'text-signal-cyan' : 'text-porcelain-100/45'}>{session.current ? '当前会话' : session.revokedAt ? '已撤销' : '有效'}</span>
                      {!session.current && !session.revokedAt ? (
                        <button type="button" className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-3 py-2 text-xs font-semibold text-signal-coral" onClick={() => void handleRevoke(session.id)} disabled={busy === session.id}>{busy === session.id ? '撤销中…' : '撤销'}</button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="mt-6 progress-card space-y-4">
            <h2 className="text-lg font-semibold text-porcelain-50">最近账单</h2>
            <div className="grid gap-3">
              {invoices.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.45] px-4 py-3 text-sm text-porcelain-100/70">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p>{invoice.planName}</p>
                      <p>金额：¥{(invoice.amountCents / 100).toFixed(2)} · 状态：{invoice.status}</p>
                    </div>
                    <p>{new Date(invoice.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {!invoices.length ? <p className="text-sm text-porcelain-100/60">暂无账单。</p> : null}
            </div>
          </article>
        </section>
      </main>
    </>
  )
}
