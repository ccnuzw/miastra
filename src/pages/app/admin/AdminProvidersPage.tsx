import { Database, HardDriveUpload, Link2, Search, ServerCog } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminPageHeader } from '@/features/admin/AdminPageHeader'
import {
  type AdminAssetStorageConfig,
  type AdminAssetStorageTestResult,
  type AdminManagedProviderRecord,
  type AdminManagedProviderTestResult,
  deleteAdminProvider,
  fetchAdminAssetStorageConfig,
  fetchAdminProviders,
  testAdminAssetStorage,
  testAdminProvider,
  upsertAdminAssetStorageConfig,
  upsertAdminProvider,
} from '@/features/admin/admin.api'
import { formatAdminDateTime } from '@/features/admin/admin.utils'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'

type ProviderDraft = {
  id: string
  name: string
  description: string
  apiUrl: string
  apiKey: string
  modelsText: string
  defaultModel: string
  enabled: boolean
}

type AssetStorageDraft = Omit<AdminAssetStorageConfig, 'updatedAt'>

const emptyProviderDraft: ProviderDraft = {
  id: '',
  name: '',
  description: '',
  apiUrl: '',
  apiKey: '',
  modelsText: '',
  defaultModel: '',
  enabled: true,
}

const defaultAssetStorageDraft: AssetStorageDraft = {
  mode: 'passthrough',
  provider: 's3',
  endpoint: '',
  bucket: '',
  region: '',
  accessKeyId: '',
  secretAccessKey: '',
  publicBaseUrl: '',
  keyPrefix: 'works/',
  forcePathStyle: false,
  inlineMaxBytes: 1_000_000,
}

const assetModeOptions = [
  {
    value: 'inline',
    label: '数据库内联',
    description: '适合开发和小规模演示，图片内容可能直接进入数据库。',
    icon: Database,
  },
  {
    value: 'passthrough',
    label: '外部 URL 透传',
    description: '保留上游返回的图片地址，数据库只保存作品记录与远端链接。',
    icon: Link2,
  },
  {
    value: 'managed',
    label: '对象存储托管',
    description: '将新作品上传到 S3 兼容对象存储，并把云端 key 与 URL 回写到作品资产记录。',
    icon: HardDriveUpload,
  },
] as const

const assetProviderLabels: Record<AssetStorageDraft['provider'], string> = {
  s3: 'Amazon S3',
  oss: '阿里云 OSS',
  cos: '腾讯云 COS',
  r2: 'Cloudflare R2',
  minio: 'MinIO',
}

function assetModeLabel(mode: AssetStorageDraft['mode']) {
  return assetModeOptions.find((item) => item.value === mode)?.label || '未配置'
}

function createStorageDraft(config: AdminAssetStorageConfig): AssetStorageDraft {
  return {
    mode: config.mode,
    provider: config.provider,
    endpoint: config.endpoint,
    bucket: config.bucket,
    region: config.region ?? '',
    accessKeyId: config.accessKeyId ?? '',
    secretAccessKey: config.secretAccessKey ?? '',
    publicBaseUrl: config.publicBaseUrl ?? '',
    keyPrefix: config.keyPrefix ?? '',
    forcePathStyle: config.forcePathStyle,
    inlineMaxBytes: config.inlineMaxBytes,
  }
}

