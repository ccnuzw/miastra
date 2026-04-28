import { defaultConfig, providerStorageKey } from './provider.constants'
import type { ProviderConfig } from './provider.types'

export function readStoredConfig(): ProviderConfig {
  try {
    const raw = window.localStorage.getItem(providerStorageKey)
    if (!raw) return defaultConfig
    return { ...defaultConfig, ...JSON.parse(raw) }
  } catch {
    return defaultConfig
  }
}
