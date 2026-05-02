import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiRequest } from '@/shared/http/client'

export type AuthUser = {
  id: string
  email: string
  nickname: string
  role: 'user' | 'operator' | 'admin'
  createdAt: string
  updatedAt: string
}

type AuthSessionValue = {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
  canAccessAdmin: boolean
  logout: () => Promise<void>
  refresh: () => Promise<AuthUser | null>
}

const AuthSessionContext = createContext<AuthSessionValue | null>(null)

async function getCurrentUser() {
  return apiRequest<AuthUser | null>('/api/auth/me')
}

async function logoutRequest() {
  return apiRequest<{ success: true }>('/api/auth/logout', { method: 'POST' })
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const nextUser = await getCurrentUser()
      setUser(nextUser)
      return nextUser
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    await logoutRequest()
    setUser(null)
  }, [])

  const value = useMemo<AuthSessionValue>(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    canAccessAdmin: user?.role === 'operator' || user?.role === 'admin',
    logout,
    refresh,
  }), [loading, logout, refresh, user])

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext)
  if (!context) throw new Error('useAuthSession must be used within AuthSessionProvider')
  return context
}
