import type { DataStore, StoredManagedProvider, StoredProviderConfig } from '../auth/types'
import { normalizeProviderApiUrlInput, resolveProviderBaseUrl, validateProviderApiUrl } from './provider.utils'

export type PublicManagedProviderSummary = {
  id: string
  name: string
  description?: string
  models: string[]
  defaultModel: string
}

export type ResolvedProviderRuntimeConfig = {
  source: 'managed' | 'custom'
  providerId: string
  managedProviderId?: string
  apiUrl: string
  model: string
  apiKey: string
  exposeApiUrl: boolean
}

type ProviderValidationError = {
  code: string
  message: string
}

type UserProviderConfigLike = {
  userId: string
  updatedAt: string
  mode?: string
  providerId?: string
  managedProviderId?: string
  apiUrl: string
  model: string
  apiKey?: string
}

export function createDefaultProviderConfig(userId = ''): StoredProviderConfig {
  return {
    userId,
    mode: 'custom',
    providerId: 'custom',
    managedProviderId: undefined,
    apiUrl: '',
    model: 'gpt-image-2',
    apiKey: '',
    updatedAt: new Date(0).toISOString(),
  }
}

export function normalizeManagedProviderModels(input: string[] | undefined, fallbackModel: string) {
  const models = Array.from(new Set((input ?? [])
    .map((item) => item.trim())
    .filter(Boolean)))
  if (models.length) return models
  return fallbackModel.trim() ? [fallbackModel.trim()] : []
}

export function normalizeManagedProvider(provider: StoredManagedProvider): StoredManagedProvider {
  const defaultModel = provider.defaultModel.trim()
  const models = normalizeManagedProviderModels(provider.models, defaultModel)
  return {
    ...provider,
    id: provider.id.trim(),
    name: provider.name.trim(),
    description: provider.description?.trim() || undefined,
    apiUrl: normalizeProviderApiUrlInput(provider.apiUrl),
    apiKey: provider.apiKey.trim(),
    models,
    defaultModel: models.includes(defaultModel) ? defaultModel : (models[0] ?? defaultModel),
    enabled: provider.enabled !== false,
  }
}

export function normalizeUserProviderConfigInput(config: UserProviderConfigLike): StoredProviderConfig {
  const mode = config.mode === 'managed' ? 'managed' : 'custom'
  const managedProviderId = mode === 'managed'
    ? (config.managedProviderId?.trim() || config.providerId?.trim() || '')
    : ''

  return {
    userId: config.userId,
    updatedAt: config.updatedAt,
    mode,
    providerId: mode === 'managed' ? managedProviderId : 'custom',
    managedProviderId: managedProviderId || undefined,
    apiUrl: mode === 'custom' ? normalizeProviderApiUrlInput(config.apiUrl) : '',
    model: config.model.trim(),
    apiKey: mode === 'custom' ? (config.apiKey?.trim() ?? '') : '',
  }
}

export function getEnabledManagedProviders(store: Pick<DataStore, 'managedProviders'>) {
  return store.managedProviders
    .map(normalizeManagedProvider)
    .filter((item) => item.enabled)
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
}

export function toPublicManagedProviderSummary(provider: StoredManagedProvider): PublicManagedProviderSummary {
  const normalized = normalizeManagedProvider(provider)
  return {
    id: normalized.id,
    name: normalized.name,
    description: normalized.description,
    models: normalized.models,
    defaultModel: normalized.defaultModel,
  }
}

export function listPublicManagedProviders(store: Pick<DataStore, 'managedProviders'>) {
  return getEnabledManagedProviders(store).map(toPublicManagedProviderSummary)
}

export function findStoredProviderConfigByUserId(store: Pick<DataStore, 'providerConfigs'>, userId: string) {
  const config = store.providerConfigs.find((item) => item.userId === userId)
  return config ? normalizeUserProviderConfigInput(config) : null
}

