import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, Lock, PlugZap, RadioTower, Save, X } from 'lucide-react'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'
import { detectProviderCapabilities, normalizeProviderConfig } from './provider.compat'
import type { ProviderConfig } from './provider.types'
import { providerPresets } from './provider.constants'
import { testProviderConnection } from './provider.testConnection'
import { editEndpoint, generationEndpoint } from '@/features/generation/generation.constants'
import { resolveImageApiUrl } from '@/shared/utils/url'

type ProviderModalProps = {
  open: boolean
  draftConfig: ProviderConfig
  onDraftConfigChange: (config: ProviderConfig) => void
  onProviderChange: (providerId: string) => void
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

export function ProviderModal({ open, draftConfig, onDraftConfigChange, onProviderChange, onSave, onClose }: ProviderModalProps) {
  const [connectionTest, setConnectionTest] = useState<ConnectionTestState>(idleConnectionTestState)
  const [saveState, setSaveState] = useState<SaveState>(idleSaveState)
  const testRunRef = useRef(0)
  const connectionFingerprint = useMemo(
    () => [draftConfig.providerId, draftConfig.apiUrl, draftConfig.apiKey, draftConfig.model].join('\n'),
    [draftConfig.apiKey, draftConfig.apiUrl, draftConfig.model, draftConfig.providerId],
  )
  const normalizedDraftConfig = useMemo(() => normalizeProviderConfig(draftConfig), [draftConfig])
  const capabilities = useMemo(() => detectProviderCapabilities(normalizedDraftConfig), [normalizedDraftConfig])
  const isTestingConnection = connectionTest.status === 'loading'
  const isSaving = saveState.status === 'loading'

  useEffect(() => {
    testRunRef.current += 1
    setConnectionTest(idleConnectionTestState)
    setSaveState(idleSaveState)
  }, [connectionFingerprint])

  useEffect(() => {
    if (open) return
    testRunRef.current += 1
    setConnectionTest(idleConnectionTestState)
    setSaveState(idleSaveState)
  }, [open])

  const updateDraftConfig = useCallback(
    (patch: Partial<ProviderConfig>) => {
      onDraftConfigChange({ ...draftConfig, ...patch })
    },
    [draftConfig, onDraftConfigChange],
  )

  const handleProviderChange = useCallback(
    (providerId: string) => {
      onProviderChange(providerId)
    },
    [onProviderChange],
  )

  const handleTestConnection = useCallback(async () => {
    const runId = testRunRef.current + 1
    testRunRef.current = runId
    setConnectionTest({ status: 'loading', message: '正在使用当前弹窗配置测试连接…' })

    try {
      const result = await testProviderConnection(draftConfig)
      if (runId !== testRunRef.current) return
      setConnectionTest({ status: 'success', message: result.message, requestUrl: result.requestUrl })
    } catch (error) {
      if (runId !== testRunRef.current) return
      setConnectionTest({ status: 'error', message: '', error })
    }
  }, [draftConfig])

  const handleSave = useCallback(async () => {
    setSaveState({ status: 'loading', error: null, message: '正在保存 Provider 配置…' })
    try {
      await onSave()
      setSaveState({ status: 'success', error: null, message: '配置已保存，后续生成和代理请求将使用这份配置。' })
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
            <h2 className="mt-2 font-display text-4xl leading-none">配置生图服务</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-porcelain-100/[0.6]">
              Provider 配置会保存到当前登录账号的服务端配置中心，不会再落到浏览器本地存储。
            </p>
          </div>
          <button type="button" onClick={onClose} className="icon-button" aria-label="关闭设置">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {providerPresets.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => handleProviderChange(provider.id)}
              className={`provider-card ${draftConfig.providerId === provider.id ? 'provider-card-active' : ''}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-porcelain-50/[0.08] text-signal-cyan">
                <RadioTower className="h-5 w-5" />
              </span>
              <span className="min-w-0 text-left">
                <span className="block text-sm font-semibold text-porcelain-50">{provider.name}</span>
                <span className="mt-1 block text-xs leading-5 text-porcelain-100/[0.48]">{provider.note}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="field-block md:col-span-2">
            <span className="field-label">Provider API URL</span>
            <input
              value={draftConfig.apiUrl}
              onChange={(event) => updateDraftConfig({ apiUrl: event.target.value })}
              className="input-shell"
              placeholder="留空使用当前站点 /sub2api 代理，避免浏览器 CORS"
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
              placeholder="sk-... 或 sub2api key"
              type="password"
            />
          </label>
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-porcelain-50/10 bg-porcelain-50/[0.035] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-porcelain-50">
                <PlugZap className="h-4 w-4 text-signal-cyan" />
                测试连接
              </div>
              <p className="mt-2 text-xs leading-5 text-porcelain-100/[0.55]">
                使用当前弹窗草稿配置发起一次最小生图请求；不会影响作品区、预览区或正式生成状态。
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
            能力探测
          </div>
          <p className="mt-2 text-xs leading-5 text-porcelain-100/[0.65]">
            {`${capabilities.familyLabel} · 文生图 ${capabilities.generationUrl} · 图生图 ${capabilities.supportsImageEdits ? `标准接口（${capabilities.editSupportConfidence} 置信）` : '兼容性较低'}`}
          </p>
          {capabilities.omittedJsonParams.length > 0 && (
            <p className="mt-2 text-[11px] leading-5 text-porcelain-100/[0.5]">
              自动省略参数：{capabilities.omittedJsonParams.join('、')}
            </p>
          )}
          {capabilities.warnings.length > 0 && (
            <p className="mt-2 text-[11px] leading-5 text-signal-coral/80">{capabilities.warnings.join(' ')}</p>
          )}
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-signal-cyan/20 bg-signal-cyan/[0.055] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-cyan">
            <Lock className="h-4 w-4" />
            配置存储说明
          </div>
          <p className="mt-2 text-xs leading-5 text-porcelain-100/[0.55]">
            配置会保存到后端的当前账号配置中心。若部署给多人使用，建议继续把 Provider API Key 放在服务端，不要回退到前端长期存储。
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="truncate font-mono text-xs text-porcelain-100/[0.52]">
            {`生成：${resolveImageApiUrl(normalizedDraftConfig.apiUrl, generationEndpoint)} · 编辑：${resolveImageApiUrl(normalizedDraftConfig.apiUrl, editEndpoint)}`}
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
                ? <div className="min-w-0 flex-1"><ErrorNotice error={saveState.error ?? '保存配置失败。'} compact /></div>
                : <span>{saveState.message}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
