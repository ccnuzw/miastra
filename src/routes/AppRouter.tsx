import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuthSession } from '@/features/auth/useAuthSession'
import { AppShell } from '@/layouts/AppShell'
import { AuthShell } from '@/layouts/AuthShell'
import { StudioPage } from '@/pages/app/StudioPage'

const LoginPage = lazy(async () => ({ default: (await import('@/pages/auth/LoginPage')).LoginPage }))
const RegisterPage = lazy(async () => ({ default: (await import('@/pages/auth/RegisterPage')).RegisterPage }))
const ForgotPasswordPage = lazy(async () => ({ default: (await import('@/pages/auth/ForgotPasswordPage')).ForgotPasswordPage }))
const TemplatesPage = lazy(async () => ({ default: (await import('@/pages/app/TemplatesPage')).TemplatesPage }))
const WorksPage = lazy(async () => ({ default: (await import('@/pages/app/WorksPage')).WorksPage }))
const TasksPage = lazy(async () => ({ default: (await import('@/pages/app/TasksPage')).TasksPage }))
const AccountPage = lazy(async () => ({ default: (await import('@/pages/app/AccountPage')).AccountPage }))
const ProviderConfigPage = lazy(async () => ({ default: (await import('@/pages/app/ProviderConfigPage')).ProviderConfigPage }))
const BillingPage = lazy(async () => ({ default: (await import('@/pages/app/BillingPage')).BillingPage }))
const AdminPage = lazy(async () => ({ default: (await import('@/pages/app/AdminPage')).AdminPage }))

type RedirectState = {
  from?: {
    pathname: string
    search?: string
    hash?: string
  }
}

function RouteFallback() {
  return <div className="py-16 text-center text-sm text-porcelain-100/60">页面加载中…</div>
}

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>
}

function buildRedirectTo(state: unknown) {
  const from = (state as RedirectState | null)?.from
  if (!from) return '/app/studio'
  return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
}

function RequireLoggedOut() {
  const location = useLocation()
  const { isAuthenticated, loading } = useAuthSession()

  if (loading) return null
  if (isAuthenticated) {
    return <Navigate to={buildRedirectTo(location.state)} replace />
  }

  return <Outlet />
}

function RequireAuth() {
  const location = useLocation()
  const { isAuthenticated, loading } = useAuthSession()

  if (loading) return null
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

function RequireAdmin() {
  const { canAccessAdmin } = useAuthSession()

  if (!canAccessAdmin) return <Navigate to="/app/studio" replace />
  return <Outlet />
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<RequireLoggedOut />}>
        <Route element={<AuthShell />}>
          <Route path="/login" element={<LazyRoute><LoginPage /></LazyRoute>} />
          <Route path="/register" element={<LazyRoute><RegisterPage /></LazyRoute>} />
          <Route path="/forgot-password" element={<LazyRoute><ForgotPasswordPage /></LazyRoute>} />
        </Route>
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/app" element={<AppShell />}>
          <Route path="studio" element={<StudioPage />} />
          <Route path="templates" element={<LazyRoute><TemplatesPage /></LazyRoute>} />
          <Route path="works" element={<LazyRoute><WorksPage /></LazyRoute>} />
          <Route path="tasks" element={<LazyRoute><TasksPage /></LazyRoute>} />
          <Route path="account" element={<LazyRoute><AccountPage /></LazyRoute>} />
          <Route path="providers" element={<LazyRoute><ProviderConfigPage /></LazyRoute>} />
          <Route path="billing" element={<LazyRoute><BillingPage /></LazyRoute>} />
          <Route element={<RequireAdmin />}>
            <Route path="admin" element={<LazyRoute><AdminPage /></LazyRoute>} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/app/studio" replace />} />
    </Routes>
  )
}
