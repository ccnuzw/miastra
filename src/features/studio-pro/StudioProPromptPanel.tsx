import { useState } from 'react'
import { Copy, Eye, Layers3, Sparkles } from 'lucide-react'
import type { StyleToken } from '@/features/studio/studio.types'
import type {
  StudioProPromptSection,
  StudioProReplayContext,
  StudioProTemplateContext,
} from './studioPro.utils'

type StudioProPromptPanelProps = {
  workspacePrompt: string
  finalPrompt: string
  referenceCount: number
  selectedStyleTokens: StyleToken[]
  promptSections: StudioProPromptSection[]
  finalPromptLength: number
  workspacePromptLength: number
  enabledSectionCount: number
  templateContext?: StudioProTemplateContext | null
  replayContext?: StudioProReplayContext | null
  onApplyTemplatePrompt?: () => void
  onApplyReplayPrompt?: () => void
  onResetPromptToWorkspace?: () => void
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
  templateContext = null,
  replayContext = null,
  onApplyTemplatePrompt,
  onApplyReplayPrompt,
  onResetPromptToWorkspace,
}: StudioProPromptPanelProps) {
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null)
  const hasTemplateContext = Boolean(templateContext)
  const hasReplayContext = Boolean(replayContext)

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

      <div className="studio-pro-console-strip">
        <article className={`studio-pro-console-card ${hasTemplateContext ? 'studio-pro-emphasis-card' : ''}`}>
          <span className="studio-pro-metric-label">模板基线</span>
          <strong className="studio-pro-metric-value">
            {templateContext ? templateContext.title : '当前未绑定模板'}
          </strong>
          <p className="studio-pro-metric-copy">
            {templateContext
              ? `模板字段会先约束工作区 Prompt 的主体、上下文、风格和输出重点，再进入最终组装。`
              : '现在以自由输入为基线；从模板进入时，这里会固定显示结构字段对 Prompt 的控制基线。'}
          </p>
          <div className="studio-pro-action-cluster">
            <button
              type="button"
              className="settings-button"
              onClick={onApplyTemplatePrompt}
              disabled={!templateContext || !onApplyTemplatePrompt}
            >
              以模板字段重对齐
            </button>
          </div>
        </article>
        <article className={`studio-pro-console-card ${hasReplayContext ? 'studio-pro-emphasis-card' : ''}`}>
          <span className="studio-pro-metric-label">来源 Prompt</span>
          <strong className="studio-pro-metric-value">
            {replayContext ? `快照 ${replayContext.snapshotId}` : '当前未挂接来源快照'}
          </strong>
          <p className="studio-pro-metric-copy">
            {replayContext
              ? '当前结果返回控制区后，可以直接把来源请求重新带回工作区，作为重跑或派生起点。'
              : '从作品或任务回流后，这里会提供“回到来源 Prompt”入口，避免手动摘录上一版描述。'}
          </p>
          <div className="studio-pro-action-cluster">
            <button
              type="button"
              className="settings-button"
              onClick={onApplyReplayPrompt}
              disabled={!replayContext || !onApplyReplayPrompt}
            >
              恢复来源 Prompt
            </button>
            <button
              type="button"
              className="settings-button"
              onClick={onResetPromptToWorkspace}
              disabled={!workspacePrompt.trim() || !onResetPromptToWorkspace}
            >
              回到当前工作区
            </button>
          </div>
        </article>
      </div>

      <article
        className={`studio-pro-metric-card mt-4 ${templateContext ? 'studio-pro-emphasis-card' : ''}`}
      >
        <span className="studio-pro-metric-label">结构模板上下文</span>
        <strong className="studio-pro-metric-value">
          {templateContext ? templateContext.title : '当前按自由输入基线组装'}
        </strong>
        {templateContext ? (
          <>
            <p className="studio-pro-metric-copy">
              {templateContext.sourceLabel} · {templateContext.familyLabel} · {templateContext.sceneLabel}
            </p>
            <p className="studio-pro-metric-copy">
              {templateContext.structureStatusLabel}。{templateContext.sceneDescription}
            </p>
            <p className="studio-pro-metric-copy">
              默认参数：{templateContext.defaultSettingsLabel}。当前优先关注字段：
              {templateContext.structureFields.join(' / ')}。
            </p>
            <div className="studio-pro-tag-wrap">
              {templateContext.useCases.map((item) => (
                <span key={item} className="studio-pro-tag">
                  {item}
                </span>
              ))}
            </div>
            <p className="studio-pro-metric-copy">
              {templateContext.recommendedLabel}。{templateContext.recommendedReason}
            </p>
            {templateContext.structureSummary.slice(0, 3).map((item) => (
              <p key={item.id} className="studio-pro-metric-copy">
                {item.label}：{item.value}
              </p>
            ))}
            <p className="studio-pro-metric-copy">{templateContext.metadataHint}</p>
          </>
        ) : (
          <p className="studio-pro-metric-copy">
            当前还没有挂接结构模板，专业版会直接把工作区描述当作本轮 Prompt 基线。后续从模板页或模板库进入时，这里会补上字段摘要和推荐承接方式。
          </p>
        )}
      </article>

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
          <span className="studio-pro-support-copy">
            当前请求会以这段文本作为主 Prompt 发给模型。
            {hasReplayContext
              ? ' 如果先恢复来源 Prompt 再调整当前字段，本轮会更接近同基线重跑。'
              : hasTemplateContext
                ? ' 如果先按模板字段重对齐，再改局部描述，后续复用会更稳定。'
                : ''}
          </span>
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
