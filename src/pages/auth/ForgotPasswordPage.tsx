import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthCard } from '@/features/auth/AuthCard'
import { forgotPassword, resetPassword } from '@/features/auth/auth.api'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialEmail = searchParams.get('email') ?? ''
  const initialToken = searchParams.get('token') ?? ''
  const [email, setEmail] = useState(initialEmail)
  const [token, setToken] = useState(initialToken)
  const [nextPassword, setNextPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const hasToken = useMemo(() => token.trim().length > 0, [token])

  async function handleRequestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      const result = await forgotPassword({ email })
      const nextToken = result.debugResetToken ?? ''
      if (nextToken) {
        setToken(nextToken)
        setSearchParams({ email, token: nextToken })
        setMessage('重置令牌已生成，当前为开发模式，已直接填入页面。请设置新密码。')
      } else {
        setMessage('如果该邮箱存在，系统已受理找回密码请求。')
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      await resetPassword({ email, token, nextPassword })
      setMessage('密码已重置，正在返回登录页。')
      window.setTimeout(() => {
        navigate('/login', { replace: true, state: { from: '/app/studio' } })
      }, 800)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '重置失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="找回密码"
      subtitle="当前版本提供开发态找回密码闭环：提交邮箱后会返回可直接使用的重置令牌。"
      footer={<span>想起密码了？ <Link className="text-signal-cyan" to="/login">返回登录</Link></span>}
    >
      <form className="space-y-4" onSubmit={handleRequestReset}>
        <label className="field-block">
          <span className="field-label">邮箱</span>
          <input className="input-shell" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
        </label>
        <button className="w-full rounded-2xl bg-signal-cyan px-4 py-3 text-sm font-bold text-ink-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={submitting || !email.trim()}>
          {submitting ? '提交中…' : '发送重置请求'}
        </button>
      </form>

      <form className="space-y-4 border-t border-porcelain-50/10 pt-5" onSubmit={handleResetPassword}>
        <label className="field-block">
          <span className="field-label">重置令牌</span>
          <input className="input-shell" type="text" value={token} onChange={(event) => setToken(event.target.value)} placeholder="请输入重置令牌" required />
        </label>
        <label className="field-block">
          <span className="field-label">新密码</span>
          <input className="input-shell" type="password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} placeholder="至少 6 位" minLength={6} required />
        </label>
        {message ? <p className="text-sm text-signal-cyan">{message}</p> : null}
        {error ? <p className="text-sm text-signal-coral">{error}</p> : null}
        <button className="w-full rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-3 text-sm font-bold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={submitting || !email.trim() || !hasToken || nextPassword.length < 6}>
          {submitting ? '重置中…' : '确认重置密码'}
        </button>
      </form>
    </AuthCard>
  )
}
