import { useEffect, useMemo, useState } from 'react'
import { useAuthSession } from '@/features/auth/useAuthSession'
import { defaultConfig, providerConnectionLabel } from '@/features/provider/provider.constants'
import { loadWithRetry } from '@/features/provider/provider.loader'
import { readStoredConfig, writeStoredConfig } from '@/features/provider/provider.storage'
import { normalizeProviderConfig, providerEditRequestUrl, providerGenerationRequestUrl } from '@/features/provider/provider.utils'
import type { ManagedProviderOption, ProviderConfig, ProviderPolicy } from '@/features/provider/provider.types'

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
  const { user, isAuthenticated, loading: authLoading } = useAuthSession()
  const [config, setConfig] = useState<ProviderConfig>(defaultConfig)
  const [draftConfig, setDraftConfig] = useState<ProviderConfig>(defaultConfig)
  const [managedProviders, setManagedProviders] = useState<ManagedProviderOption[]>([])
  const [providerPolicy, setProviderPolicy] = useState<ProviderPolicy>({
    allowManagedProviders: true,
    allowCustomProvider: true,
    allowedManagedProviderIds: [],
    allowedModels: [],
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const requestUrl = providerGenerationRequestUrl
  const editRequestUrl = providerEditRequestUrl

  useEffect(() => {
    let cancelled = false

    if (authLoading) return () => {
      cancelled = true
    }

    if (!isAuthenticated || !user) {
      setConfig(defaultConfig)
      setDraftConfig(defaultConfig)
      setManagedProviders([])
      setProviderPolicy({
        allowManagedProviders: true,
        allowCustomProvider: true,
        allowedManagedProviderIds: [],
        allowedModels: [],
      })
      setLoading(false)
      setSettingsOpen(false)
      return () => {
        cancelled = true
      }
    }

    setLoading(true)

    void loadWithRetry(() => readStoredConfig())
      .then((stored) => {
        if (cancelled) return
        setConfig(stored.config)
        setDraftConfig(stored.config)
        setManagedProviders(stored.managedProviders)
        setProviderPolicy(stored.providerPolicy)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, isAuthenticated, user])

  useEffect(() => {
    if (!settingsOpen) setDraftConfig(config)
  }, [config, settingsOpen])

  async function saveProviderConfig() {
    if (!user) throw new Error('当前未登录，无法保存 Provider 配置。')
    const normalized = normalizeProviderConfig(draftConfig)
    const saved = await writeStoredConfig(normalized)
    setConfig(saved.config)
    setDraftConfig(saved.config)
    setManagedProviders(saved.managedProviders)
    setProviderPolicy(saved.providerPolicy)
    setSettingsOpen(false)
    onSaved?.()
  }

  const connectionLabel = useMemo(() => {
    if (loading) return `${providerConnectionLabel} · 恢复中`
    if (config.mode === 'managed') return `${providerConnectionLabel} · ${resolveProviderDisplayName(config, managedProviders)}`
    return `${providerConnectionLabel} · 自定义`
  }, [config, loading, managedProviders])

  const selectedManagedProvider = useMemo(
    () => managedProviders.find((item) => item.id === draftConfig.managedProviderId) ?? null,
    [draftConfig.managedProviderId, managedProviders],
  )

  return {
    config,
    draftConfig,
    managedProviders,
    providerPolicy,
    selectedManagedProvider,
    settingsOpen,
    loading,
    connectionLabel,
    providerDisplayName: resolveProviderDisplayName(config, managedProviders),
    requestUrl,
    editRequestUrl,
    setDraftConfig,
    setSettingsOpen,
    saveProviderConfig,
  }
}
