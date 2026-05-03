import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from './client'
import { isAppError } from '@/shared/errors/app-error'

describe('apiRequest', () => {
  it('returns response data', async () => {
    const api = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { hello: 'world' } }),
    } as Response)

    await expect(apiRequest<{ hello: string }>('/api/test')).resolves.toEqual({ hello: 'world' })
    api.mockRestore()
  })

  it('returns null payloads as null', async () => {
    const api = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: null }),
    } as Response)

    await expect(apiRequest<null>('/api/test')).resolves.toBeNull()
    api.mockRestore()
  })

  it('throws response error message', async () => {
    const api = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 'UNAUTHORIZED', message: 'nope' } }),
    } as Response)

    await expect(apiRequest('/api/test')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'nope',
      action: 'login',
    })
    api.mockRestore()
  })

  it('wraps transport failures into app errors', async () => {
    const api = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'))

    try {
      await apiRequest('/api/test')
    } catch (error) {
      expect(isAppError(error)).toBe(true)
      expect(error).toMatchObject({
        code: 'NETWORK_ERROR',
        retryable: true,
      })
    }

    api.mockRestore()
  })
})
