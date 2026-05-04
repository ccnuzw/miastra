import { describe, expect, it } from 'vitest'
import { ok, fail } from './http'

describe('http helpers', () => {
  it('wraps data payload', () => {
    expect(ok({ hello: 'world' })).toEqual({ data: { hello: 'world' } })
  })

  it('wraps error payload', () => {
    expect(fail('ERR', 'boom')).toEqual({
      error: {
        code: 'ERR',
        message: 'boom',
        category: 'service',
        retryable: false,
        action: 'contact-support',
      },
    })
  })

  it('normalizes known error messages', () => {
    expect(fail('UNAUTHORIZED', '请先登录')).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: '登录状态已失效，请重新登录后继续。',
        category: 'auth',
        retryable: false,
        action: 'login',
      },
    })
  })
})
