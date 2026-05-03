import { apiRequest } from '../../shared/http/client'
import { defaultConfig } from './provider.constants'
import type { ProviderConfig } from './provider.types'

export async function readStoredConfig(): Promise<ProviderConfig> {
  const stored = await apiRequest<ProviderConfig | null>('/api/provider-config')
  return stored ?? defaultConfig
}

export async function writeStoredConfig(config: ProviderConfig) {
  return await apiRequest<ProviderConfig>('/api/provider-config', {
    method: 'PUT',
    body: config,
  })
}
