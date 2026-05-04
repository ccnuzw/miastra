import { useEffect, useMemo, useState } from 'react'
import { useAuthSession } from '@/features/auth/useAuthSession'
import { defaultConfig, providerConnectionLabel } from '@/features/provider/provider.constants'
import { readStoredConfig, writeStoredConfig } from '@/features/provider/provider.storage'
import { normalizeProviderConfig, providerEditRequestUrl, providerGenerationRequestUrl } from '@/features/provider/provider.utils'
import type { ManagedProviderOption, ProviderConfig } from '@/features/provider/provider.types'

type UseProviderConfigOptions = {
  onSaved?: () => void
}

function resolveProviderDisplayName(config: ProviderConfig, managedProviders: ManagedProviderOption[]) {
  if (config.mode === 'managed') {
    return managedProviders.find((item) => item.id === config.managedProviderId)?.name || '公共 Provider'
  }
  return '自定义 Provider'
}

export function useProviderConfig({ onSaved }: UseProviderConfigOptions = {}) {
  const { isAuthenticated, loading: authLoading } = useAuthSession()
  const [config, setConfig] = useState<ProviderConfig>(defaultConfig)
  const [draftConfig, setDraftConfig] = useState<ProviderConfig>(defaultConfig)
  const [managedProviders, setManagedProviders] = useState<ManagedProviderOption[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)

  const requestUrl = providerGenerationRequestUrl
  const editRequestUrl = providerEditRequestUrl

  useEffect(() => {
    let cancelled = false

    if (authLoading) return () => {
      cancelled = true
    }

    if (!isAuthenticated) {
      setConfig(defaultConfig)
      setDraftConfig(defaultConfig)
      setManagedProviders([])
      return () => {
        cancelled = true
      }
    }

    void readStoredConfig()
      .then((stored) => {
        if (cancelled) return
        setConfig(stored.config)
        setDraftConfig(stored.config)
        setManagedProviders(stored.managedProviders)
      })
      .catch(() => {
        if (cancelled) return
        setConfig(defaultConfig)
        setDraftConfig(defaultConfig)
        setManagedProviders([])
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, isAuthenticated])

  useEffect(() => {
    if (!settingsOpen) setDraftConfig(config)
  }, [config, settingsOpen])

  async function saveProviderConfig() {
    const normalized = normalizeProviderConfig(draftConfig)
    const saved = await writeStoredConfig(normalized)
    setConfig(saved.config)
    setDraftConfig(saved.config)
    setManagedProviders(saved.managedProviders)
    setSettingsOpen(false)
    onSaved?.()
  }

  const connectionLabel = useMemo(() => {
    if (config.mode === 'managed') return `${providerConnectionLabel} · ${resolveProviderDisplayName(config, managedProviders)}`
    return `${providerConnectionLabel} · 自定义`
  }, [config, managedProviders])

  const selectedManagedProvider = useMemo(
    () => managedProviders.find((item) => item.id === draftConfig.managedProviderId) ?? null,
    [draftConfig.managedProviderId, managedProviders],
  )

  return {
    config,
    draftConfig,
    managedProviders,
    selectedManagedProvider,
    settingsOpen,
    connectionLabel,
    providerDisplayName: resolveProviderDisplayName(config, managedProviders),
    requestUrl,
    editRequestUrl,
    setDraftConfig,
    setSettingsOpen,
    saveProviderConfig,
  }
}
