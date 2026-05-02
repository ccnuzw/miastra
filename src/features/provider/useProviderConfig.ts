import { useEffect, useMemo, useState } from 'react'
import { editEndpoint, generationEndpoint } from '@/features/generation/generation.constants'
import { defaultConfig, providerPresets } from '@/features/provider/provider.constants'
import { readStoredConfig, writeStoredConfig } from '@/features/provider/provider.storage'
import type { ProviderConfig } from '@/features/provider/provider.types'
import { resolveImageApiUrl } from '@/shared/utils/url'

type UseProviderConfigOptions = {
  onSaved?: () => void
}

export function useProviderConfig({ onSaved }: UseProviderConfigOptions = {}) {
  const [config, setConfig] = useState<ProviderConfig>(defaultConfig)
  const [draftConfig, setDraftConfig] = useState<ProviderConfig>(defaultConfig)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const requestUrl = useMemo(() => resolveImageApiUrl(config.apiUrl, generationEndpoint), [config.apiUrl])
  const editRequestUrl = useMemo(() => resolveImageApiUrl(config.apiUrl, editEndpoint), [config.apiUrl])
  const activePreset = providerPresets.find((provider) => provider.id === config.providerId) ?? providerPresets[0]

  useEffect(() => {
    let cancelled = false
    void readStoredConfig()
      .then((stored) => {
        if (cancelled) return
        setConfig(stored)
        setDraftConfig(stored)
      })
      .catch(() => {
        if (cancelled) return
        setConfig(defaultConfig)
        setDraftConfig(defaultConfig)
      })

    return () => {
      cancelled = true
    }
  }, [])

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

  async function saveProviderConfig() {
    const normalized = {
      ...draftConfig,
      apiUrl: draftConfig.apiUrl.trim(),
      model: draftConfig.model.trim(),
      apiKey: draftConfig.apiKey.trim(),
    }
    const saved = await writeStoredConfig(normalized)
    setConfig(saved)
    setDraftConfig(saved)
    setSettingsOpen(false)
    onSaved?.()
  }

  async function applyProviderSnapshot(snapshot: Partial<Pick<ProviderConfig, 'providerId' | 'apiUrl' | 'model'>>) {
    const normalized = {
      ...config,
      providerId: snapshot.providerId?.trim() || config.providerId,
      apiUrl: snapshot.apiUrl?.trim() ?? config.apiUrl,
      model: snapshot.model?.trim() || config.model,
    }
    const saved = await writeStoredConfig(normalized)
    setConfig(saved)
    setDraftConfig(saved)
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
