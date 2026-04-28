import { useEffect, useMemo, useState } from 'react'
import { editEndpoint, generationEndpoint } from '@/features/generation/generation.constants'
import { providerPresets, providerStorageKey } from '@/features/provider/provider.constants'
import { readStoredConfig } from '@/features/provider/provider.storage'
import type { ProviderConfig } from '@/features/provider/provider.types'
import { resolveImageApiUrl } from '@/shared/utils/url'

type UseProviderConfigOptions = {
  onSaved?: () => void
}

export function useProviderConfig({ onSaved }: UseProviderConfigOptions = {}) {
  const [config, setConfig] = useState<ProviderConfig>(() => readStoredConfig())
  const [draftConfig, setDraftConfig] = useState<ProviderConfig>(() => readStoredConfig())
  const [settingsOpen, setSettingsOpen] = useState(false)

  const requestUrl = useMemo(() => resolveImageApiUrl(config.apiUrl, generationEndpoint), [config.apiUrl])
  const editRequestUrl = useMemo(() => resolveImageApiUrl(config.apiUrl, editEndpoint), [config.apiUrl])
  const activePreset = providerPresets.find((provider) => provider.id === config.providerId) ?? providerPresets[0]

  useEffect(() => {
    if (!settingsOpen) setDraftConfig(config)
  }, [config, settingsOpen])

  function handleProviderChange(nextProviderId: string) {
    const nextPreset = providerPresets.find((provider) => provider.id === nextProviderId) ?? providerPresets[0]
    setDraftConfig({
      providerId: nextPreset.id,
      apiUrl: nextPreset.apiUrl,
      model: nextPreset.model,
      apiKey: draftConfig.apiKey,
    })
  }

  function saveProviderConfig() {
    const normalized = {
      ...draftConfig,
      apiUrl: draftConfig.apiUrl.trim(),
      model: draftConfig.model.trim(),
      apiKey: draftConfig.apiKey.trim(),
    }
    setConfig(normalized)
    window.localStorage.setItem(providerStorageKey, JSON.stringify(normalized))
    setSettingsOpen(false)
    onSaved?.()
  }

  function applyProviderSnapshot(snapshot: Partial<Pick<ProviderConfig, 'providerId' | 'apiUrl' | 'model'>>) {
    const normalized = {
      ...config,
      providerId: snapshot.providerId?.trim() || config.providerId,
      apiUrl: snapshot.apiUrl?.trim() ?? config.apiUrl,
      model: snapshot.model?.trim() || config.model,
    }
    setConfig(normalized)
    setDraftConfig(normalized)
    window.localStorage.setItem(providerStorageKey, JSON.stringify(normalized))
  }

  return {
    config,
    draftConfig,
    settingsOpen,
    requestUrl,
    editRequestUrl,
    activePreset,
    setDraftConfig,
    setSettingsOpen,
    applyProviderSnapshot,
    handleProviderChange,
    saveProviderConfig,
  }
}
