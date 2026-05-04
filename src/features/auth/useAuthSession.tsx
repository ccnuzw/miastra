import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { apiRequest } from '@/shared/http/client'
import { isAppError } from '@/shared/errors/app-error'
import { canAccessAdmin } from './authz'

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
  keepAlive: () => Promise<boolean>
  setUser: (user: AuthUser | null) => void
}

const AuthSessionContext = createContext<AuthSessionValue | null>(null)

async function getCurrentUser() {
  return apiRequest<AuthUser | null>('/api/auth/me')
}

async function logoutRequest() {
  return apiRequest<{ success: true }>('/api/auth/logout', { method: 'POST' })
}

async function keepAliveRequest() {
  return apiRequest<{ success: true; refreshed: boolean }>('/api/auth/session/refresh', { method: 'POST' })
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshPromiseRef = useRef<Promise<AuthUser | null> | null>(null)
  const userRef = useRef<AuthUser | null>(null)

  useEffect(() => {
    userRef.current = user
  }, [user])

  const refresh = useCallback(async () => {
    if (refreshPromiseRef.current) return await refreshPromiseRef.current
    const nextPromise = (async () => {
      try {
        const nextUser = await getCurrentUser()
        setUser(nextUser)
        return nextUser
      } catch (error) {
        if (isAppError(error) && error.status === 401) {
          setUser(null)
          return null
        }
        return userRef.current
      } finally {
        setLoading(false)
      }
    })()
    refreshPromiseRef.current = nextPromise
    try {
      return await nextPromise
    } finally {
      refreshPromiseRef.current = null
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const keepAlive = useCallback(async () => {
    if (!userRef.current) return false
    try {
      const result = await keepAliveRequest()
      return Boolean(result.refreshed)
    } catch (error) {
      if (isAppError(error) && error.status === 401) {
        setUser(null)
      }
      return false
    }
  }, [])

  useEffect(() => {
    if (!user) return

    const timer = window.setInterval(() => {
      void keepAlive()
    }, 30 * 60 * 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [keepAlive, user])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo<AuthSessionValue>(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    canAccessAdmin: canAccessAdmin(user),
    logout,
    refresh,
    keepAlive,
    setUser,
  }), [keepAlive, loading, logout, refresh, user])

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext)
  if (!context) throw new Error('useAuthSession must be used within AuthSessionProvider')
  return context
}
