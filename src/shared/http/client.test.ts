import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from './client'

describe('apiRequest', () => {
  it('returns response data', async () => {
    const api = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { hello: 'world' } }),
    } as Response)

    await expect(apiRequest<{ hello: string }>('/api/test')).resolves.toEqual({ hello: 'world' })
    api.mockRestore()
  })

  it('throws response error message', async () => {
    const api = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'nope' } }),
    } as Response)

    await expect(apiRequest('/api/test')).rejects.toThrow('nope')
    api.mockRestore()
  })
})
