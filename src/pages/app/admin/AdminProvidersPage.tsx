import { Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminPageHeader } from '@/features/admin/AdminPageHeader'
import {
  type AdminManagedProviderRecord,
  deleteAdminProvider,
  fetchAdminProviders,
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

export function AdminProvidersPage() {
  const [providers, setProviders] = useState<AdminManagedProviderRecord[]>([])
  const [providerDraft, setProviderDraft] = useState<ProviderDraft>(emptyProviderDraft)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [providerBusy, setProviderBusy] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAdminProviders()
      setProviders(result.items)
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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Providers"
        title="公共 Provider 管理"
        description="这里维护系统级公共 Provider。普通用户在配置中心看到的是这里发布出去的能力，而不是后台的敏感凭证。"
        meta={<span className="status-pill">当前结果：{providers.length} 个公共 Provider</span>}
        actions={
          <>
            <button
              type="button"
              className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan"
              onClick={() => void refresh()}
            >
              刷新 Provider
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

      {loading ? <p className="text-sm text-porcelain-100/60">正在加载 Provider 列表…</p> : null}
      {error ? <ErrorNotice error={error} /> : null}
      {message ? (
        <p className="rounded-2xl border border-signal-cyan/25 bg-signal-cyan/10 px-4 py-3 text-sm text-signal-cyan">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr_1.1fr_1.1fr]">
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
          <p className="text-sm text-porcelain-100/60">模型总数</p>
          <p className="mt-2 text-3xl font-semibold text-porcelain-50">{providerStats.models}</p>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="progress-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-porcelain-50">已发布 Provider</h2>
            <label className="relative w-full max-w-xs">
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

        <article className="progress-card">
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
