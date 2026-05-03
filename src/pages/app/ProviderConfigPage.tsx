import { ProviderModal } from '@/features/provider/ProviderModal'
import { useProviderConfig } from '@/features/provider/useProviderConfig'

export function ProviderConfigPage() {
  const {
    config,
    draftConfig,
    settingsOpen,
    requestUrl,
    editRequestUrl,
    activePreset,
    setDraftConfig,
    setSettingsOpen,
    handleProviderChange,
    saveProviderConfig,
  } = useProviderConfig()

  return (
    <>
      <main className="mx-auto flex min-h-screen w-full max-w-screen-xl px-4 pb-10 pt-32 md:px-8">
        <section className="panel-shell w-full">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Provider</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">Provider / Model 配置中心</h1>
              <p className="mt-2 text-sm text-porcelain-100/60">统一查看和编辑当前账号的生图 Provider、Model、API URL 与 API Key。</p>
            </div>
            <button type="button" className="rounded-full border border-signal-cyan/20 bg-signal-cyan/[0.08] px-4 py-2 text-sm font-semibold text-signal-cyan transition hover:border-signal-cyan/50 hover:bg-signal-cyan/[0.16]" onClick={() => setSettingsOpen(true)}>编辑配置</button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="progress-card">
              <p className="text-sm text-porcelain-100/60">Provider</p>
              <p className="mt-2 text-lg font-semibold text-porcelain-50">{activePreset.name}</p>
            </article>
            <article className="progress-card">
              <p className="text-sm text-porcelain-100/60">Model</p>
              <p className="mt-2 text-lg font-semibold text-porcelain-50">{config.model || '未配置'}</p>
            </article>
            <article className="progress-card">
              <p className="text-sm text-porcelain-100/60">生成地址</p>
              <p className="mt-2 break-all text-sm text-porcelain-100/75">{requestUrl}</p>
            </article>
            <article className="progress-card">
              <p className="text-sm text-porcelain-100/60">编辑地址</p>
              <p className="mt-2 break-all text-sm text-porcelain-100/75">{editRequestUrl}</p>
            </article>
          </div>

          <article className="mt-6 progress-card">
            <h2 className="text-lg font-semibold text-porcelain-50">当前配置</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-porcelain-100/40">Provider ID</p>
                <p className="mt-2 text-sm text-porcelain-100/75">{config.providerId}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-porcelain-100/40">API URL</p>
                <p className="mt-2 break-all text-sm text-porcelain-100/75">{config.apiUrl || '留空使用代理'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-porcelain-100/40">Model</p>
                <p className="mt-2 text-sm text-porcelain-100/75">{config.model}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-porcelain-100/40">API Key</p>
                <p className="mt-2 text-sm text-porcelain-100/75">{config.apiKey ? '已配置' : '未配置'}</p>
              </div>
            </div>
          </article>
        </section>
      </main>

      <ProviderModal
        open={settingsOpen}
        draftConfig={draftConfig}
        onDraftConfigChange={setDraftConfig}
        onProviderChange={handleProviderChange}
        onSave={() => void saveProviderConfig()}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  )
}
