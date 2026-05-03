// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { signAuthToken, signResetToken, verifyAuthToken, verifyResetToken } from './token'

describe('auth token helpers', () => {
  it('signs and verifies auth token', async () => {
    const token = await signAuthToken({ userId: 'u1', sessionId: 's1' })
    const payload = await verifyAuthToken(token)
    expect(payload.userId).toBe('u1')
    expect(payload.sessionId).toBe('s1')
  })

  it('signs and verifies reset token', async () => {
    const token = await signResetToken({ userId: 'u1' })
    const payload = await verifyResetToken(token)
    expect(payload.userId).toBe('u1')
  })
})
