import { useEffect, useMemo, useState } from 'react'
import { useAuthSession } from '@/features/auth/useAuthSession'
import { normalizeProviderConfig } from '@/features/provider/provider.compat'
import { defaultConfig, providerPresets } from '@/features/provider/provider.constants'
import { readStoredConfig, writeStoredConfig } from '@/features/provider/provider.storage'
import type { ProviderConfig } from '@/features/provider/provider.types'

type UseProviderConfigOptions = {
  onSaved?: () => void
}

export function useProviderConfig({ onSaved }: UseProviderConfigOptions = {}) {
  const { isAuthenticated, loading: authLoading } = useAuthSession()
  const [config, setConfig] = useState<ProviderConfig>(defaultConfig)
  const [draftConfig, setDraftConfig] = useState<ProviderConfig>(defaultConfig)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const requestUrl = useMemo(() => '/api/provider-proxy/v1/images/generations', [config.providerId])
  const editRequestUrl = useMemo(() => '/api/provider-proxy/v1/images/edits', [config.providerId])
  const activePreset = providerPresets.find((provider) => provider.id === config.providerId) ?? providerPresets[0]

  useEffect(() => {
    let cancelled = false

    if (authLoading) return () => {
      cancelled = true
    }

    if (!isAuthenticated) {
      setConfig(defaultConfig)
      setDraftConfig(defaultConfig)
      return () => {
        cancelled = true
      }
    }

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
  }, [authLoading, isAuthenticated])

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
    const normalized = normalizeProviderConfig(draftConfig)
    const saved = await writeStoredConfig(normalized)
    setConfig(saved)
    setDraftConfig(saved)
    setSettingsOpen(false)
    onSaved?.()
  }

  async function applyProviderSnapshot(snapshot: Partial<Pick<ProviderConfig, 'providerId' | 'apiUrl' | 'model'>>) {
    const normalized = normalizeProviderConfig({
      ...config,
      providerId: snapshot.providerId?.trim() || config.providerId,
      apiUrl: snapshot.apiUrl?.trim() ?? config.apiUrl,
      model: snapshot.model?.trim() || config.model,
      apiKey: config.apiKey,
    })
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
