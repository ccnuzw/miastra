export type ProviderMode = 'managed' | 'custom'

export type ManagedProviderOption = {
  id: string
  name: string
  description?: string
  models: string[]
  defaultModel: string
}

export type ProviderConfig = {
  mode: ProviderMode
  providerId: string
  managedProviderId: string
  apiUrl: string
  model: string
  apiKey: string
}

export type ProviderPolicy = {
  allowManagedProviders: boolean
  allowCustomProvider: boolean
  allowedManagedProviderIds: string[]
  allowedModels: string[]
}

export type ProviderConfigPayload = {
  config: ProviderConfig
  managedProviders: ManagedProviderOption[]
  providerPolicy: ProviderPolicy
}
