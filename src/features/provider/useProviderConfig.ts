import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthSession } from '@/features/auth/useAuthSession'
import { defaultConfig, providerConnectionLabel } from '@/features/provider/provider.constants'
import { loadWithRetry } from '@/features/provider/provider.loader'
import { readStoredConfig, writeStoredConfig } from '@/features/provider/provider.storage'
import type {
  ManagedProviderOption,
  ProviderConfig,
  ProviderPolicy,
} from '@/features/provider/provider.types'
import {
  normalizeProviderConfig,
  providerEditRequestUrl,
  providerGenerationRequestUrl,
} from '@/features/provider/provider.utils'

type UseProviderConfigOptions = {
  onSaved?: () => void
}

function resolveProviderDisplayName(
  config: ProviderConfig,
  managedProviders: ManagedProviderOption[],
) {
  if (config.mode === 'managed') {
    return managedProviders.find((item) => item.id === config.managedProviderId)?.name || '平台默认'
  }
  return '我的自定义配置'
}

function resolveProviderModeLabel(config: ProviderConfig) {
  return config.mode === 'managed' ? '平台默认' : '自定义接入'
}

function resolveCredentialStatusLabel(config: ProviderConfig) {
  if (config.mode === 'managed') return '由平台统一托管'
  return config.apiKey.trim() ? '已配置自定义凭证' : '未配置自定义凭证'
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
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const requestUrl = providerGenerationRequestUrl
  const editRequestUrl = providerEditRequestUrl

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    if (authLoading)
      return () => {
        cancelled = true
      }

    if (!isAuthenticated || !user) {
      setConfig(defaultConfig)
      setDraftConfig(defaultConfig)
      setManagedProviders([])
      setError(null)
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
    if (reloadKey > 0) setError(null)

    void loadWithRetry(() => readStoredConfig())
      .then((stored) => {
        if (cancelled) return
        setConfig(stored.config)
        setDraftConfig(stored.config)
        setManagedProviders(stored.managedProviders)
        setProviderPolicy(stored.providerPolicy)
        setError(null)
        setLoading(false)
      })
      .catch((error) => {
        if (cancelled) return
        setError(error)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, isAuthenticated, reloadKey, user])

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
    setError(null)
    setSettingsOpen(false)
    onSaved?.()
  }

  const connectionLabel = useMemo(() => {
    if (loading) return `${providerConnectionLabel} · 恢复配置中`
    return `${providerConnectionLabel} · ${resolveProviderModeLabel(config)}`
  }, [config, loading])

  const providerStatusLabel = useMemo(() => {
    if (loading) return '当前 Provider · 恢复中'
    return `当前 Provider · ${resolveProviderDisplayName(config, managedProviders)}`
  }, [config, loading, managedProviders])

  const modelStatusLabel = useMemo(() => {
    if (loading) return '当前模型 · 恢复中'
    return `当前模型 · ${config.model.trim() || '未选择'}`
  }, [config, loading])

  const selectedManagedProvider = useMemo(
    () => managedProviders.find((item) => item.id === draftConfig.managedProviderId) ?? null,
    [draftConfig.managedProviderId, managedProviders],
  )
  const activeManagedProvider = useMemo(
    () => managedProviders.find((item) => item.id === config.managedProviderId) ?? null,
    [config.managedProviderId, managedProviders],
  )
  const activeProviderId =
    config.mode === 'managed'
      ? config.managedProviderId.trim() || config.providerId.trim()
      : config.providerId.trim() || 'custom'
  const activeModelLabel =
    config.model.trim() || activeManagedProvider?.defaultModel || '未配置模型'

  return {
    config,
    draftConfig,
    managedProviders,
    providerPolicy,
    selectedManagedProvider,
    settingsOpen,
    loading,
    error,
    reload,
    connectionLabel,
    providerStatusLabel,
    modelStatusLabel,
    providerModeLabel: resolveProviderModeLabel(config),
    credentialStatusLabel: resolveCredentialStatusLabel(config),
    providerDisplayName: resolveProviderDisplayName(config, managedProviders),
    activeManagedProvider,
    activeProviderId,
    activeModelLabel,
    requestUrl,
    editRequestUrl,
    setDraftConfig,
    setSettingsOpen,
    saveProviderConfig,
  }
}
