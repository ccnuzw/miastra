import { useState } from 'react'
import { Copy, Eye, Layers3, Sparkles } from 'lucide-react'
import type { StyleToken } from '@/features/studio/studio.types'
import type { StudioProPromptSection } from './studioPro.utils'

type StudioProPromptPanelProps = {
  workspacePrompt: string
  finalPrompt: string
  referenceCount: number
  selectedStyleTokens: StyleToken[]
  promptSections: StudioProPromptSection[]
  finalPromptLength: number
  workspacePromptLength: number
  enabledSectionCount: number
}

export function StudioProPromptPanel({
  workspacePrompt,
  finalPrompt,
  referenceCount,
  selectedStyleTokens,
  promptSections,
  finalPromptLength,
  workspacePromptLength,
  enabledSectionCount,
}: StudioProPromptPanelProps) {
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null)

  async function handleCopy(target: string, text: string) {
    if (!text.trim()) return
    await navigator.clipboard.writeText(text)
    setCopiedTarget(target)
    window.setTimeout(() => setCopiedTarget((current) => (current === target ? null : current)), 1600)
  }

  return (
    <section className="studio-pro-panel">
      <div className="studio-pro-panel-header">
        <div>
          <p className="eyebrow">Pro Prompt</p>
          <h4 className="studio-pro-panel-title">最终 Prompt 预览</h4>
        </div>
        <div className="studio-pro-pill-group">
          <span className="status-pill">参考图 {referenceCount} 张</span>
          <span className="status-pill">工作区 {workspacePromptLength} 字</span>
          <span className="status-pill">链路 {enabledSectionCount}/4 段</span>
          <button
            type="button"
            className="settings-button"
            onClick={() => void handleCopy('final', finalPrompt)}
            disabled={!finalPrompt.trim()}
          >
            <Copy className="h-4 w-4" />
            {copiedTarget === 'final' ? '已复制' : '复制最终 Prompt'}
          </button>
        </div>
      </div>

      <p className="studio-pro-panel-copy">
        这里把工作区描述、风格补充、细节控制和 Negative Prompt 拆开展示，方便你对照
        最终请求是如何组装出来的。
      </p>

      <div className="studio-pro-chain-grid">
        {promptSections.map((section) => (
          <article key={section.id} className="studio-pro-chain-card">
            <div className="studio-pro-chain-card-header">
              <span className="studio-pro-metric-label">{section.label}</span>
              <button
                type="button"
                className="settings-button"
                onClick={() => void handleCopy(section.id, section.value)}
                disabled={!section.value.trim()}
              >
                <Copy className="h-4 w-4" />
                {copiedTarget === section.id ? '已复制' : '复制'}
              </button>
            </div>
            <p className="studio-pro-chain-hint">{section.hint}</p>
            <div
              className={`studio-pro-chain-value ${
                section.value.trim() ? '' : 'studio-pro-chain-value-muted'
              }`}
            >
              {section.value.trim() || section.emptyText}
            </div>
          </article>
        ))}
      </div>

      <div className="studio-pro-prompt-preview">
        <div className="studio-pro-inline-label">
          <Eye className="h-4 w-4" />
          最终 Prompt
        </div>
        <textarea
          value={finalPrompt}
          readOnly
          rows={8}
          className="studio-pro-readonly-area"
          placeholder="先输入需求，专业版会在这里展示最终 Prompt。"
        />
        <div className="studio-pro-action-row">
          <span className="studio-pro-support-copy">当前请求会以这段文本作为主 Prompt 发给模型。</span>
          <div className="studio-pro-pill-group">
            <span className="status-pill">最终长度 {finalPromptLength} 字</span>
            <button
              type="button"
              className="settings-button"
              onClick={() => void handleCopy('workspace', workspacePrompt)}
              disabled={!workspacePrompt.trim()}
            >
              <Copy className="h-4 w-4" />
              {copiedTarget === 'workspace' ? '已复制' : '复制工作区 Prompt'}
            </button>
          </div>
        </div>
      </div>

      <div className="studio-pro-meta-grid">
        <div className="studio-pro-metric-card">
          <span className="studio-pro-metric-label">
            <Sparkles className="h-4 w-4" />
            组装说明
          </span>
          <p className="studio-pro-metric-copy">
            先保留工作区原始意图，再叠加风格 token 和细节控制；Negative Prompt 保持独立，
            方便你按结果快速复制、删减或替换。
          </p>
        </div>
        <div className="studio-pro-metric-card">
          <span className="studio-pro-metric-label">
            <Layers3 className="h-4 w-4" />
            风格 token
          </span>
          {selectedStyleTokens.length ? (
            <div className="studio-pro-tag-wrap">
              {selectedStyleTokens.map((token) => (
                <span key={token.id} className="studio-pro-tag">
                  {token.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="studio-pro-metric-copy">当前未附加常用风格 token。</p>
          )}
        </div>
      </div>
    </section>
  )
}
