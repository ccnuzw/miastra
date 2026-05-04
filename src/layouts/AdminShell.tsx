import {
  AlertTriangle,
  Boxes,
  LayoutDashboard,
  ScrollText,
  Shield,
  UserCog,
  WandSparkles,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { type AdminPoliciesData, fetchAdminPolicies } from '@/features/admin/admin.api'
import { adminRoleLabels } from '@/features/admin/admin.utils'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'

const adminNavItems = [
  { to: '/app/admin/overview', label: '总览', icon: LayoutDashboard },
  { to: '/app/admin/users', label: '用户管理', icon: UserCog },
  { to: '/app/admin/tasks', label: '任务管理', icon: WandSparkles },
  { to: '/app/admin/works', label: '作品管理', icon: Boxes },
  { to: '/app/admin/providers', label: '公共 Provider', icon: Shield },
  { to: '/app/admin/audit', label: '审计日志', icon: ScrollText },
] as const

function navLinkClassName(isActive: boolean) {
  return `group flex items-center gap-3 rounded-[1.4rem] border px-4 py-3 text-sm font-semibold transition ${
    isActive
      ? 'border-signal-cyan/45 bg-signal-cyan/14 text-signal-cyan shadow-glow'
      : 'border-porcelain-50/10 bg-ink-950/[0.56] text-porcelain-100/70 hover:border-signal-cyan/35 hover:text-porcelain-50'
  }`
}

export function AdminShell() {
  const [policies, setPolicies] = useState<AdminPoliciesData | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void fetchAdminPolicies()
      .then((nextPolicies) => {
        if (cancelled) return
        setPolicies(nextPolicies)
        setError(null)
      })
      .catch((nextError) => {
        if (cancelled) return
        setError(nextError)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="mx-auto w-full max-w-screen-2xl px-4 pb-10 pt-32 md:px-8">
      <section className="panel-shell">
        <div className="flex flex-col gap-6 xl:flex-row">
          <aside className="xl:sticky xl:top-28 xl:w-[280px] xl:self-start">
            <div className="rounded-[2rem] border border-porcelain-50/10 bg-ink-950/[0.56] p-5 shadow-card">
              <p className="eyebrow">Admin Console</p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-porcelain-50">
                后台工作区
              </h1>
              <p className="mt-2 text-sm leading-6 text-porcelain-100/60">
                按管理对象拆分后台流程，管理员可以直接进入对应模块处理事务。
              </p>

              {loading ? (
                <p className="mt-4 text-xs text-porcelain-100/45">正在读取权限边界…</p>
              ) : null}
              {error ? <ErrorNotice error={error} className="mt-4" /> : null}
              {policies ? (
                <div className="mt-4 rounded-[1.4rem] border border-porcelain-50/10 bg-porcelain-50/[0.035] p-4 text-xs leading-6 text-porcelain-100/60">
                  <p>当前角色：{adminRoleLabels[policies.actorRole]}。</p>
                  <p>
                    {policies.operatorScope === 'users-only'
                      ? '仅可管理普通用户。'
                      : '可管理全部后台账号。'}
                  </p>
                  <p>账号安全与个人会话已保留在账户页处理。</p>
                </div>
              ) : null}

              <nav className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {adminNavItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => navLinkClassName(isActive)}
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-2xl border border-current/15 bg-current/10">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </nav>

              <div className="mt-5 rounded-[1.4rem] border border-amber-400/20 bg-amber-400/10 p-4 text-xs leading-6 text-amber-100/80">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-semibold">操作边界</span>
                </div>
                <p className="mt-2">高风险操作集中放在各自页面内，避免在首页混合展示和误操作。</p>
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <Outlet />
          </div>
        </div>
      </section>
    </main>
  )
}
