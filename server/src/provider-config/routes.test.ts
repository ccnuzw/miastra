import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DataStore } from '../auth/types'
import { storeRepository } from '../lib/store'
import { createServer } from '../server'

const emptyStore: DataStore = {
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

async function resetStore() {
  await storeRepository.write(structuredClone(emptyStore))
}

async function registerUser(app: Awaited<ReturnType<typeof createServer>>, email: string, nickname: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email,
      password: 'secret123',
      nickname,
    },
  })

  expect(response.statusCode).toBe(200)
  const cookie = response.cookies.find((item) => item.name === 'miastra_auth')?.value ?? ''
  return cookie ? `miastra_auth=${cookie}` : ''
}

async function loginUser(app: Awaited<ReturnType<typeof createServer>>, identifier: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      email: identifier,
      password: 'secret123',
    },
  })

  expect(response.statusCode).toBe(200)
  const cookie = response.cookies.find((item) => item.name === 'miastra_auth')?.value ?? ''
  return cookie ? `miastra_auth=${cookie}` : ''
}

describe('provider config routes', () => {
  beforeEach(async () => {
    await resetStore()
  })

  afterEach(async () => {
    await resetStore()
  })

  it('keeps a managed provider selection after logout and login', async () => {
    const store = await storeRepository.read()
    store.managedProviders.push({
      id: 'openai-main',
      name: 'OpenAI Main',
      description: '公共 OpenAI',
      apiUrl: 'https://api.openai.com',
      apiKey: 'managed-secret',
      models: ['gpt-image-2'],
      defaultModel: 'gpt-image-2',
      enabled: true,
      updatedAt: new Date().toISOString(),
    })
    await storeRepository.write(store)

    const app = await createServer()
    const initialCookie = await registerUser(app, 'managed-persist@example.com', 'managed-user')

    const saveResponse = await app.inject({
      method: 'PUT',
      url: '/api/provider-config',
      headers: { cookie: initialCookie },
      payload: {
        mode: 'managed',
        providerId: 'openai-main',
        managedProviderId: 'openai-main',
        apiUrl: '',
        model: 'gpt-image-2',
        apiKey: '',
      },
    })

    expect(saveResponse.statusCode).toBe(200)

    const logoutResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: initialCookie },
    })
    expect(logoutResponse.statusCode).toBe(200)

    const loginCookie = await loginUser(app, 'managed-persist@example.com')
    const reloadResponse = await app.inject({
      method: 'GET',
      url: '/api/provider-config',
      headers: { cookie: loginCookie },
    })

    expect(reloadResponse.statusCode).toBe(200)
    expect(reloadResponse.json()).toMatchObject({
      data: {
        config: {
          mode: 'managed',
          providerId: 'openai-main',
          managedProviderId: 'openai-main',
          model: 'gpt-image-2',
        },
        providerPolicy: {
          allowManagedProviders: true,
          allowCustomProvider: true,
        },
      },
    })

    await app.close()
  })

  it('keeps a custom provider config after logout and login', async () => {
    const app = await createServer()
    const initialCookie = await registerUser(app, 'custom-persist@example.com', 'custom-user')

    const saveResponse = await app.inject({
      method: 'PUT',
      url: '/api/provider-config',
      headers: { cookie: initialCookie },
      payload: {
        mode: 'custom',
        providerId: 'custom',
        managedProviderId: '',
        apiUrl: 'https://api.openai.com/v1/images/generations',
        model: 'gpt-image-2',
        apiKey: 'custom-secret',
      },
    })

    expect(saveResponse.statusCode).toBe(200)

    const logoutResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: initialCookie },
    })
    expect(logoutResponse.statusCode).toBe(200)

    const loginCookie = await loginUser(app, 'custom-persist@example.com')
    const reloadResponse = await app.inject({
      method: 'GET',
      url: '/api/provider-config',
      headers: { cookie: loginCookie },
    })

    expect(reloadResponse.statusCode).toBe(200)
    expect(reloadResponse.json()).toMatchObject({
      data: {
        config: {
          mode: 'custom',
          providerId: 'custom',
          apiUrl: 'https://api.openai.com',
          model: 'gpt-image-2',
          apiKey: 'custom-secret',
        },
        providerPolicy: {
          allowManagedProviders: true,
          allowCustomProvider: true,
        },
      },
    })

    await app.close()
  })

  it('filters managed providers and blocks disallowed custom mode by user policy', async () => {
    const store = await storeRepository.read()
    store.managedProviders.push(
      {
        id: 'openai-main',
        name: 'OpenAI Main',
        description: '公共 OpenAI',
        apiUrl: 'https://api.openai.com',
        apiKey: 'managed-secret',
        models: ['gpt-image-2', 'flux-kontext-pro'],
        defaultModel: 'gpt-image-2',
        enabled: true,
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'other-main',
        name: 'Other Main',
        description: '其他 Provider',
        apiUrl: 'https://example.com',
        apiKey: 'other-secret',
        models: ['gpt-image-2'],
        defaultModel: 'gpt-image-2',
        enabled: true,
        updatedAt: new Date().toISOString(),
      },
    )
    await storeRepository.write(store)

    const app = await createServer()
    const cookie = await registerUser(app, 'policy-user@example.com', 'policy-user')
    const nextStore = await storeRepository.read()
    const user = nextStore.users.find((item) => item.email === 'policy-user@example.com')
    expect(user).toBeTruthy()
    if (!user) throw new Error('user not found')

    user.allowCustomProvider = false
    user.allowedManagedProviderIds = ['openai-main']
    user.allowedModels = ['gpt-image-2']
    user.updatedAt = new Date().toISOString()
    await storeRepository.write(nextStore)

    const getResponse = await app.inject({
      method: 'GET',
      url: '/api/provider-config',
      headers: { cookie: cookie },
    })

    expect(getResponse.statusCode).toBe(200)
    expect(getResponse.json()).toMatchObject({
      data: {
        managedProviders: [
          {
            id: 'openai-main',
            models: ['gpt-image-2'],
          },
        ],
        providerPolicy: {
          allowManagedProviders: true,
          allowCustomProvider: false,
          allowedManagedProviderIds: ['openai-main'],
          allowedModels: ['gpt-image-2'],
        },
      },
    })

    const customSaveResponse = await app.inject({
      method: 'PUT',
      url: '/api/provider-config',
      headers: { cookie: cookie },
      payload: {
        mode: 'custom',
        providerId: 'custom',
        managedProviderId: '',
        apiUrl: 'https://api.openai.com',
        model: 'gpt-image-2',
        apiKey: 'custom-secret',
      },
    })

    expect(customSaveResponse.statusCode).toBe(403)
    expect(customSaveResponse.json()).toMatchObject({
      error: {
        code: 'FORBIDDEN',
      },
    })

    await app.close()
  })
})
