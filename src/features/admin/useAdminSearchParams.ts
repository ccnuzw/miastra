import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useAdminSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const updateSearchParams = useCallback(
    (updates: Record<string, string | undefined | null>) => {
      const nextParams = new URLSearchParams(searchParams)
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          nextParams.delete(key)
          return
        }
        nextParams.set(key, value)
      })
      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  return {
    searchParams,
    updateSearchParams,
  }
}
