import { useEffect, useState } from 'react'
import { Header } from '@/components/Header'
import { apiRequest } from '@/shared/http/client'

type BillingPlan = {
  id: string
  name: string
  quotaTotal: number
  amountCents: number
  currency: 'CNY'
  periodDays: number
  description: string
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

async function fetchPlans() {
  return apiRequest<BillingPlan[]>('/api/billing/plans')
}

async function fetchInvoices() {
  return apiRequest<BillingInvoice[]>('/api/billing/invoices')
}

async function fetchQuota() {
  return apiRequest<QuotaProfile | null>('/api/auth/quota')
}

async function checkout(planId: string, mode: 'upgrade' | 'renew') {
  return apiRequest<{ profile: QuotaProfile; invoice: BillingInvoice }>('/api/billing/checkout', {
    method: 'POST',
    body: { planId, mode },
  })
}

export function BillingPage() {
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [invoices, setInvoices] = useState<BillingInvoice[]>([])
  const [quota, setQuota] = useState<QuotaProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const [nextPlans, nextInvoices, nextQuota] = await Promise.all([fetchPlans(), fetchInvoices(), fetchQuota()])
      setPlans(nextPlans)
      setInvoices(nextInvoices)
      setQuota(nextQuota)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function handleCheckout(planId: string, mode: 'upgrade' | 'renew') {
    setBusy(planId)
    setError('')
    setMessage('')
    try {
      const result = await checkout(planId, mode)
      setQuota(result.profile)
      setInvoices((items) => [result.invoice, ...items])
      setMessage(mode === 'renew' ? '续费成功，额度已恢复。' : '升级成功，额度已更新。')
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
        <section className="panel-shell w-full space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Billing</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">支付 / 订阅</h1>
              <p className="mt-2 text-sm text-porcelain-100/60">套餐、账单与额度状态都会在这里同步。</p>
            </div>
            <button type="button" className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan" onClick={() => void refresh()}>
              刷新
            </button>
          </div>

          {loading ? <p className="text-sm text-porcelain-100/60">正在加载 Billing 数据…</p> : null}
          {error ? <p className="rounded-2xl border border-signal-coral/30 bg-signal-coral/10 px-4 py-3 text-sm text-signal-coral">{error}</p> : null}
          {message ? <p className="rounded-2xl border border-signal-cyan/30 bg-signal-cyan/10 px-4 py-3 text-sm text-signal-cyan">{message}</p> : null}

          <article className="progress-card space-y-3">
            <h2 className="text-lg font-semibold text-porcelain-50">当前额度</h2>
            {quota ? (
              <div className="grid gap-2 text-sm text-porcelain-100/70 md:grid-cols-2 xl:grid-cols-4">
                <p>套餐：{quota.planName}</p>
                <p>总额度：{quota.quotaTotal}</p>
                <p>已用额度：{quota.quotaUsed}</p>
                <p>剩余额度：{quota.quotaRemaining}</p>
              </div>
            ) : <p className="text-sm text-porcelain-100/60">暂无额度档案。</p>}
          </article>

          <article className="progress-card space-y-4">
            <h2 className="text-lg font-semibold text-porcelain-50">可选套餐</h2>
            <div className="grid gap-4 xl:grid-cols-3">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-3xl border border-porcelain-50/10 bg-ink-950/[0.45] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-porcelain-50">{plan.name}</h3>
                    <span className="text-sm text-signal-cyan">{plan.quotaTotal} 额度</span>
                  </div>
                  <p className="mt-3 text-sm text-porcelain-100/60">{plan.description}</p>
                  <div className="mt-4 text-sm text-porcelain-100/70">
                    <p>价格：¥{(plan.amountCents / 100).toFixed(2)}</p>
                    <p>周期：{plan.periodDays} 天</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" className="rounded-full bg-signal-cyan px-4 py-2 text-sm font-bold text-ink-950 disabled:cursor-not-allowed disabled:opacity-60" disabled={busy === plan.id} onClick={() => void handleCheckout(plan.id, 'upgrade')}>
                      {busy === plan.id ? '处理中…' : '升级'}
                    </button>
                    <button type="button" className="rounded-full border border-porcelain-50/10 px-4 py-2 text-sm font-semibold text-porcelain-50 disabled:cursor-not-allowed disabled:opacity-60" disabled={busy === plan.id} onClick={() => void handleCheckout(plan.id, 'renew')}>
                      续费
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="progress-card space-y-4">
            <h2 className="text-lg font-semibold text-porcelain-50">账单历史</h2>
            <div className="grid gap-3">
              {invoices.map((invoice) => (
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
