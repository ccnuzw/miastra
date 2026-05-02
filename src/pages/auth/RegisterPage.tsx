import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthCard } from '@/features/auth/AuthCard'
import { register } from '@/features/auth/auth.api'
import { useAuthSession } from '@/features/auth/useAuthSession'

type RedirectState = {
  from?: {
    pathname: string
    search?: string
    hash?: string
  }
}

function buildRedirectTo(state: unknown) {
  const from = (state as RedirectState | null)?.from
  if (!from) return '/app/studio'
  return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
}

export function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refresh } = useAuthSession()
  const [nickname, setNickname] = useState('New User')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const redirectTo = buildRedirectTo(location.state)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await register({ nickname, email, password })
      await refresh()
      navigate(redirectTo, { replace: true })
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title="注册账号" subtitle="创建一个新的 Miastra 账号。" footer={<span>已有账号？ <Link className="text-signal-cyan" to="/login">去登录</Link></span>}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="field-block"><span className="field-label">昵称</span><input className="input-shell" autoComplete="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} required /></label>
        <label className="field-block"><span className="field-label">邮箱</span><input className="input-shell" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="field-block"><span className="field-label">密码</span><input className="input-shell" type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error ? <p className="text-sm text-signal-coral">{error}</p> : null}
        <button className="w-full rounded-2xl bg-signal-cyan px-4 py-3 text-sm font-bold text-ink-950 transition hover:opacity-90 disabled:opacity-60" type="submit" disabled={submitting}>{submitting ? '注册中…' : '注册'}</button>
      </form>
    </AuthCard>
  )
}
