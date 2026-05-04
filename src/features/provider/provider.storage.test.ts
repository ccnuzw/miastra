import { afterEach, describe, expect, it, vi } from 'vitest'
import { readStoredConfig, writeStoredConfig } from './provider.storage'

describe('provider.storage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads config from api', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          config: {
            mode: 'managed',
            providerId: 'openai-main',
            managedProviderId: 'openai-main',
            apiUrl: '',
            model: 'gpt-image-2',
            apiKey: '',
          },
          managedProviders: [
            { id: 'openai-main', name: 'OpenAI Main', models: ['gpt-image-2'], defaultModel: 'gpt-image-2' },
          ],
        },
      }),
    } as Response)

    await expect(readStoredConfig()).resolves.toEqual({
      config: {
        mode: 'managed',
        providerId: 'openai-main',
        managedProviderId: 'openai-main',
        apiUrl: '',
        model: 'gpt-image-2',
        apiKey: '',
      },
      managedProviders: [
        { id: 'openai-main', name: 'OpenAI Main', models: ['gpt-image-2'], defaultModel: 'gpt-image-2' },
      ],
      providerPolicy: {
        allowManagedProviders: true,
        allowCustomProvider: true,
        allowedManagedProviderIds: [],
        allowedModels: [],
      },
    })
  })

  it('writes config through api', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          config: {
            mode: 'custom',
            providerId: 'custom',
            managedProviderId: '',
            apiUrl: 'https://api.openai.com/v1/images/generations',
            model: 'gpt-image-2',
            apiKey: 'secret',
          },
          managedProviders: [],
        },
      }),
    } as Response)

    await expect(writeStoredConfig({
      mode: 'custom',
      providerId: 'custom',
      managedProviderId: '',
      apiUrl: 'https://api.openai.com/v1/images/generations',
      model: 'gpt-image-2',
      apiKey: 'secret',
    })).resolves.toEqual({
      config: {
        mode: 'custom',
        providerId: 'custom',
        managedProviderId: '',
        apiUrl: 'https://api.openai.com',
        model: 'gpt-image-2',
        apiKey: 'secret',
      },
      managedProviders: [],
      providerPolicy: {
        allowManagedProviders: true,
        allowCustomProvider: true,
        allowedManagedProviderIds: [],
        allowedModels: [],
      },
    })
  })
})
