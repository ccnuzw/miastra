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
  payload: { providerId: string; apiUrl: string; model: string; apiKey: string },
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
  delete process.env.PROVIDER_UPSTREAM_ORIGIN
  vi.restoreAllMocks()
})

afterEach(async () => {
  await resetStore()
  vi.restoreAllMocks()
  if (originalProviderUpstreamOrigin === undefined) delete process.env.PROVIDER_UPSTREAM_ORIGIN
  else process.env.PROVIDER_UPSTREAM_ORIGIN = originalProviderUpstreamOrigin
})

describe('provider proxy routes', () => {
  it('normalizes saved provider api urls', async () => {
    const app = await createServer()
    const cookie = await registerUser(app, 'provider-normalize@example.com')

    const response = await saveProviderConfig(app, cookie, {
      providerId: 'openai',
      apiUrl: 'https://api.openai.com/v1/images/generations',
      model: 'gpt-image-2',
      apiKey: 'secret',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      data: {
        apiUrl: 'https://api.openai.com',
      },
    })
    await app.close()
  })

  it('rejects invalid provider api urls on save', async () => {
    const app = await createServer()
    const cookie = await registerUser(app, 'provider-invalid-url@example.com')

    const response = await saveProviderConfig(app, cookie, {
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
    await app.close()
  })

  it('maps direct provider requests and removes unstable params', async () => {
    const app = await createServer()
    const cookie = await registerUser(app, 'provider-direct@example.com')

    await saveProviderConfig(app, cookie, {
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
    })
    await app.close()
  })

  it('uses PROVIDER_UPSTREAM_ORIGIN for blank or /sub2api style configs', async () => {
    process.env.PROVIDER_UPSTREAM_ORIGIN = 'http://127.0.0.1:19090'
    const app = await createServer()
    const cookie = await registerUser(app, 'provider-sub2api@example.com')

    await saveProviderConfig(app, cookie, {
      providerId: 'sub2api',
      apiUrl: '/sub2api/v1',
      model: 'gpt-image-2',
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
        model: 'gpt-image-2',
        prompt: 'portrait',
        size: '1024x1024',
        quality: 'high',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('http://127.0.0.1:19090/v1/images/generations')
    await app.close()
  })

  it('translates upstream api key errors into structured config errors', async () => {
    const app = await createServer()
    const cookie = await registerUser(app, 'provider-key-error@example.com')

    await saveProviderConfig(app, cookie, {
      providerId: 'openai',
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

  it('translates edit endpoint 404 into compatibility errors', async () => {
    const app = await createServer()
    const cookie = await registerUser(app, 'provider-edit-error@example.com')

    await saveProviderConfig(app, cookie, {
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
        code: 'PROVIDER_COMPATIBILITY_ERROR',
      },
    })
    await app.close()
  })
})
