import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

const originalProviderUpstreamOrigin = process.env.PROVIDER_UPSTREAM_ORIGIN

async function resetStore() {
  await storeRepository.write(structuredClone(emptyStore))
}

async function registerUser(app: Awaited<ReturnType<typeof createServer>>, email: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email,
      password: 'secret123',
      nickname: 'provider-user',
    },
  })

  expect(response.statusCode).toBe(200)
  return String(response.headers['set-cookie'] ?? '')
}

async function saveProviderConfig(
  app: Awaited<ReturnType<typeof createServer>>,
  cookie: string,
  payload: {
    mode: 'managed' | 'custom'
    providerId?: string
    managedProviderId?: string
    apiUrl: string
    model: string
    apiKey: string
  },
) {
  return await app.inject({
    method: 'PUT',
    url: '/api/provider-config',
    headers: { cookie },
    payload,
  })
}

beforeEach(async () => {
  await resetStore()
  vi.restoreAllMocks()
  if (originalProviderUpstreamOrigin === undefined) delete process.env.PROVIDER_UPSTREAM_ORIGIN
  else process.env.PROVIDER_UPSTREAM_ORIGIN = originalProviderUpstreamOrigin
})

afterEach(async () => {
  await resetStore()
  vi.restoreAllMocks()
  if (originalProviderUpstreamOrigin === undefined) delete process.env.PROVIDER_UPSTREAM_ORIGIN
  else process.env.PROVIDER_UPSTREAM_ORIGIN = originalProviderUpstreamOrigin
})

