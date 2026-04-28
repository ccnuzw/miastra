import { KeyRound, Lock, RadioTower, Save, X } from 'lucide-react'
import type { ProviderConfig } from './provider.types'
import { providerPresets } from './provider.constants'
import { editEndpoint, generationEndpoint } from '@/features/generation/generation.constants'
import { resolveImageApiUrl } from '@/shared/utils/url'

type ProviderModalProps = {
  open: boolean
  draftConfig: ProviderConfig
  onDraftConfigChange: (config: ProviderConfig) => void
  onProviderChange: (providerId: string) => void
  onSave: () => void
  onClose: () => void
}

export function ProviderModal({ open, draftConfig, onDraftConfigChange, onProviderChange, onSave, onClose }: ProviderModalProps) {
  if (!open) return null

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Provider 配置">
      <div className="modal-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Provider Settings</p>
            <h2 className="mt-2 font-display text-4xl leading-none">配置生图服务</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-porcelain-100/[0.6]">
              Provider 是辅助设置，只负责连接后端。配置会保存到浏览器 `localStorage`，下次打开自动恢复。
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
              onClick={() => onProviderChange(provider.id)}
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
              onChange={(event) => onDraftConfigChange({ ...draftConfig, apiUrl: event.target.value })}
              className="input-shell"
              placeholder="https://your-image-api.example.com"
            />
          </label>
          <label className="field-block">
            <span className="field-label">Model</span>
            <input value={draftConfig.model} onChange={(event) => onDraftConfigChange({ ...draftConfig, model: event.target.value })} className="input-shell" />
          </label>
          <label className="field-block">
            <span className="field-label">
              <KeyRound className="h-4 w-4" />
              API Key
            </span>
            <input
              value={draftConfig.apiKey}
              onChange={(event) => onDraftConfigChange({ ...draftConfig, apiKey: event.target.value })}
              className="input-shell"
              placeholder="sk-... 或 sub2api key"
              type="password"
            />
          </label>
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-signal-cyan/20 bg-signal-cyan/[0.055] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-cyan">
            <Lock className="h-4 w-4" />
            本地持久化说明
          </div>
          <p className="mt-2 text-xs leading-5 text-porcelain-100/[0.55]">
            配置会保存到当前浏览器的 localStorage。若部署给多人使用，建议改为后端代理保存，不要把长期密钥写死在前端代码里。
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="truncate font-mono text-xs text-porcelain-100/[0.52]">{`生成：${resolveImageApiUrl(draftConfig.apiUrl, generationEndpoint)} · 编辑：${resolveImageApiUrl(draftConfig.apiUrl, editEndpoint)}`}</p>
          <button type="button" onClick={onSave} className="generate-button">
            <Save className="h-5 w-5" />
            保存配置
          </button>
        </div>
      </div>
    </div>
  )
}
