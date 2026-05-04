import type { ProviderConfig } from './provider.types'

export const providerConnectionLabel = '云端接入'

export const defaultConfig: ProviderConfig = {
  mode: 'custom',
  providerId: 'custom',
  managedProviderId: '',
  apiUrl: '',
  model: 'gpt-image-2',
  apiKey: '',
}
