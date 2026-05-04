import { createAppError } from '@/shared/errors/app-error'
import { describe, expect, it, vi } from 'vitest'
import { loadWithRetry, shouldRetryProviderConfigLoad } from './provider.loader'

describe('provider.loader', () => {
  it('retries transient unauthorized reads and eventually resolves', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(createAppError({
        code: 'UNAUTHORIZED',
        message: '未登录',
        category: 'auth',
        retryable: false,
        action: 'login',
        status: 401,
      }))
      .mockResolvedValueOnce({ ok: true })

    await expect(loadWithRetry(load, [0])).resolves.toEqual({ ok: true })
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('does not retry invalid input errors', async () => {
    const error = createAppError({
      code: 'INVALID_INPUT',
      message: '参数错误',
      category: 'input',
      retryable: false,
      action: 'none',
      status: 400,
    })
    const load = vi.fn().mockRejectedValue(error)

    await expect(loadWithRetry(load, [0, 0])).rejects.toBe(error)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('treats plain network errors as retryable', () => {
    expect(shouldRetryProviderConfigLoad(new Error('network'))).toBe(true)
  })
})
