// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createServer } from './server'
import { storeRepository } from './lib/store'

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

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  SERVER_STORE_BACKEND: process.env.SERVER_STORE_BACKEND,
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET,
  RESET_JWT_SECRET: process.env.RESET_JWT_SECRET,
  PROVIDER_UPSTREAM_ORIGIN: process.env.PROVIDER_UPSTREAM_ORIGIN,
}

beforeEach(async () => {
  await storeRepository.write(structuredClone(emptyStore))
  process.env.NODE_ENV = 'test'
  process.env.SERVER_STORE_BACKEND = 'json'
  process.env.AUTH_JWT_SECRET = 'test-auth-secret'
  process.env.RESET_JWT_SECRET = 'test-reset-secret'
  process.env.PROVIDER_UPSTREAM_ORIGIN = 'https://upstream.example.com'
  delete process.env.DATABASE_URL
})

afterEach(async () => {
  await storeRepository.write(structuredClone(emptyStore))

  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key as keyof NodeJS.ProcessEnv]
    else process.env[key as keyof NodeJS.ProcessEnv] = value
  }
})

describe('runtime checks', () => {
  it('exposes health and readiness details', async () => {
    const app = await createServer()

    const healthResponse = await app.inject({ method: 'GET', url: '/health' })
    expect(healthResponse.statusCode).toBe(200)
    expect(healthResponse.json()).toMatchObject({
      data: {
        status: 'ok',
        runtimeMode: 'test',
      },
    })

    const readyResponse = await app.inject({ method: 'GET', url: '/ready' })
    expect(readyResponse.statusCode).toBe(200)
    expect(readyResponse.json()).toMatchObject({
      data: {
        ready: true,
        status: 'ok',
        runtimeMode: 'test',
      },
    })

    const storeResponse = await app.inject({ method: 'GET', url: '/health/store' })
    expect(storeResponse.statusCode).toBe(200)
    expect(storeResponse.json()).toMatchObject({
      data: {
        status: 'ok',
        backend: 'json',
        counts: {
          users: 0,
          sessions: 0,
          works: 0,
        },
      },
    })

    await app.close()
  })

  it('allows startup without auth secrets in non-production environments', async () => {
    delete process.env.AUTH_JWT_SECRET
    delete process.env.RESET_JWT_SECRET

    const app = await createServer()

    const healthResponse = await app.inject({ method: 'GET', url: '/health' })
    expect(healthResponse.statusCode).toBe(200)
    expect(healthResponse.json()).toMatchObject({
      data: {
        status: 'ok',
        checks: expect.arrayContaining([
          expect.objectContaining({
            id: 'auth-secret',
            status: 'degraded',
          }),
        ]),
      },
    })

    const readyResponse = await app.inject({ method: 'GET', url: '/ready' })
    expect(readyResponse.statusCode).toBe(200)
    expect(readyResponse.json()).toMatchObject({
      data: {
        ready: true,
        status: 'ok',
      },
    })

    await app.close()
  })

  it('fails fast on invalid store backend configuration', async () => {
    process.env.SERVER_STORE_BACKEND = 'invalid-backend'

    const app = await createServer()
    const healthResponse = await app.inject({ method: 'GET', url: '/health' })
    expect(healthResponse.statusCode).toBe(200)
    expect(healthResponse.json()).toMatchObject({
      data: {
        status: 'fail',
        checks: expect.arrayContaining([
          expect.objectContaining({
            id: 'store-backend',
            status: 'fail',
          }),
        ]),
      },
    })

    const readyResponse = await app.inject({ method: 'GET', url: '/ready' })
    expect(readyResponse.statusCode).toBe(503)
    expect(readyResponse.json()).toMatchObject({
      data: {
        ready: false,
        status: 'fail',
      },
    })

    await app.close()
  })
})
