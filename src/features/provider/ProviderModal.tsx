import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, Lock, PlugZap, RadioTower, Save, X } from 'lucide-react'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'
import type { ManagedProviderOption, ProviderConfig } from './provider.types'
import { providerConnectionLabel } from './provider.constants'
import { testProviderConnection } from './provider.testConnection'
import { normalizeProviderConfig, providerEditRequestUrl, providerGenerationRequestUrl } from './provider.utils'

type ProviderModalProps = {
  open: boolean
  config: ProviderConfig
  draftConfig: ProviderConfig
  managedProviders: ManagedProviderOption[]
  onDraftConfigChange: (config: ProviderConfig) => void
  onSave: () => Promise<void> | void
  onClose: () => void
}

type ConnectionTestState = {
  status: 'idle' | 'loading' | 'success' | 'error'
  message: string
  requestUrl?: string
  error?: unknown
}

type SaveState = {
  status: 'idle' | 'loading' | 'success' | 'error'
  error: unknown
  message: string
}

const idleConnectionTestState: ConnectionTestState = { status: 'idle', message: '' }
const idleSaveState: SaveState = { status: 'idle', error: null, message: '' }

export function ProviderModal({ open, config, draftConfig, managedProviders, onDraftConfigChange, onSave, onClose }: ProviderModalProps) {
  const [connectionTest, setConnectionTest] = useState<ConnectionTestState>(idleConnectionTestState)
  const [saveState, setSaveState] = useState<SaveState>(idleSaveState)
  const testRunRef = useRef(0)
  const normalizedDraftConfig = useMemo(() => normalizeProviderConfig(draftConfig), [draftConfig])
  const normalizedSavedConfig = useMemo(() => normalizeProviderConfig(config), [config])
  const selectedManagedProvider = useMemo(
    () => managedProviders.find((item) => item.id === normalizedDraftConfig.managedProviderId) ?? null,
    [managedProviders, normalizedDraftConfig.managedProviderId],
  )
  const isDirty = useMemo(
    () => JSON.stringify(normalizedDraftConfig) !== JSON.stringify(normalizedSavedConfig),
    [normalizedDraftConfig, normalizedSavedConfig],
  )
  const isTestingConnection = connectionTest.status === 'loading'
  const isSaving = saveState.status === 'loading'

  const resetTransientState = useCallback(() => {
    testRunRef.current += 1
    setConnectionTest(idleConnectionTestState)
    setSaveState(idleSaveState)
  }, [])

  useEffect(() => {
    if (!open) return
    resetTransientState()
  }, [open, resetTransientState])

  useEffect(() => {
    if (open) return
    resetTransientState()
  }, [open, resetTransientState])

  const updateDraftConfig = useCallback(
    (patch: Partial<ProviderConfig>) => {
      resetTransientState()
      onDraftConfigChange({ ...draftConfig, ...patch })
    },
    [draftConfig, onDraftConfigChange, resetTransientState],
  )

  const handleModeChange = useCallback((mode: ProviderConfig['mode']) => {
    if (mode === 'managed') {
      resetTransientState()
      const fallback = managedProviders[0]
      const nextProviderId = normalizedDraftConfig.managedProviderId || fallback?.id || ''
      const nextProvider = managedProviders.find((item) => item.id === nextProviderId) ?? fallback ?? null
      onDraftConfigChange(normalizeProviderConfig({
        ...draftConfig,
        mode: 'managed',
        managedProviderId: nextProvider?.id ?? '',
        providerId: nextProvider?.id ?? '',
        model: nextProvider?.models.includes(draftConfig.model.trim()) ? draftConfig.model : (nextProvider?.defaultModel ?? draftConfig.model),
      }))
      return
    }

    resetTransientState()
    onDraftConfigChange(normalizeProviderConfig({
      ...draftConfig,
      mode: 'custom',
      managedProviderId: '',
      providerId: 'custom',
    }))
  }, [draftConfig, managedProviders, normalizedDraftConfig.managedProviderId, onDraftConfigChange, resetTransientState])

  const handleManagedProviderChange = useCallback((providerId: string) => {
    const nextProvider = managedProviders.find((item) => item.id === providerId) ?? null
    updateDraftConfig(normalizeProviderConfig({
      ...draftConfig,
      mode: 'managed',
      managedProviderId: providerId,
      providerId,
      model: nextProvider?.models.includes(draftConfig.model.trim()) ? draftConfig.model : (nextProvider?.defaultModel ?? ''),
    }))
  }, [draftConfig, managedProviders, updateDraftConfig])

  const handleTestConnection = useCallback(async () => {
    if (isDirty) {
      setConnectionTest({
        status: 'error',
        message: '',
        error: new Error('请先保存当前 Provider 选择或自定义配置，再测试连接。'),
      })
      return
    }

    const runId = testRunRef.current + 1
    testRunRef.current = runId
    setConnectionTest({ status: 'loading', message: '正在通过服务端代理测试已保存配置…' })

    try {
      const result = await testProviderConnection(normalizedSavedConfig)
      if (runId !== testRunRef.current) return
      setConnectionTest({ status: 'success', message: result.message, requestUrl: result.requestUrl })
    } catch (error) {
      if (runId !== testRunRef.current) return
      setConnectionTest({ status: 'error', message: '', error })
    }
  }, [isDirty, normalizedSavedConfig])

  const handleSave = useCallback(async () => {
    setSaveState({ status: 'loading', error: null, message: '正在保存 Provider 配置…' })
    try {
      await onSave()
      setSaveState({ status: 'success', error: null, message: '配置已保存，后续生成和测试都会走同一条代理链路。' })
    } catch (error) {
      setSaveState({ status: 'error', error, message: '' })
    }
  }, [onSave])

  if (!open) return null

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Provider 配置">
      <div className="modal-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Provider Settings</p>
            <h2 className="mt-2 font-display text-4xl leading-none">公共 Provider / 自定义接入</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-porcelain-100/[0.6]">
              管理员可以在后台发布公共 Provider 供账号选择；你也可以切到自定义模式，单独填写自己的云端基址、Model 和 API Key。
            </p>
          </div>
          <button type="button" onClick={onClose} className="icon-button" aria-label="关闭设置">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-signal-cyan/20 bg-signal-cyan/[0.055] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-cyan">
            <RadioTower className="h-4 w-4" />
            {providerConnectionLabel}
          </div>
          <p className="mt-2 text-xs leading-5 text-porcelain-100/[0.55]">
            生成和图生图都会走同一套服务端代理。公共 Provider 的 API URL 和 API Key 由管理员托管，前台只能选择，不能查看。
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleModeChange('managed')}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              normalizedDraftConfig.mode === 'managed'
                ? 'border-signal-cyan/60 bg-signal-cyan/15 text-signal-cyan'
                : 'border-porcelain-50/10 bg-ink-950/[0.45] text-porcelain-100/70'
            }`}
          >
            公共 Provider
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('custom')}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              normalizedDraftConfig.mode === 'custom'
                ? 'border-signal-cyan/60 bg-signal-cyan/15 text-signal-cyan'
                : 'border-porcelain-50/10 bg-ink-950/[0.45] text-porcelain-100/70'
            }`}
          >
            自定义 Provider
          </button>
        </div>

        {normalizedDraftConfig.mode === 'managed' ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="field-block">
              <span className="field-label">公共 Provider</span>
              <select
                value={normalizedDraftConfig.managedProviderId}
                onChange={(event) => handleManagedProviderChange(event.target.value)}
                className="input-shell"
              >
                <option value="" disabled>请选择公共 Provider</option>
                {managedProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>{provider.name}</option>
                ))}
              </select>
            </label>
            <div className="field-block">
              <label className="field-label" htmlFor="managed-provider-model">Model</label>
              {selectedManagedProvider ? (
                <select
                  id="managed-provider-model"
                  value={normalizedDraftConfig.model}
                  onChange={(event) => updateDraftConfig({ model: event.target.value })}
                  className="input-shell"
                >
                  {selectedManagedProvider.models.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              ) : (
                <input
                  id="managed-provider-model"
                  value={normalizedDraftConfig.model}
                  onChange={(event) => updateDraftConfig({ model: event.target.value })}
                  className="input-shell"
                />
              )}
            </div>
            <div className="md:col-span-2 rounded-[1.5rem] border border-porcelain-50/10 bg-porcelain-50/[0.03] p-4 text-xs leading-6 text-porcelain-100/[0.62]">
              <p>当前模式下，Base URL 与 API Key 由管理员托管，前台不会暴露这些敏感信息。</p>
              <p className="mt-2">可选 Provider：{managedProviders.length ? `${managedProviders.length} 个` : '暂无可用公共 Provider，请联系管理员配置或切换到自定义模式。'}</p>
              {selectedManagedProvider?.description ? <p className="mt-2">{selectedManagedProvider.description}</p> : null}
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="field-block md:col-span-2">
              <span className="field-label">Provider API URL</span>
              <input
                value={draftConfig.apiUrl}
                onChange={(event) => updateDraftConfig({ apiUrl: event.target.value })}
                className="input-shell"
                placeholder="例如 https://api.openai.com"
              />
            </label>
            <label className="field-block">
              <span className="field-label">Model</span>
              <input value={draftConfig.model} onChange={(event) => updateDraftConfig({ model: event.target.value })} className="input-shell" />
            </label>
            <label className="field-block">
              <span className="field-label">
                <KeyRound className="h-4 w-4" />
                API Key
              </span>
              <input
                value={draftConfig.apiKey}
                onChange={(event) => updateDraftConfig({ apiKey: event.target.value })}
                className="input-shell"
                placeholder="sk-..."
                type="password"
              />
            </label>
          </div>
        )}

        <div className="mt-6 rounded-[1.75rem] border border-porcelain-50/10 bg-porcelain-50/[0.035] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-porcelain-50">
                <PlugZap className="h-4 w-4 text-signal-cyan" />
                测试连接
              </div>
              <p className="mt-2 text-xs leading-5 text-porcelain-100/[0.55]">
                测试连接只针对已保存配置执行。如果你刚修改了公共 Provider 选择或自定义参数，请先保存。
              </p>
            </div>
            <button
              type="button"
              onClick={handleTestConnection}
              className="settings-button min-w-[132px]"
              disabled={isTestingConnection || isSaving}
              aria-describedby={connectionTest.status === 'idle' ? undefined : 'provider-connection-test-result'}
            >
              {isTestingConnection ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
              {isTestingConnection ? '测试中…' : '测试连接'}
            </button>
          </div>

          {connectionTest.status !== 'idle' && (
            <div
              id="provider-connection-test-result"
              role={connectionTest.status === 'error' ? 'alert' : 'status'}
              aria-live="polite"
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                connectionTest.status === 'success'
                  ? 'border-signal-cyan/35 bg-signal-cyan/15 text-signal-cyan'
                  : connectionTest.status === 'error'
                    ? 'border-signal-coral/35 bg-signal-coral/15 text-signal-coral'
                    : 'border-porcelain-50/10 bg-ink-950/45 text-porcelain-100/70'
              }`}
            >
              <div className="flex items-start gap-2 font-semibold">
                {connectionTest.status === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                {connectionTest.status === 'error' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                {connectionTest.status === 'loading' && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />}
                {connectionTest.status === 'error'
                  ? <div className="min-w-0 flex-1"><ErrorNotice error={connectionTest.error ?? '测试连接失败。'} compact /></div>
                  : <span>{connectionTest.message}</span>}
              </div>
              {connectionTest.requestUrl && (
                <p className="mt-2 break-all font-mono text-[11px] leading-5 opacity-75">测试地址：{connectionTest.requestUrl}</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-[1.75rem] border border-porcelain-50/10 bg-porcelain-50/[0.03] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-porcelain-50">
            <RadioTower className="h-4 w-4 text-signal-cyan" />
            接入规则
          </div>
          <p className="mt-2 text-xs leading-5 text-porcelain-100/[0.65]">
            代理生成：{providerGenerationRequestUrl} · 代理编辑：{providerEditRequestUrl}
          </p>
          <p className="mt-2 text-xs leading-5 text-porcelain-100/[0.65]">
            当前模式：{normalizedDraftConfig.mode === 'managed' ? '公共 Provider' : '自定义 Provider'}
          </p>
          <p className="mt-2 text-xs leading-5 text-porcelain-100/[0.65]">
            当前模型：{normalizedDraftConfig.model || '未配置'}
          </p>
          {normalizedDraftConfig.mode === 'custom' ? (
            <p className="mt-2 text-xs leading-5 text-porcelain-100/[0.65]">
              自定义上游基址：{normalizedDraftConfig.apiUrl || '留空后走服务端默认上游'}
            </p>
          ) : null}
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-signal-cyan/20 bg-signal-cyan/[0.055] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-cyan">
            <Lock className="h-4 w-4" />
            配置存储说明
          </div>
          <p className="mt-2 text-xs leading-5 text-porcelain-100/[0.55]">
            公共 Provider 的敏感信息由后台托管；自定义 Provider 的 API Key 会按当前账号配置保存到后端，不会长期落在浏览器本地。
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="truncate font-mono text-xs text-porcelain-100/[0.52]">
            {isDirty ? '当前草稿尚未保存' : '当前草稿与已保存配置一致'}
          </p>
          <button type="button" onClick={() => void handleSave()} className="generate-button" disabled={isSaving || isTestingConnection}>
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {isSaving ? '保存中…' : '保存配置'}
          </button>
        </div>

        {saveState.status !== 'idle' && (
          <div
            role={saveState.status === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              saveState.status === 'success'
                ? 'border-signal-cyan/35 bg-signal-cyan/15 text-signal-cyan'
                : saveState.status === 'error'
                  ? 'border-signal-coral/35 bg-signal-coral/15 text-signal-coral'
                  : 'border-porcelain-50/10 bg-ink-950/45 text-porcelain-100/70'
            }`}
          >
            <div className="flex items-start gap-2 font-semibold">
              {saveState.status === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
              {saveState.status === 'error' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
              {saveState.status === 'loading' && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />}
              {saveState.status === 'error'
                ? <div className="min-w-0 flex-1"><ErrorNotice error={saveState.error ?? '保存失败。'} compact /></div>
                : <span>{saveState.message}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
