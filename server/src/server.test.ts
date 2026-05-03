import { describe, expect, it } from 'vitest'
import { createServer } from './server'

describe('createServer', () => {
  it('creates a server with a larger body limit', async () => {
    const app = await createServer()
    expect(app.initialConfig.bodyLimit).toBe(5 * 1024 * 1024)
    await app.close()
  })

  it('keeps protected routes guarded', async () => {
    const app = await createServer()
    const response = await app.inject({ method: 'GET', url: '/api/provider-config' })
    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({ error: { message: '请先登录' } })
    await app.close()
  })
})
