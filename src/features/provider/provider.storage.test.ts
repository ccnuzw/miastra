import { describe, expect, it, vi } from 'vitest'
import { readStoredConfig, writeStoredConfig } from './provider.storage'

describe('provider.storage', () => {
  it('reads config from api', async () => {
    const api = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { providerId: 'sub2api', apiUrl: '', model: 'gpt-image-2', apiKey: '' } }),
    } as Response)

    await expect(readStoredConfig()).resolves.toEqual({ providerId: 'sub2api', apiUrl: '', model: 'gpt-image-2', apiKey: '' })
    api.mockRestore()
  })

  it('writes config through api', async () => {
    const api = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { providerId: 'sub2api', apiUrl: '', model: 'gpt-image-2', apiKey: 'secret' } }),
    } as Response)

    await expect(writeStoredConfig({ providerId: 'sub2api', apiUrl: '', model: 'gpt-image-2', apiKey: 'secret' })).resolves.toEqual({ providerId: 'sub2api', apiUrl: '', model: 'gpt-image-2', apiKey: 'secret' })
    api.mockRestore()
  })
})