export function validateManagedProvider(provider: StoredManagedProvider) {
  const apiUrlError = validateProviderApiUrl(provider.apiUrl)
  if (apiUrlError) return apiUrlError
  if (!provider.id.trim()) return { code: 'INVALID_INPUT', message: 'Provider ID 不能为空' }
  if (!provider.name.trim()) return { code: 'INVALID_INPUT', message: 'Provider 名称不能为空' }
  if (!provider.models.length) return { code: 'PROVIDER_MODEL_INVALID', message: '至少需要配置一个可选模型' }
  if (!provider.defaultModel.trim()) return { code: 'PROVIDER_MODEL_INVALID', message: '默认模型不能为空' }
  if (!provider.models.includes(provider.defaultModel)) return { code: 'PROVIDER_MODEL_INVALID', message: '默认模型必须包含在模型列表中' }
  if (!provider.apiKey.trim()) return { code: 'PROVIDER_API_KEY_MISSING', message: 'Provider API Key 不能为空' }
  return null
}

export function resolveEffectiveProviderConfig(params: {
  store: Pick<DataStore, 'managedProviders'>
  config: StoredProviderConfig | null
}): { config: ResolvedProviderRuntimeConfig | null; error: ProviderValidationError | null } {
  const normalized = params.config ? normalizeUserProviderConfigInput(params.config) : null
  if (!normalized) {
    return {
      config: null,
      error: { code: 'PROVIDER_CONFIG_REQUIRED', message: '请先选择一个 Provider，或填写自定义 Provider 配置。' },
    }
  }

  if (!normalized.model.trim()) {
    return {
      config: null,
      error: { code: 'PROVIDER_MODEL_MISSING', message: '请先填写或选择 Provider Model。' },
    }
  }

  if (normalized.mode === 'managed') {
    const provider = getEnabledManagedProviders(params.store).find((item) => item.id === normalized.managedProviderId)
    if (!provider) {
      return {
        config: null,
        error: { code: 'PROVIDER_CONFIG_REQUIRED', message: '当前选择的公共 Provider 不存在或已下线，请重新选择。' },
      }
    }
    const model = normalized.model.trim() || provider.defaultModel
    if (!provider.models.includes(model)) {
      return {
        config: null,
        error: { code: 'PROVIDER_MODEL_INVALID', message: '当前选择的模型不在该公共 Provider 的可用列表中。' },
      }
    }
    if (!provider.apiKey.trim()) {
      return {
        config: null,
        error: { code: 'PROVIDER_API_KEY_MISSING', message: '管理员尚未为该公共 Provider 配置可用的 API Key。' },
      }
    }
    const resolvedApiUrl = resolveProviderBaseUrl(provider.apiUrl)
    if (!resolvedApiUrl) {
      return {
        config: null,
        error: { code: 'PROVIDER_URL_INVALID', message: '当前公共 Provider 未配置可用的 API URL，且服务端也没有默认上游。' },
      }
    }
    return {
      config: {
        source: 'managed',
        providerId: provider.id,
        managedProviderId: provider.id,
        apiUrl: resolvedApiUrl,
        model,
        apiKey: provider.apiKey.trim(),
        exposeApiUrl: false,
      },
      error: null,
    }
  }

  if (!normalized.apiKey.trim()) {
    return {
      config: null,
      error: { code: 'PROVIDER_API_KEY_MISSING', message: '请先填写自定义 Provider API Key。' },
    }
  }

  const apiUrlError = validateProviderApiUrl(normalized.apiUrl)
  if (apiUrlError) return { config: null, error: apiUrlError }

  const resolvedApiUrl = resolveProviderBaseUrl(normalized.apiUrl)
  if (!resolvedApiUrl) {
    return {
      config: null,
      error: { code: 'PROVIDER_URL_INVALID', message: '当前未设置 Provider API URL，且服务端也未配置 PROVIDER_UPSTREAM_ORIGIN。请填写完整云端基址，或让服务端配置默认上游。' },
    }
  }

  return {
    config: {
      source: 'custom',
      providerId: 'custom',
      managedProviderId: undefined,
      apiUrl: resolvedApiUrl,
      model: normalized.model.trim(),
      apiKey: normalized.apiKey.trim(),
      exposeApiUrl: true,
    },
    error: null,
  }
}
