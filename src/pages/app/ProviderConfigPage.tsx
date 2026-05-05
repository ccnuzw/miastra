import { RefreshCw } from 'lucide-react'
import { ProviderModal } from '@/features/provider/ProviderModal'
import { useProviderConfig } from '@/features/provider/useProviderConfig'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'

export function ProviderConfigPage() {
  const {
    config,
    draftConfig,
    managedProviders,
    providerPolicy,
    settingsOpen,
    loading,
    error,
    reload,
    connectionLabel,
    providerStatusLabel,
    modelStatusLabel,
    providerModeLabel,
    credentialStatusLabel,
    providerDisplayName,
    requestUrl,
    editRequestUrl,
    setDraftConfig,
    setSettingsOpen,
    saveProviderConfig,
  } = useProviderConfig()
  const hasManagedProviderGap = config.mode === 'managed' && managedProviders.length === 0
  const missingModel = !config.model.trim()

  return (
    <>
      <main className="app-page-shell app-page-shell-standard">
        <section className="panel-shell w-full">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Settings</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">配置中心</h1>
              <p className="mt-2 max-w-3xl text-sm text-porcelain-100/60">
                这里统一查看工作台当前使用的云端接入、Provider
                和模型，也可以切换到你自己的自定义接入。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan"
                onClick={() => reload()}
              >
                <RefreshCw className="mr-2 inline h-4 w-4" />
                重新加载
              </button>
              <button
                type="button"
                className="rounded-full border border-signal-cyan/20 bg-signal-cyan/[0.08] px-4 py-2 text-sm font-semibold text-signal-cyan transition hover:border-signal-cyan/50 hover:bg-signal-cyan/[0.16]"
                onClick={() => setSettingsOpen(true)}
              >
                编辑配置
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.45] px-4 py-3 text-sm text-porcelain-100/60">
              正在恢复已保存配置，工作台和配置中心会继续共用同一套接入设置。
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-porcelain-100/60">
                接入配置暂时没有读取成功。你可以先重试，或直接打开编辑配置重新确认当前设置。
              </p>
              <ErrorNotice error={error} />
            </div>
          ) : null}

          {hasManagedProviderGap ? (
            <div className="mt-6 rounded-[1.35rem] border border-dashed border-amber-300/20 bg-amber-300/[0.08] p-4 text-sm text-amber-100/85">
              当前选择的是平台默认接入，但还没有可用的公共
              Provider。请联系管理员补齐，或改用自定义接入。
            </div>
          ) : null}

          {missingModel ? (
            <div className="mt-6 rounded-[1.35rem] border border-dashed border-porcelain-50/15 bg-ink-950/[0.32] p-4 text-sm text-porcelain-100/70">
              当前还没有选定模型。工作台开始生成前，请先在“编辑配置”里补齐当前模型。
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="progress-card">
              <p className="text-sm text-porcelain-100/60">接入方式</p>
              <p className="mt-2 text-lg font-semibold text-porcelain-50">{providerModeLabel}</p>
              <p className="mt-2 text-xs text-porcelain-100/45">{connectionLabel}</p>
            </article>
            <article className="progress-card">
              <p className="text-sm text-porcelain-100/60">当前 Provider</p>
              <p className="mt-2 text-lg font-semibold text-porcelain-50">{providerDisplayName}</p>
              <p className="mt-2 text-xs text-porcelain-100/45">{providerStatusLabel}</p>
            </article>
            <article className="progress-card">
              <p className="text-sm text-porcelain-100/60">当前模型</p>
              <p className="mt-2 text-lg font-semibold text-porcelain-50">
                {config.model || '未选择'}
              </p>
              <p className="mt-2 text-xs text-porcelain-100/45">{modelStatusLabel}</p>
            </article>
            <article className="progress-card">
              <p className="text-sm text-porcelain-100/60">凭证状态</p>
              <p className="mt-2 text-lg font-semibold text-porcelain-50">
                {credentialStatusLabel}
              </p>
              <p className="mt-2 text-xs text-porcelain-100/45">
                {config.mode === 'managed' ? '敏感信息由平台托管' : 'API Key 按账号保存到后端'}
              </p>
            </article>
          </div>

          <article className="mt-6 progress-card">
            <h2 className="text-lg font-semibold text-porcelain-50">工作台当前会这样显示和执行</h2>
            <p className="mt-2 text-sm text-porcelain-100/60">
              下面这些字段和工作台顶部状态提示使用同一套命名，方便你在两处快速对照当前接入情况。
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-porcelain-100/40">
                  工作台顶部提示
                </p>
                <p className="mt-2 text-sm text-porcelain-100/75">{connectionLabel}</p>
                <p className="mt-2 text-sm text-porcelain-100/75">{providerStatusLabel}</p>
                <p className="mt-2 text-sm text-porcelain-100/75">{modelStatusLabel}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-porcelain-100/40">
                  权限范围
                </p>
                <p className="mt-2 text-sm text-porcelain-100/75">
                  平台默认接入：{providerPolicy.allowManagedProviders ? '允许' : '禁止'} /
                  自定义接入：{providerPolicy.allowCustomProvider ? '允许' : '禁止'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-porcelain-100/40">
                  {config.mode === 'managed' ? '可选平台默认接入' : '自定义 API URL'}
                </p>
                <p className="mt-2 break-all text-sm text-porcelain-100/75">
                  {config.mode === 'managed'
                    ? `${managedProviders.length} 个可选 Provider`
                    : config.apiUrl || '留空后走服务端默认上游'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-porcelain-100/40">
                  代理生成地址
                </p>
                <p className="mt-2 break-all text-sm text-porcelain-100/75">{requestUrl}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-porcelain-100/40">
                  代理编辑地址
                </p>
                <p className="mt-2 break-all text-sm text-porcelain-100/75">{editRequestUrl}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-porcelain-100/40">
                  当前 Provider 名称
                </p>
                <p className="mt-2 break-all text-sm text-porcelain-100/75">
                  {providerDisplayName}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-porcelain-100/40">
                  当前模型值
                </p>
                <p className="mt-2 text-sm text-porcelain-100/75">{config.model || '未选择'}</p>
              </div>
            </div>
          </article>
        </section>
      </main>

      <ProviderModal
        open={settingsOpen}
        config={config}
        draftConfig={draftConfig}
        managedProviders={managedProviders}
        providerPolicy={providerPolicy}
        onDraftConfigChange={setDraftConfig}
        onSave={() => void saveProviderConfig()}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  )
}
