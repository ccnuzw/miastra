import { Wand2 } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthSession } from '@/features/auth/useAuthSession'

function navLinkClassName(isActive: boolean) {
  return `rounded-full border px-4 py-2 text-sm font-semibold transition ${isActive
    ? 'border-signal-cyan/50 bg-signal-cyan/[0.16] text-signal-cyan'
    : 'border-porcelain-50/10 bg-ink-950/[0.65] text-porcelain-50 hover:border-signal-cyan/50 hover:text-signal-cyan'}`
}

export function AppShell() {
  const navigate = useNavigate()
  const { user, canAccessAdmin, logout } = useAuthSession()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-ink-950 text-porcelain-50">
      <header className="fixed left-0 right-0 top-0 z-[60] border-b border-porcelain-50/10 bg-ink-950/[0.7] backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-screen-xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link to="/app/studio" className="group flex items-center gap-3" aria-label="Miastra Studio 首页">
            <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-signal-cyan/30 bg-signal-cyan/10 shadow-glow">
              <Wand2 className="h-5 w-5 text-signal-cyan transition-transform duration-500 group-hover:rotate-12" />
              <span className="absolute inset-x-2 bottom-1 h-px bg-signal-cyan/50" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-xl tracking-tight text-porcelain-50">Miastra Studio</span>
              <span className="mt-1 text-[0.62rem] uppercase tracking-[0.34em] text-porcelain-100/50">Sub2API Image Lab</span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <span className="status-pill hidden sm:inline-flex">{user?.nickname ?? user?.email}</span>
            <NavLink className={({ isActive }) => navLinkClassName(isActive)} to="/app/studio">工作台</NavLink>
            <NavLink className={({ isActive }) => navLinkClassName(isActive)} to="/app/templates">模板</NavLink>
            <NavLink className={({ isActive }) => navLinkClassName(isActive)} to="/app/works">作品</NavLink>
            <NavLink className={({ isActive }) => navLinkClassName(isActive)} to="/app/tasks">任务</NavLink>
            <NavLink className={({ isActive }) => navLinkClassName(isActive)} to="/app/account">账户</NavLink>
            <NavLink className={({ isActive }) => navLinkClassName(isActive)} to="/app/providers">配置中心</NavLink>
            <NavLink className={({ isActive }) => navLinkClassName(isActive)} to="/app/billing">支付</NavLink>
            {canAccessAdmin ? <NavLink className={({ isActive }) => navLinkClassName(isActive)} to="/app/admin">后台</NavLink> : null}
            <button className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-coral/50 hover:text-signal-coral" onClick={() => void handleLogout()} type="button">退出</button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