export function AdminProvidersPage() {
  const [providers, setProviders] = useState<AdminManagedProviderRecord[]>([])
  const [providerDraft, setProviderDraft] = useState<ProviderDraft>(emptyProviderDraft)
  const [storageDraft, setStorageDraft] = useState<AssetStorageDraft>(defaultAssetStorageDraft)
  const [storageUpdatedAt, setStorageUpdatedAt] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [providerBusy, setProviderBusy] = useState('')
  const [providerTestBusy, setProviderTestBusy] = useState<'connection' | 'model' | ''>('')
  const [providerTestResult, setProviderTestResult] = useState<AdminManagedProviderTestResult | null>(null)
  const [storageBusy, setStorageBusy] = useState(false)
  const [storageTestBusy, setStorageTestBusy] = useState(false)
  const [storageTestResult, setStorageTestResult] = useState<AdminAssetStorageTestResult | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [providerResult, assetStorage] = await Promise.all([
        fetchAdminProviders(),
        fetchAdminAssetStorageConfig(),
      ])
      setProviders(providerResult.items)
      setStorageDraft(createStorageDraft(assetStorage))
      setStorageUpdatedAt(assetStorage.updatedAt)
      setStorageTestResult(null)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const filteredProviders = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return providers
    return providers.filter((provider) =>
      [
        provider.id,
        provider.name,
        provider.description,
        provider.apiUrl,
        provider.defaultModel,
        provider.models.join(' '),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    )
  }, [providers, query])

  const providerStats = useMemo(() => {
    return {
      total: providers.length,
      enabled: providers.filter((item) => item.enabled).length,
      disabled: providers.filter((item) => !item.enabled).length,
      models: providers.reduce((count, item) => count + item.models.length, 0),
    }
  }, [providers])

  function resetProviderDraft() {
    setProviderDraft(emptyProviderDraft)
    setProviderTestResult(null)
  }

  function handleEditProvider(provider: AdminManagedProviderRecord) {
    setProviderDraft({
      id: provider.id,
      name: provider.name,
      description: provider.description ?? '',
      apiUrl: provider.apiUrl,
      apiKey: provider.apiKey,
      modelsText: provider.models.join('\n'),
      defaultModel: provider.defaultModel,
      enabled: provider.enabled,
    })
    setProviderTestResult(null)
  }

  async function handleSaveProvider() {
    const providerId = providerDraft.id.trim()
    if (!providerId) {
      setError(new Error('Provider ID 不能为空'))
      return
    }

    const models = providerDraft.modelsText
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)

    setProviderBusy(`save:${providerId}`)
    setError(null)
    setMessage('')
    setProviderTestResult(null)
    try {
      await upsertAdminProvider(providerId, {
        name: providerDraft.name,
        description: providerDraft.description || undefined,
        apiUrl: providerDraft.apiUrl,
        apiKey: providerDraft.apiKey,
        models,
        defaultModel: providerDraft.defaultModel,
        enabled: providerDraft.enabled,
      })
      setMessage(`Provider ${providerId} 已保存。`)
      resetProviderDraft()
      await refresh()
    } catch (nextError) {
      setError(nextError)
    } finally {
      setProviderBusy('')
    }
  }

  async function handleTestProvider(mode: 'connection' | 'model') {
    setProviderTestBusy(mode)
    setError(null)
    setMessage('')
    setProviderTestResult(null)
    try {
      const result = await testAdminProvider({
        apiUrl: providerDraft.apiUrl,
        apiKey: providerDraft.apiKey,
        model: providerDraft.defaultModel,
        mode,
      })
      setProviderTestResult(result)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setProviderTestBusy('')
    }
  }

  async function handleDeleteProvider(id: string) {
    if (!window.confirm('确定要删除这个公共 Provider 吗？')) return

    setProviderBusy(`delete:${id}`)
    setError(null)
    setMessage('')
    try {
      await deleteAdminProvider(id)
      if (providerDraft.id === id) resetProviderDraft()
      setMessage(`Provider ${id} 已删除。`)
      await refresh()
    } catch (nextError) {
      setError(nextError)
    } finally {
      setProviderBusy('')
    }
  }

  async function handleSaveStorage() {
    setStorageBusy(true)
    setError(null)
    setMessage('')
    try {
      const saved = await upsertAdminAssetStorageConfig(storageDraft)
      setStorageDraft(createStorageDraft(saved))
      setStorageUpdatedAt(saved.updatedAt)
      setMessage(`资产存储策略已更新为“${assetModeLabel(saved.mode)}”。`)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setStorageBusy(false)
    }
  }

  async function handleTestStorage() {
    setStorageTestBusy(true)
    setStorageTestResult(null)
    setError(null)
    setMessage('')
    try {
      const result = await testAdminAssetStorage(storageDraft)
      setStorageTestResult(result)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setStorageTestBusy(false)
    }
  }

  return (
    <div className="admin-page-content">
      <AdminPageHeader
        eyebrow="Providers"
        title="公共 Provider 与资产存储"
        description="这里不仅维护系统级公共 Provider，也定义作品资产应该落在哪里。Provider 负责生成能力，资产存储负责图片沉淀策略。"
        meta={(
          <div className="flex flex-wrap items-center gap-2">
            <span className="status-pill">公共 Provider：{providers.length} 个</span>
            <span className="status-pill">资产策略：{assetModeLabel(storageDraft.mode)}</span>
          </div>
        )}
        actions={
          <>
            <button
              type="button"
              className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan"
              onClick={() => void refresh()}
            >
              刷新配置
            </button>
            <button
              type="button"
              className="rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-4 py-2 text-sm font-semibold text-signal-cyan"
              onClick={resetProviderDraft}
            >
              新建 Provider
            </button>
          </>
        }
      />

      {loading ? <p className="text-sm text-porcelain-100/60">正在加载 Provider 与资产配置…</p> : null}
      {error ? <ErrorNotice error={error} /> : null}
      {message ? (
        <p className="rounded-2xl border border-signal-cyan/25 bg-signal-cyan/10 px-4 py-3 text-sm text-signal-cyan">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 min-[1680px]:grid-cols-5">
        <article className="progress-card">
          <p className="text-sm text-porcelain-100/60">公共 Provider</p>
          <p className="mt-2 text-3xl font-semibold text-porcelain-50">{providerStats.total}</p>
        </article>
        <article className="progress-card">
          <p className="text-sm text-porcelain-100/60">启用中</p>
          <p className="mt-2 text-3xl font-semibold text-signal-cyan">{providerStats.enabled}</p>
        </article>
        <article className="progress-card">
          <p className="text-sm text-porcelain-100/60">已停用</p>
          <p className="mt-2 text-3xl font-semibold text-signal-coral">{providerStats.disabled}</p>
        </article>
        <article className="progress-card">
          <p className="text-sm text-porcelain-100/60">当前资产策略</p>
          <p className="mt-2 text-2xl font-semibold text-porcelain-50">{assetModeLabel(storageDraft.mode)}</p>
          <p className="mt-2 text-xs text-porcelain-100/45">{storageDraft.mode === 'managed' ? assetProviderLabels[storageDraft.provider] : '作品写入时按当前策略整理资产引用'}</p>
        </article>
        <article className="progress-card">
          <p className="text-sm text-porcelain-100/60">资产目标</p>
          <p className="mt-2 text-2xl font-semibold text-porcelain-50">{storageDraft.bucket || '未配置 Bucket'}</p>
          <p className="mt-2 text-xs text-porcelain-100/45">{storageUpdatedAt ? `更新于 ${formatAdminDateTime(storageUpdatedAt)}` : '尚未保存'}</p>
        </article>
      </div>

      <div className="grid gap-6 min-[1500px]:grid-cols-[minmax(0,1fr)_480px]">
        <article className="progress-card min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Asset Storage</p>
              <h2 className="mt-3 text-2xl font-semibold text-porcelain-50">作品资产存储策略</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-porcelain-100/60">
                这块配置决定新生成作品如何沉淀。数据库内联适合开发，URL 透传适合沿用第三方图片地址，对象存储托管则会把图片上传到你配置的 S3 兼容存储，并沉淀云端资产引用。
              </p>
            </div>
            <div className="rounded-[1.3rem] border border-signal-cyan/20 bg-signal-cyan/10 px-4 py-3 text-xs text-signal-cyan">
              当前模式：{assetModeLabel(storageDraft.mode)}
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {assetModeOptions.map((option) => {
              const Icon = option.icon
              const active = storageDraft.mode === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStorageDraft((current) => ({ ...current, mode: option.value }))}
                  className={`rounded-[1.6rem] border p-4 text-left transition ${active ? 'border-signal-cyan/45 bg-signal-cyan/10 shadow-glow' : 'border-porcelain-50/10 bg-ink-950/[0.4] hover:border-signal-cyan/25'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`grid h-11 w-11 place-items-center rounded-2xl border ${active ? 'border-signal-cyan/35 bg-signal-cyan/12 text-signal-cyan' : 'border-porcelain-50/10 bg-ink-950/70 text-porcelain-100/55'}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-porcelain-50">{option.label}</p>
                      <p className="mt-1 text-xs text-porcelain-100/45">{option.value}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-porcelain-100/60">{option.description}</p>
                </button>
              )
            })}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-porcelain-100/35">运行说明</p>
              <p className="mt-3 text-sm leading-6 text-porcelain-100/68">
                {storageDraft.mode === 'inline'
                  ? '系统会优先保留当前图片内容，适合本地或测试环境。'
                  : storageDraft.mode === 'passthrough'
                    ? '系统会保留上游返回的图片 URL，并把作品记录与远端链接一并持久化。'
                    : '系统会在服务端尝试上传图片到当前对象存储，并把作品切换成云端资产引用。上传失败时会先保留为待入库。'}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-porcelain-100/35">对象存储类型</p>
              <p className="mt-3 text-lg font-semibold text-porcelain-50">{assetProviderLabels[storageDraft.provider]}</p>
              <p className="mt-2 text-xs text-porcelain-100/45">{storageDraft.endpoint || '尚未配置 Endpoint'}</p>
            </div>
            <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-porcelain-100/35">路径前缀</p>
              <p className="mt-3 text-lg font-semibold text-porcelain-50">{storageDraft.keyPrefix || '未设置'}</p>
              <p className="mt-2 text-xs text-porcelain-100/45">建议使用 `works/年份/月/` 这类规则，便于后续迁移和批量清理。</p>
            </div>
            <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-porcelain-100/35">内联上限</p>
              <p className="mt-3 text-lg font-semibold text-porcelain-50">{Math.round(storageDraft.inlineMaxBytes / 1024)} KB</p>
              <p className="mt-2 text-xs text-porcelain-100/45">仅用于控制 data URL 进入作品记录时的策略边界。</p>
            </div>
          </div>

          {storageDraft.mode === 'managed' ? (
            <div className="mt-6 rounded-[1.6rem] border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50/90">
              <div className="flex items-center gap-2 font-semibold">
                <ServerCog className="h-4 w-4" />
                <span>托管模式说明</span>
              </div>
              <p className="mt-2">
                当前版本已经把后台配置、服务端上传和作品状态打通。开启对象存储托管后，新的 data URL 或远端图片地址会在服务端尝试上传到你配置的 S3 兼容存储，成功后作品会直接切成“已入库”资产。
              </p>
            </div>
          ) : null}
        </article>

        <article className="progress-card admin-inspector-panel">
          <h2 className="text-lg font-semibold text-porcelain-50">编辑资产策略</h2>
          <div className="mt-4 space-y-3">
            <label className="field-block">
              <span className="field-label">存储模式</span>
              <select
                value={storageDraft.mode}
                onChange={(event) => setStorageDraft((current) => ({ ...current, mode: event.target.value as AssetStorageDraft['mode'] }))}
                className="input-shell"
              >
                {assetModeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="field-block">
              <span className="field-label">对象存储类型</span>
              <select
                value={storageDraft.provider}
                onChange={(event) => setStorageDraft((current) => ({ ...current, provider: event.target.value as AssetStorageDraft['provider'] }))}
                className="input-shell"
              >
                {Object.entries(assetProviderLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="field-block">
              <span className="field-label">Endpoint</span>
              <input
                value={storageDraft.endpoint}
                onChange={(event) => setStorageDraft((current) => ({ ...current, endpoint: event.target.value }))}
                className="input-shell"
                placeholder="例如 https://s3.ap-southeast-1.amazonaws.com"
              />
            </label>
            <label className="field-block">
              <span className="field-label">Bucket</span>
              <input
                value={storageDraft.bucket}
                onChange={(event) => setStorageDraft((current) => ({ ...current, bucket: event.target.value }))}
                className="input-shell"
                placeholder="例如 miastra-assets"
              />
            </label>
            <label className="field-block">
              <span className="field-label">Region</span>
              <input
                value={storageDraft.region}
                onChange={(event) => setStorageDraft((current) => ({ ...current, region: event.target.value }))}
                className="input-shell"
                placeholder="例如 ap-southeast-1"
              />
            </label>
            <label className="field-block">
              <span className="field-label">Access Key</span>
              <input
                value={storageDraft.accessKeyId}
                onChange={(event) => setStorageDraft((current) => ({ ...current, accessKeyId: event.target.value }))}
                className="input-shell"
                placeholder="AKIA..."
              />
            </label>
            <label className="field-block">
              <span className="field-label">Secret Key</span>
              <input
                value={storageDraft.secretAccessKey}
                onChange={(event) => setStorageDraft((current) => ({ ...current, secretAccessKey: event.target.value }))}
                className="input-shell"
                type="password"
                placeholder="••••••••"
              />
            </label>
            <label className="field-block">
              <span className="field-label">公网访问域名</span>
              <input
                value={storageDraft.publicBaseUrl}
                onChange={(event) => setStorageDraft((current) => ({ ...current, publicBaseUrl: event.target.value }))}
                className="input-shell"
                placeholder="例如 https://cdn.example.com"
              />
            </label>
            <label className="field-block">
              <span className="field-label">Key 前缀</span>
              <input
                value={storageDraft.keyPrefix}
                onChange={(event) => setStorageDraft((current) => ({ ...current, keyPrefix: event.target.value }))}
                className="input-shell"
                placeholder="例如 works/2026/05/"
              />
            </label>
            <label className="field-block">
              <span className="field-label">内联大小上限（字节）</span>
              <input
                value={String(storageDraft.inlineMaxBytes)}
                onChange={(event) => setStorageDraft((current) => ({
                  ...current,
                  inlineMaxBytes: Number.parseInt(event.target.value || '0', 10) || current.inlineMaxBytes,
                }))}
                className="input-shell"
                inputMode="numeric"
              />
            </label>
            <label className="flex items-center gap-3 text-sm text-porcelain-100/75">
              <input
                type="checkbox"
                checked={storageDraft.forcePathStyle}
                onChange={(event) => setStorageDraft((current) => ({ ...current, forcePathStyle: event.target.checked }))}
              />
              S3 兼容服务使用 Path Style
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-4 py-2 text-sm font-semibold text-signal-cyan disabled:opacity-35"
                onClick={() => void handleSaveStorage()}
                disabled={storageBusy}
              >
                {storageBusy ? '保存中…' : '保存资产策略'}
              </button>
              <button
                type="button"
                className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 disabled:opacity-35"
                onClick={() => void handleTestStorage()}
                disabled={storageTestBusy}
              >
                {storageTestBusy ? '测试中…' : '测试对象存储'}
              </button>
              <button
                type="button"
                className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50"
                onClick={() => {
                  setStorageDraft(defaultAssetStorageDraft)
                  setStorageTestResult(null)
                }}
              >
                恢复默认
              </button>
            </div>
            {storageTestResult ? (
              <div
                className={`rounded-[1.2rem] border px-4 py-3 text-xs leading-6 ${
                  storageTestResult.ok
                    ? 'border-signal-cyan/25 bg-signal-cyan/10 text-signal-cyan'
                    : 'border-signal-coral/25 bg-signal-coral/10 text-signal-coral'
                }`}
              >
                <p className="font-semibold">{storageTestResult.summary}</p>
                {storageTestResult.detail ? (
                  <p className="mt-1 text-current/80">{storageTestResult.detail}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </article>
      </div>

      <div className="grid gap-6 min-[1520px]:grid-cols-[minmax(0,1fr)_420px] min-[1760px]:grid-cols-[minmax(0,1fr)_460px]">
        <article className="progress-card min-w-0">
          <div className="flex flex-col gap-3 min-[1480px]:flex-row min-[1480px]:items-center min-[1480px]:justify-between">
            <h2 className="text-lg font-semibold text-porcelain-50">已发布 Provider</h2>
            <label className="relative w-full min-[1480px]:w-[320px] 2xl:w-[360px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-porcelain-100/35" />
              <input
                className="input-shell pl-11"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索 Provider / Model"
              />
            </label>
          </div>
          <div className="mt-4 space-y-3">
            {filteredProviders.length ? (
              filteredProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-porcelain-50">{provider.name}</p>
                      <p className="mt-1 font-mono text-xs text-porcelain-100/45">{provider.id}</p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${provider.enabled ? 'border-signal-cyan/30 bg-signal-cyan/10 text-signal-cyan' : 'border-signal-coral/30 bg-signal-coral/10 text-signal-coral'}`}
                    >
                      {provider.enabled ? '已启用' : '已停用'}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-porcelain-100/65">
                    <p>说明：{provider.description || '无描述'}</p>
                    <p>Base URL：{provider.apiUrl || '留空后走服务端默认上游'}</p>
                    <p>默认模型：{provider.defaultModel}</p>
                    <p>模型列表：{provider.models.join(' / ')}</p>
                    <p>凭证状态：{provider.apiKey ? '已配置 API Key' : '未配置 API Key'}</p>
                    <p>更新时间：{formatAdminDateTime(provider.updatedAt)}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-3 py-2 text-xs font-semibold text-signal-cyan"
                      onClick={() => handleEditProvider(provider)}
                      disabled={providerBusy === `delete:${provider.id}`}
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-3 py-2 text-xs font-semibold text-signal-coral disabled:opacity-35"
                      onClick={() => void handleDeleteProvider(provider.id)}
                      disabled={
                        providerBusy === `delete:${provider.id}` ||
                        providerBusy === `save:${provider.id}`
                      }
                    >
                      {providerBusy === `delete:${provider.id}` ? '删除中…' : '删除'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-porcelain-100/60">还没有公共 Provider。</p>
            )}
          </div>
        </article>

        <article className="progress-card admin-inspector-panel">
          <h2 className="text-lg font-semibold text-porcelain-50">
            {providerDraft.id ? `编辑 ${providerDraft.id}` : '新建 Provider'}
          </h2>
          <div className="mt-4 space-y-3">
            <label className="field-block">
              <span className="field-label">Provider ID</span>
              <input
                value={providerDraft.id}
                onChange={(event) =>
                  setProviderDraft((current) => ({ ...current, id: event.target.value }))
                }
                className="input-shell"
                placeholder="例如 openai-main"
              />
            </label>
            <label className="field-block">
              <span className="field-label">名称</span>
              <input
                value={providerDraft.name}
                onChange={(event) =>
                  setProviderDraft((current) => ({ ...current, name: event.target.value }))
                }
                className="input-shell"
              />
            </label>
            <label className="field-block">
              <span className="field-label">说明</span>
              <textarea
                value={providerDraft.description}
                onChange={(event) =>
                  setProviderDraft((current) => ({ ...current, description: event.target.value }))
                }
                className="input-shell min-h-[96px]"
              />
            </label>
            <label className="field-block">
              <span className="field-label">Base URL</span>
              <input
                value={providerDraft.apiUrl}
                onChange={(event) =>
                  setProviderDraft((current) => ({ ...current, apiUrl: event.target.value }))
                }
                className="input-shell"
                placeholder="例如 https://api.openai.com"
              />
            </label>
            <label className="field-block">
              <span className="field-label">API Key</span>
              <input
                value={providerDraft.apiKey}
                onChange={(event) =>
                  setProviderDraft((current) => ({ ...current, apiKey: event.target.value }))
                }
                className="input-shell"
                type="password"
                placeholder="sk-..."
              />
            </label>
            <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">连通性测试</p>
              <p className="mt-3 text-sm leading-6 text-porcelain-100/62">
                使用 OpenAI 兼容的模型列表接口探测上游是否可达，并尽量校验默认模型是否可见。
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.72] px-4 py-2 text-xs font-semibold text-porcelain-50 disabled:opacity-35"
                  onClick={() => void handleTestProvider('connection')}
                  disabled={!providerDraft.apiKey.trim() || Boolean(providerTestBusy)}
                >
                  {providerTestBusy === 'connection' ? '测试连接中…' : '测试连接'}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.72] px-4 py-2 text-xs font-semibold text-porcelain-50 disabled:opacity-35"
                  onClick={() => void handleTestProvider('model')}
                  disabled={!providerDraft.apiKey.trim() || !providerDraft.defaultModel.trim() || Boolean(providerTestBusy)}
                >
                  {providerTestBusy === 'model' ? '测试模型中…' : '测试模型'}
                </button>
              </div>
              {providerTestResult ? (
                <div
                  className={`mt-4 rounded-[1.2rem] border px-4 py-3 text-xs leading-6 ${
                    providerTestResult.ok
                      ? 'border-signal-cyan/25 bg-signal-cyan/10 text-signal-cyan'
                      : 'border-signal-coral/25 bg-signal-coral/10 text-signal-coral'
                  }`}
                >
                  <p className="font-semibold">{providerTestResult.summary}</p>
                  {providerTestResult.detail ? (
                    <p className="mt-1 text-current/80">{providerTestResult.detail}</p>
                  ) : null}
                  {providerTestResult.availableModels?.length ? (
                    <p className="mt-1 text-current/80">
                      返回模型：{providerTestResult.availableModels.slice(0, 6).join(' / ')}
                      {providerTestResult.availableModels.length > 6 ? ' …' : ''}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <label className="field-block">
              <span className="field-label">模型列表</span>
              <textarea
                value={providerDraft.modelsText}
                onChange={(event) =>
                  setProviderDraft((current) => ({ ...current, modelsText: event.target.value }))
                }
                className="input-shell min-h-[120px]"
                placeholder={'每行一个模型，例如\ngpt-image-2'}
              />
            </label>
            <label className="field-block">
              <span className="field-label">默认模型</span>
              <input
                value={providerDraft.defaultModel}
                onChange={(event) =>
                  setProviderDraft((current) => ({ ...current, defaultModel: event.target.value }))
                }
                className="input-shell"
              />
            </label>
            <label className="flex items-center gap-3 text-sm text-porcelain-100/75">
              <input
                type="checkbox"
                checked={providerDraft.enabled}
                onChange={(event) =>
                  setProviderDraft((current) => ({ ...current, enabled: event.target.checked }))
                }
              />
              发布给前台用户可选
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-4 py-2 text-sm font-semibold text-signal-cyan disabled:opacity-35"
                onClick={() => void handleSaveProvider()}
                disabled={providerBusy === `save:${providerDraft.id}`}
              >
                {providerBusy === `save:${providerDraft.id}` ? '保存中…' : '保存 Provider'}
              </button>
              <button
                type="button"
                className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50"
                onClick={resetProviderDraft}
              >
                重置
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}
