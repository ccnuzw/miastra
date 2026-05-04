import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { storeRepository } from '../lib/store'
import { createServer } from '../server'
import { ensureDefaultAdminAccount } from './bootstrap'

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
const originalStoreBackend = process.env.SERVER_STORE_BACKEND

beforeEach(async () => {
  await storeRepository.write(structuredClone(emptyStore))
  process.env.NODE_ENV = 'development'
  process.env.SERVER_STORE_BACKEND = 'json'
})

afterEach(async () => {
  await storeRepository.write(structuredClone(emptyStore))

  if (originalNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = originalNodeEnv

  if (originalStoreBackend === undefined) delete process.env.SERVER_STORE_BACKEND
  else process.env.SERVER_STORE_BACKEND = originalStoreBackend
})

describe('ensureDefaultAdminAccount', () => {
  it('recreates the default admin account for local json store', async () => {
    await ensureDefaultAdminAccount()

    const store = await storeRepository.read()
    expect(store.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: 'admin@miastra.local',
          nickname: 'admin',
          role: 'admin',
          status: 'active',
        }),
      ]),
    )

    const app = await createServer()
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'admin',
        password: 'admin123',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      data: {
        email: 'admin@miastra.local',
        nickname: 'admin',
        role: 'admin',
      },
    })
    await app.close()
  })
})
