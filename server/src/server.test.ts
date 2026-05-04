import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { storeRepository } from './lib/store'
import { createServer } from './server'

const emptyStore = {
  users: [],
  sessions: [],
  promptTemplates: [],
  works: [],
  providerConfigs: [],
  managedProviders: [],
  drawBatches: [],
  generationTasks: [],
  auditLogs: [],
  quotaProfiles: [],
  billingInvoices: [],
}

const originalNodeEnv = process.env.NODE_ENV
const originalBillingMode = process.env.BILLING_MODE

beforeEach(async () => {
  await storeRepository.write(structuredClone(emptyStore))
  delete process.env.BILLING_MODE
  process.env.NODE_ENV = 'test'
})

afterEach(async () => {
  await storeRepository.write(structuredClone(emptyStore))

  if (originalNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = originalNodeEnv

  if (originalBillingMode === undefined) delete process.env.BILLING_MODE
  else process.env.BILLING_MODE = originalBillingMode
})

describe('createServer', () => {
  it('creates a server with a larger body limit', async () => {
    const app = await createServer()
    expect(app.initialConfig.bodyLimit).toBe(20 * 1024 * 1024)
    await app.close()
  })

  it('keeps protected routes guarded', async () => {
    const app = await createServer()
    const response = await app.inject({ method: 'GET', url: '/api/provider-config' })
    expect(response.statusCode).toBe(401)
    expect(response.headers['x-request-id']).toBeTruthy()
    expect(response.json()).toMatchObject({ error: { code: 'UNAUTHORIZED' } })
    await app.close()
  })

  it('allows login with the first admin username', async () => {
    const app = await createServer()
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'admin@example.com',
        password: 'admin123',
        nickname: 'admin',
      },
    })

    expect(registerResponse.statusCode).toBe(200)

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'admin',
        password: 'admin123',
      },
    })

    expect(loginResponse.statusCode).toBe(200)
    expect(loginResponse.json()).toMatchObject({
      data: {
        email: 'admin@example.com',
        nickname: 'admin',
      },
    })
    await app.close()
  })

  it('never exposes reset tokens from forgot-password responses', async () => {
    process.env.NODE_ENV = 'production'
    process.env.AUTH_JWT_SECRET = 'test-auth-secret'
    process.env.RESET_JWT_SECRET = 'test-reset-secret'

    const app = await createServer()
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'prod@example.com',
        password: 'secret123',
        nickname: 'prod-user',
      },
    })

    expect(registerResponse.statusCode).toBe(200)

    const forgotResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'prod@example.com' },
    })

    expect(forgotResponse.statusCode).toBe(200)
    expect(forgotResponse.json()).toEqual({ data: { success: true } })
    await app.close()
  })

  it('disables billing checkout by default in production', async () => {
    process.env.NODE_ENV = 'production'
    process.env.BILLING_MODE = 'mock'
    process.env.AUTH_JWT_SECRET = 'test-auth-secret'
    process.env.RESET_JWT_SECRET = 'test-reset-secret'

    const app = await createServer()
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'billing@example.com',
        password: 'secret123',
        nickname: 'billing-user',
      },
    })

    expect(registerResponse.statusCode).toBe(200)
    const cookie = registerResponse.cookies.find((item) => item.name === 'miastra_auth')
    expect(cookie?.value).toBeTruthy()

    const configResponse = await app.inject({ method: 'GET', url: '/api/billing/config' })
    expect(configResponse.statusCode).toBe(200)
    expect(configResponse.json()).toMatchObject({
      data: {
        mode: 'disabled',
        checkoutEnabled: false,
      },
    })

    const checkoutResponse = await app.inject({
      method: 'POST',
      url: '/api/billing/checkout',
      cookies: cookie ? { miastra_auth: cookie.value } : undefined,
      payload: {
        planId: 'pro',
        mode: 'upgrade',
      },
    })

    expect(checkoutResponse.statusCode).toBe(503)
    expect(checkoutResponse.json()).toMatchObject({
      error: {
        code: 'BILLING_CHECKOUT_UNAVAILABLE',
      },
    })
    await app.close()
  })
})