describe('provider proxy routes', () => {
  it('normalizes saved custom provider config', async () => {
    const app = await createServer()
    const cookie = await registerUser(app, 'provider-normalize@example.com')

    const response = await saveProviderConfig(app, cookie, {
      mode: 'custom',
      providerId: 'custom',
      apiUrl: 'https://api.openai.com/v1/images/generations',
      model: 'gpt-image-2',
      apiKey: 'secret',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      data: {
        config: {
          mode: 'custom',
          providerId: 'custom',
          apiUrl: 'https://api.openai.com',
          model: 'gpt-image-2',
          apiKey: 'secret',
        },
      },
    })
    await app.close()
  })

  it('returns public managed providers without exposing secrets', async () => {
    const store = await storeRepository.read()
    store.managedProviders.push({
      id: 'openai-main',
      name: 'OpenAI Main',
      description: '公共图像服务',
      apiUrl: 'https://api.openai.com/v1',
      apiKey: 'secret-key',
      models: ['gpt-image-2'],
      defaultModel: 'gpt-image-2',
      enabled: true,
      updatedAt: new Date().toISOString(),
    })
    await storeRepository.write(store)

    const app = await createServer()
    const cookie = await registerUser(app, 'provider-public-list@example.com')
    const response = await app.inject({
      method: 'GET',
      url: '/api/provider-config',
      headers: { cookie },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      data: {
        managedProviders: [
          {
            id: 'openai-main',
            name: 'OpenAI Main',
            models: ['gpt-image-2'],
            defaultModel: 'gpt-image-2',
          },
        ],
      },
    })
    expect(JSON.stringify(response.json())).not.toContain('secret-key')
    expect(JSON.stringify(response.json())).not.toContain('https://api.openai.com/v1')
    await app.close()
  })

  it('rejects invalid provider api urls on save', async () => {
    const app = await createServer()
    const cookie = await registerUser(app, 'provider-invalid-url@example.com')

    const response = await saveProviderConfig(app, cookie, {
      mode: 'custom',
      providerId: 'custom',
      apiUrl: 'ftp://example.com/provider',
      model: 'flux-1-dev',
      apiKey: 'secret',
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      error: {
        code: 'PROVIDER_URL_INVALID',
      },
    })

    const pathResponse = await saveProviderConfig(app, cookie, {
      mode: 'custom',
      providerId: 'custom',
      apiUrl: '/sub2api/v1',
      model: 'flux-1-dev',
      apiKey: 'secret',
    })

    expect(pathResponse.statusCode).toBe(400)
    expect(pathResponse.json()).toMatchObject({
      error: {
        code: 'PROVIDER_URL_INVALID',
      },
    })
    await app.close()
  })

  it('uses admin-managed provider credentials without exposing them to users', async () => {
    const store = await storeRepository.read()
    store.managedProviders.push({
      id: 'managed-openai',
      name: 'Managed OpenAI',
      description: 'admin secret',
      apiUrl: 'https://managed.example.com/v1',
      apiKey: 'managed-secret',
      models: ['gpt-image-2'],
      defaultModel: 'gpt-image-2',
      enabled: true,
      updatedAt: new Date().toISOString(),
    })
    await storeRepository.write(store)

    const app = await createServer()
    const cookie = await registerUser(app, 'provider-managed@example.com')
    await saveProviderConfig(app, cookie, {
      mode: 'managed',
      managedProviderId: 'managed-openai',
      providerId: 'managed-openai',
      apiUrl: '',
      model: 'gpt-image-2',
      apiKey: '',
    })

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      data: [{ url: 'https://cdn.example.com/output.png' }],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))

    const response = await app.inject({
      method: 'POST',
      url: '/api/provider-proxy/v1/images/generations',
      headers: {
        cookie,
        'content-type': 'application/json',
        'x-miastra-charge-quota': '0',
      },
      payload: {
        model: 'gpt-image-2',
        prompt: 'portrait',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://managed.example.com/v1/images/generations')
    const headers = fetchSpy.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.get('authorization')).toBe('Bearer managed-secret')
    await app.close()
  })

  it('forwards custom provider requests without stripping payload fields', async () => {
    const app = await createServer()
    const cookie = await registerUser(app, 'provider-direct@example.com')

    await saveProviderConfig(app, cookie, {
      mode: 'custom',
      providerId: 'custom',
      apiUrl: 'https://image.example.com/v1',
      model: 'flux-1-dev',
      apiKey: 'secret',
    })

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      data: [{ url: 'https://cdn.example.com/output.png' }],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))

    const response = await app.inject({
      method: 'POST',
      url: '/api/provider-proxy/v1/images/generations',
      headers: {
        cookie,
        'content-type': 'application/json',
        'x-miastra-charge-quota': '0',
      },
      payload: {
        model: 'flux-1-dev',
        prompt: 'portrait',
        size: '1024x1024',
        quality: 'high',
        n: 1,
        stream: false,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://image.example.com/v1/images/generations')
    expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))).toEqual({
      model: 'flux-1-dev',
      prompt: 'portrait',
      size: '1024x1024',
      quality: 'high',
      n: 1,
      stream: false,
    })
    await app.close()
  })

  it('allows blank custom provider api urls and falls back to the server upstream origin', async () => {
    const app = await createServer()
    const cookie = await registerUser(app, 'provider-default-upstream@example.com')
    process.env.PROVIDER_UPSTREAM_ORIGIN = 'https://default-upstream.example.com/v1'

    const response = await saveProviderConfig(app, cookie, {
      mode: 'custom',
      providerId: 'custom',
      apiUrl: '',
      model: 'gpt-image-2',
      apiKey: 'secret',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      data: {
        config: {
          providerId: 'custom',
          apiUrl: '',
        },
      },
    })

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      data: [{ url: 'https://cdn.example.com/output.png' }],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))

    const proxyResponse = await app.inject({
      method: 'POST',
      url: '/api/provider-proxy/v1/images/generations',
      headers: {
        cookie,
        'content-type': 'application/json',
        'x-miastra-charge-quota': '0',
      },
      payload: {
        model: 'gpt-image-2',
        prompt: 'portrait',
      },
    })

    expect(proxyResponse.statusCode).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://default-upstream.example.com/v1/images/generations')
    await app.close()
  })

  it('translates upstream api key errors into structured config errors', async () => {
    const app = await createServer()
    const cookie = await registerUser(app, 'provider-key-error@example.com')

    await saveProviderConfig(app, cookie, {
      mode: 'custom',
      providerId: 'custom',
      apiUrl: 'https://api.openai.com/v1',
      model: 'gpt-image-2',
      apiKey: 'bad-key',
    })

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      error: { message: 'Incorrect API key provided' },
    }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    }))

    const response = await app.inject({
      method: 'POST',
      url: '/api/provider-proxy/v1/images/generations',
      headers: {
        cookie,
        'content-type': 'application/json',
        'x-miastra-charge-quota': '0',
      },
      payload: {
        model: 'gpt-image-2',
        prompt: 'portrait',
      },
    })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({
      error: {
        code: 'PROVIDER_API_KEY_INVALID',
      },
    })
    await app.close()
  })

  it('translates edit endpoint 404 into unsupported errors', async () => {
    const app = await createServer()
    const cookie = await registerUser(app, 'provider-edit-error@example.com')

    await saveProviderConfig(app, cookie, {
      mode: 'custom',
      providerId: 'custom',
      apiUrl: 'https://image.example.com/v1',
      model: 'flux-1-dev',
      apiKey: 'secret',
    })

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Not found', {
      status: 404,
      headers: { 'content-type': 'text/plain' },
    }))

    const response = await app.inject({
      method: 'POST',
      url: '/api/provider-proxy/v1/images/edits',
      headers: {
        cookie,
        'content-type': 'application/json',
        'x-miastra-charge-quota': '0',
      },
      payload: {
        model: 'flux-1-dev',
        prompt: 'portrait',
      },
    })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({
      error: {
        code: 'PROVIDER_UNSUPPORTED',
      },
    })
    await app.close()
  })
})
