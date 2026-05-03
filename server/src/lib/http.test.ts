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
})
