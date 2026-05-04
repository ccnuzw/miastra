import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthCard } from '@/features/auth/AuthCard'
import { login } from '@/features/auth/auth.api'
import { useAuthSession } from '@/features/auth/useAuthSession'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'

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

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setUser } = useAuthSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const redirectTo = buildRedirectTo(location.state)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const nextUser = await login({ email, password })
      setUser(nextUser)
      navigate(redirectTo, { replace: true })
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="登录" subtitle="使用你的账号进入 Miastra。" footer={<span>没有账号？ <Link className="text-signal-cyan" to="/register">去注册</Link></span>}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="field-block"><span className="field-label">账号或邮箱</span><input className="input-shell" type="text" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="field-block"><span className="field-label">密码</span><input className="input-shell" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <div className="flex justify-end text-sm"><Link className="text-porcelain-100/60 hover:text-signal-cyan" to="/forgot-password">忘记密码？</Link></div>
        {error ? <ErrorNotice error={error} compact /> : null}
        <button className="w-full rounded-2xl bg-signal-cyan px-4 py-3 text-sm font-bold text-ink-950" type="submit" disabled={loading}>{loading ? '登录中…' : '登录'}</button>
      </form>
    </AuthCard>
  )
}
