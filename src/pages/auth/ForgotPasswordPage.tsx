import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthCard } from '@/features/auth/AuthCard'
import {
  fetchPasswordResetConfig,
  forgotPassword,
  resetPassword,
  type PasswordResetRuntimeConfig,
} from '@/features/auth/auth.api'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialEmail = searchParams.get('email') ?? ''
  const initialToken = searchParams.get('token') ?? ''
  const [email, setEmail] = useState(initialEmail)
  const [token, setToken] = useState(initialToken)
  const [nextPassword, setNextPassword] = useState('')
  const [debugToken, setDebugToken] = useState('')
  const [debugTokenExpiresAt, setDebugTokenExpiresAt] = useState('')
  const [config, setConfig] = useState<PasswordResetRuntimeConfig | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadingConfig, setLoadingConfig] = useState(true)

  const hasToken = useMemo(() => token.trim().length > 0, [token])
  const showResetForm = hasToken || config?.mode === 'debug'

  useEffect(() => {
    let active = true

    async function loadConfig() {
      setLoadingConfig(true)
      try {
        const nextConfig = await fetchPasswordResetConfig()
        if (!active) return
        setConfig(nextConfig)
      } catch (nextError) {
        if (!active) return
        setError(nextError)
      } finally {
        if (active) setLoadingConfig(false)
      }
    }

    void loadConfig()
    return () => {
      active = false
    }
  }, [])

  async function handleRequestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setMessage('')
    setDebugToken('')
    setDebugTokenExpiresAt('')

    try {
      const result = await forgotPassword({ email })
      if (result.debugResetToken) {
        setDebugToken(result.debugResetToken)
        setDebugTokenExpiresAt(result.resetTokenExpiresAt ?? '')
        setMessage('当前环境为开发调试模式。重置令牌已生成，请手动复制到下方表单完成重置。')
      } else {
        setMessage('如果该邮箱存在，系统已受理找回密码请求。')
      }
    } catch (nextError) {
      setError(nextError)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setMessage('')

    try {
      await resetPassword({ email, token, nextPassword })
      setMessage('密码已重置，正在返回登录页。')
      window.setTimeout(() => {
        navigate('/login', { replace: true, state: { from: '/app/studio' } })
      }, 800)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="找回密码"
      subtitle={config?.notice ?? '正在加载找回密码能力配置…'}
      footer={<span>想起密码了？ <Link className="text-signal-cyan" to="/login">返回登录</Link></span>}
    >
      <form className="space-y-4" onSubmit={handleRequestReset}>
        <label className="field-block">
          <span className="field-label">邮箱</span>
          <input className="input-shell" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
        </label>
        {!loadingConfig && config?.mode === 'disabled' ? (
          <p className="text-sm text-porcelain-100/60">当前环境没有接入邮件发送能力，因此不能在线发起找回密码请求。</p>
        ) : null}
        <button className="w-full rounded-2xl bg-signal-cyan px-4 py-3 text-sm font-bold text-ink-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={loadingConfig || submitting || !email.trim() || !config?.requestAvailable}>
          {submitting ? '提交中…' : config?.mode === 'debug' ? '生成调试重置令牌' : '发送重置请求'}
        </button>
      </form>

      {message ? <p className="text-sm text-signal-cyan">{message}</p> : null}
      {error ? <ErrorNotice error={error} compact /> : null}

      {debugToken ? (
        <div className="rounded-2xl border border-signal-cyan/30 bg-signal-cyan/10 px-4 py-3 text-sm text-signal-cyan">
          <p>开发调试令牌：</p>
          <p className="mt-2 break-all font-mono text-xs text-porcelain-50">{debugToken}</p>
          {debugTokenExpiresAt ? <p className="mt-2 text-xs text-porcelain-100/70">有效期至：{new Date(debugTokenExpiresAt).toLocaleString()}</p> : null}
        </div>
      ) : null}

      {showResetForm ? (
        <form className="space-y-4 border-t border-porcelain-50/10 pt-5" onSubmit={handleResetPassword}>
          <label className="field-block">
            <span className="field-label">重置令牌</span>
            <input className="input-shell" type="text" value={token} onChange={(event) => setToken(event.target.value)} placeholder="请输入重置令牌" required />
          </label>
          <label className="field-block">
            <span className="field-label">新密码</span>
            <input className="input-shell" type="password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} placeholder="至少 6 位" minLength={6} required />
          </label>
          <button className="w-full rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-3 text-sm font-bold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={submitting || !email.trim() || !hasToken || nextPassword.length < 6}>
            {submitting ? '重置中…' : '确认重置密码'}
          </button>
        </form>
      ) : null}
    </AuthCard>
  )
}
