import { apiRequest } from '../../shared/http/client'
import { defaultConfig } from './provider.constants'
import type { ProviderConfigPayload } from './provider.types'
import { normalizeProviderConfig } from './provider.utils'

const defaultProviderPolicy: ProviderConfigPayload['providerPolicy'] = {
  allowManagedProviders: true,
  allowCustomProvider: true,
  allowedManagedProviderIds: [],
  allowedModels: [],
}

export async function readStoredConfig(): Promise<ProviderConfigPayload> {
  const stored = await apiRequest<ProviderConfigPayload | null>('/api/provider-config')
  return {
    config: normalizeProviderConfig(stored?.config ?? defaultConfig),
    managedProviders: stored?.managedProviders ?? [],
    providerPolicy: stored?.providerPolicy ?? defaultProviderPolicy,
  }
}

export async function writeStoredConfig(config: ProviderConfigPayload['config']) {
  const saved = await apiRequest<ProviderConfigPayload>('/api/provider-config', {
    method: 'PUT',
    body: config,
  })
  return {
    config: normalizeProviderConfig(saved.config),
    managedProviders: saved.managedProviders ?? [],
    providerPolicy: saved.providerPolicy ?? defaultProviderPolicy,
  }
}
