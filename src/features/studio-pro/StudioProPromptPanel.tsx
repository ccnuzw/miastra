import { useState } from 'react'
import { Copy, Eye, Layers3 } from 'lucide-react'
import type { StyleToken } from '@/features/studio/studio.types'

type StudioProPromptPanelProps = {
  finalPrompt: string
  negativePrompt: string
  referenceCount: number
  selectedStyleTokens: StyleToken[]
}

export function StudioProPromptPanel({
  finalPrompt,
  negativePrompt,
  referenceCount,
  selectedStyleTokens,
}: StudioProPromptPanelProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopyPrompt() {
    if (!finalPrompt.trim()) return
    await navigator.clipboard.writeText(finalPrompt)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
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
          <button
            type="button"
            className="settings-button"
            onClick={() => void handleCopyPrompt()}
            disabled={!finalPrompt.trim()}
          >
            <Copy className="h-4 w-4" />
            {copied ? '已复制' : '复制 Prompt'}
          </button>
        </div>
      </div>

      <p className="studio-pro-panel-copy">
        这里展示当前任务实际会带上的 Prompt 组合结果，包含风格 token、细节强度和
        Negative Prompt。
      </p>

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
      </div>

      <div className="studio-pro-meta-grid">
        <div className="studio-pro-metric-card">
          <span className="studio-pro-metric-label">Negative Prompt</span>
          <p className="studio-pro-metric-copy">
            {negativePrompt.trim() || '当前未设置 Negative Prompt'}
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
