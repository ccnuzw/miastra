import { useState } from 'react'
import { Copy, Eye, Layers3, Sparkles } from 'lucide-react'
import type { StyleToken } from '@/features/studio/studio.types'
import type {
  StudioProPromptSection,
  StudioProReplayContext,
  StudioProTemplateContext,
} from './studioPro.utils'
import {
  buildStudioProPromptDecision,
  buildStudioProPromptFieldAlignment,
  buildStudioProTextComparison,
  truncateStudioProText,
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
  onResetPromptToWorkspace?: (value: string) => void
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
  const [promptDraftBeforeReset, setPromptDraftBeforeReset] = useState<string | null>(null)
  const hasTemplateContext = Boolean(templateContext)
  const hasReplayContext = Boolean(replayContext)
  const fieldAlignment = buildStudioProPromptFieldAlignment(templateContext, promptSections)
  const workspaceBaseline = buildStudioProTextComparison(
    workspacePrompt,
    replayContext?.sourceWorkspacePrompt ?? replayContext?.requestPrompt ?? '',
  )
  const finalPromptBaseline = buildStudioProTextComparison(finalPrompt, replayContext?.requestPrompt ?? '')
  const promptDecision = buildStudioProPromptDecision({
    templateContext,
    replayContext,
    fieldAlignment,
    workspaceBaseline,
    finalPromptBaseline,
    workspacePromptLength,
  })
  const replayReferenceStatus =
    replayContext && replayContext.expectedReferenceCount > 0
      ? `参考图恢复 ${replayContext.restoredReferenceCount}/${replayContext.expectedReferenceCount} 张`
      : replayContext?.referenceSummaryLabel ?? '这一版没有参考图依赖'
  const hasPromptRecoveryGap = !workspacePrompt.trim() && (hasTemplateContext || hasReplayContext)
  const hasReplayReferenceGap = Boolean(
    replayContext &&
      !replayContext.hasCompleteReferenceRestore &&
      replayContext.expectedReferenceCount > 0,
  )

  function getDecisionPillClass(state: typeof promptDecision.state) {
    switch (state) {
      case 'rerun':
        return 'border-signal-cyan/30 bg-signal-cyan/[0.12] text-signal-cyan'
      case 'calibrate':
        return 'border-amber-300/25 bg-amber-300/[0.12] text-amber-200'
      case 'branch':
        return 'border-rose-300/25 bg-rose-300/[0.12] text-rose-200'
      default:
        return 'border-porcelain-50/10 bg-porcelain-50/[0.06] text-porcelain-100/[0.55]'
    }
  }

  async function handleCopy(target: string, text: string) {
    if (!text.trim()) return
    await navigator.clipboard.writeText(text)
    setCopiedTarget(target)
    window.setTimeout(() => setCopiedTarget((current) => (current === target ? null : current)), 1600)
  }

  function handleApplyTemplateBaseline() {
    if (!onApplyTemplatePrompt) return
    setPromptDraftBeforeReset(workspacePrompt)
    onApplyTemplatePrompt()
  }

  function handleApplyReplayBaseline() {
    if (!onApplyReplayPrompt) return
    setPromptDraftBeforeReset(workspacePrompt)
    onApplyReplayPrompt()
  }

  function handleRestoreDraft() {
    if (!promptDraftBeforeReset?.trim() || !onResetPromptToWorkspace) return
    onResetPromptToWorkspace(promptDraftBeforeReset)
    setPromptDraftBeforeReset(null)
  }

  return (
    <section className="studio-pro-panel">
      <div className="studio-pro-panel-header">
        <div>
          <p className="eyebrow">Pro Prompt</p>
          <h4 className="studio-pro-panel-title">先校准 Prompt，再看最终请求</h4>
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
        先确认工作区是否仍贴着来源版，再看字段落点和最终 Prompt，这样更容易决定是继续小改还是直接派生。
      </p>
      {hasPromptRecoveryGap ? (
        <div className="mt-4 rounded-[1.2rem] border border-signal-amber/20 bg-signal-amber/[0.08] px-4 py-3 text-sm text-porcelain-100/78">
          当前工作区还是空的。验收这一链路时，建议先用
          {hasReplayContext ? '「恢复来源 Prompt」' : '「以模板字段重对齐」'}
          建立可比较基线，再继续判断是重跑、校准还是分叉。
        </div>
      ) : null}
      {!hasPromptRecoveryGap && hasReplayReferenceGap ? (
        <div className="mt-4 rounded-[1.2rem] border border-porcelain-50/10 bg-ink-950/[0.38] px-4 py-3 text-sm text-porcelain-100/70">
          {replayReferenceStatus}。Prompt 可以先继续校准，但如果要严格复现来源链路，仍建议先补齐参考图。
        </div>
      ) : null}

      <article
        className={`mt-4 rounded-[1.35rem] border p-4 ${
          promptDecision.state === 'rerun'
            ? 'border-signal-cyan/25 bg-signal-cyan/[0.08]'
            : promptDecision.state === 'calibrate'
              ? 'border-amber-300/20 bg-amber-300/[0.08]'
              : promptDecision.state === 'branch'
                ? 'border-rose-300/20 bg-rose-300/[0.08]'
                : 'border-porcelain-50/10 bg-ink-950/[0.48]'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="studio-pro-metric-label">当前 Prompt 决策</span>
            <strong className="studio-pro-metric-value">{promptDecision.title}</strong>
          </div>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getDecisionPillClass(promptDecision.state)}`}>
            {promptDecision.stateLabel}
          </span>
        </div>
        <p className="studio-pro-metric-copy">{promptDecision.summary}</p>
        <p className="studio-pro-metric-copy">{promptDecision.recommendation}</p>
        {replayContext ? (
          <>
            <p className="studio-pro-metric-copy">版本建议：{replayContext.recommendedActionLabel}</p>
            <p className="studio-pro-metric-copy">{replayContext.decisionSummary}</p>
            <p className="studio-pro-metric-copy">{replayContext.actionDecisionReason}</p>
          </>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="status-pill">主动作：{promptDecision.primaryAction}</span>
          {promptDecision.secondaryAction ? (
            <span className="status-pill">{promptDecision.secondaryAction}</span>
          ) : null}
        </div>
        {promptDecision.focusItems.length ? (
          <div className="mt-4 grid gap-2 xl:grid-cols-3">
            {promptDecision.focusItems.map((item) => (
              <div
                key={item}
                className="rounded-[1rem] border border-porcelain-50/[0.08] bg-ink-950/[0.52] px-3 py-3 text-sm leading-6 text-porcelain-100/[0.68]"
              >
                {item}
              </div>
            ))}
          </div>
        ) : null}
      </article>

      <div className="studio-pro-console-strip">
        <article className={`studio-pro-console-card ${hasTemplateContext ? 'studio-pro-emphasis-card' : ''}`}>
          <span className="studio-pro-metric-label">模板基线</span>
          <strong className="studio-pro-metric-value">
            {templateContext ? templateContext.title : '当前未绑定模板'}
          </strong>
          <p className="studio-pro-metric-copy">
            {templateContext
              ? `模板字段会先约束工作区 Prompt，再决定哪些内容需要沉到风格、细节或参数层。`
              : '现在以自由输入为基线；从模板进入时，这里会固定显示结构字段如何先接管 Prompt。'}
          </p>
          <div className="studio-pro-action-cluster">
            <button
              type="button"
              className="settings-button"
              onClick={handleApplyTemplateBaseline}
              disabled={!templateContext || !onApplyTemplatePrompt}
            >
              以模板字段重对齐
            </button>
          </div>
        </article>
        <article className={`studio-pro-console-card ${hasReplayContext ? 'studio-pro-emphasis-card' : ''}`}>
          <span className="studio-pro-metric-label">来源版 Prompt</span>
          <strong className="studio-pro-metric-value">
            {replayContext ? `快照 ${replayContext.snapshotId}` : '当前未挂接来源快照'}
          </strong>
          <p className="studio-pro-metric-copy">
            {replayContext
              ? '当前结果返回控制区后，可以先恢复来源 Prompt，再判断当前改动是同版重跑还是新的目标版分支。'
              : '从作品或任务回流后，这里会提供“回到来源 Prompt”入口，避免手动摘录上一版描述。'}
          </p>
          {replayContext ? (
            <p className="studio-pro-metric-copy">{replayReferenceStatus}</p>
          ) : null}
          {replayContext ? (
            <p className="studio-pro-metric-copy">
              动作建议：{replayContext.recommendedActionLabel}。{replayContext.decisionSummary}
            </p>
          ) : null}
          {replayContext?.deltaHeadline ? (
            <p className="studio-pro-metric-copy">{replayContext.deltaHeadline}</p>
          ) : null}
          {replayContext?.parentDeltaLabel ? (
            <p className="studio-pro-metric-copy">{replayContext.parentDeltaLabel}</p>
          ) : null}
          <div className="studio-pro-action-cluster">
            <button
              type="button"
              className="settings-button"
              onClick={handleApplyReplayBaseline}
              disabled={!replayContext || !onApplyReplayPrompt}
            >
              恢复来源 Prompt
            </button>
            <button
              type="button"
              className="settings-button"
              onClick={handleRestoreDraft}
              disabled={!promptDraftBeforeReset?.trim() || !onResetPromptToWorkspace}
            >
              回到当前工作区
            </button>
          </div>
        </article>
      </div>

      <div className="studio-pro-meta-grid">
        <article className={`studio-pro-metric-card ${hasReplayContext ? 'studio-pro-emphasis-card' : ''}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="studio-pro-metric-label">来源版 vs 当前版</span>
              <strong className="studio-pro-metric-value">{workspaceBaseline.summary}</strong>
            </div>
            <span
              className={`studio-pro-compare-pill ${
                workspaceBaseline.status === 'aligned'
                  ? 'studio-pro-compare-pill-aligned'
                  : workspaceBaseline.status === 'shifted'
                    ? 'studio-pro-compare-pill-shifted'
                    : 'studio-pro-compare-pill-missing'
              }`}
            >
              {workspaceBaseline.statusLabel}
            </span>
          </div>
          <p className="studio-pro-metric-copy">
            {workspaceBaseline.deltaLabel}。{workspaceBaseline.suggestion}
          </p>
          <p className="studio-pro-metric-copy">建议动作：{promptDecision.primaryAction}</p>
          {replayContext?.directLinks.length ? (
            <div className="studio-pro-compare-grid">
              {replayContext.directLinks
                .filter((item) => item.id === 'template' || item.id === 'guided')
                .map((item) => (
                  <article key={`direct:${item.id}`} className="studio-pro-compare-card">
                    <span className="studio-pro-metric-label">{item.label}</span>
                    <p className="studio-pro-metric-copy">{item.summary}</p>
                  </article>
                ))}
            </div>
          ) : null}
          {replayContext?.deltaItems.length ? (
            <div className="studio-pro-compare-grid">
              {replayContext.deltaItems
                .filter((item) => item.id === 'prompt' || item.id === 'guided' || item.id === 'structure')
                .map((item) => (
                  <article key={item.id} className="studio-pro-compare-card">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="studio-pro-metric-label">{item.label}</span>
                      <span className="studio-pro-compare-pill studio-pro-compare-pill-shifted">
                        {item.toneLabel}
                      </span>
                    </div>
                    <p className="studio-pro-metric-copy">{item.summary}</p>
                    {item.detail ? <p className="studio-pro-metric-copy">{item.detail}</p> : null}
                  </article>
                ))}
            </div>
          ) : null}
          <div className="studio-pro-compare-grid">
            <article className="studio-pro-compare-card">
              <span className="studio-pro-metric-label">
                {replayContext?.sourceWorkspacePrompt ? '来源工作区' : '来源请求'}
              </span>
              <strong className="studio-pro-metric-value">
                {hasReplayContext ? `快照 ${replayContext?.snapshotId}` : '未接入'}
              </strong>
              <p className="studio-pro-metric-copy">
                {truncateStudioProText(
                  replayContext?.sourceWorkspacePrompt ?? replayContext?.requestPrompt ?? '',
                  120,
                ) || '从作品或任务恢复一版后，这里会固定显示来源文本基线。'}
              </p>
            </article>
            <article className="studio-pro-compare-card">
              <span className="studio-pro-metric-label">当前工作区</span>
              <strong className="studio-pro-metric-value">
                {workspacePrompt.trim() ? `${workspacePromptLength} 字` : '等待输入'}
              </strong>
              <p className="studio-pro-metric-copy">
                {truncateStudioProText(workspacePrompt, 120) || '先补一句主体需求，当前版基线就会固定在这里。'}
              </p>
            </article>
          </div>
        </article>

        <article className={`studio-pro-metric-card ${hasReplayContext ? 'studio-pro-emphasis-card' : ''}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="studio-pro-metric-label">当前版 vs 目标请求</span>
              <strong className="studio-pro-metric-value">{finalPromptBaseline.summary}</strong>
            </div>
            <span
              className={`studio-pro-compare-pill ${
                finalPromptBaseline.status === 'aligned'
                  ? 'studio-pro-compare-pill-aligned'
                  : finalPromptBaseline.status === 'shifted'
                    ? 'studio-pro-compare-pill-shifted'
                    : 'studio-pro-compare-pill-missing'
              }`}
            >
              {finalPromptBaseline.statusLabel}
            </span>
          </div>
          <p className="studio-pro-metric-copy">
            {finalPromptBaseline.deltaLabel}。{finalPromptBaseline.suggestion}
          </p>
          <p className="studio-pro-metric-copy">
            判断基准：如果这里已经明显偏离来源请求，这一轮通常更适合直接派生，而不是继续当作同版重跑。
          </p>
          <p className="studio-pro-metric-copy">
            {hasReplayContext
              ? '最终 Prompt 是目标版真正发给模型的请求，可直接判断这一轮究竟是复现、校准还是分叉。'
              : '当前还没有来源请求做参照，这里先帮助你固定最终 Prompt 的组装结果。'}
          </p>
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
        {replayContext ? (
          <>
            <p className="studio-pro-metric-copy">
              来源链路：{replayContext.sourceKindLabel} · {replayContext.sceneLabel ?? replayContext.scene?.label ?? '未记录场景'}
            </p>
            <p className="studio-pro-metric-copy">{replayReferenceStatus}</p>
            <p className="studio-pro-metric-copy">{replayContext.deltaHeadline}</p>
            <p className="studio-pro-metric-copy">{replayContext.sourceDeltaLabel}</p>
            {replayContext.quickDeltaLabels.length ? (
              <div className="studio-pro-tag-wrap">
                {replayContext.quickDeltaLabels.map((label) => (
                  <span key={label} className="studio-pro-tag">
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="studio-pro-metric-copy">{replayContext.nodePathLabel}</p>
          </>
        ) : null}
      </article>

      <article className={`studio-pro-metric-card mt-4 ${hasTemplateContext ? 'studio-pro-emphasis-card' : ''}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="studio-pro-metric-label">结构字段落点</span>
            <strong className="studio-pro-metric-value">
              {hasTemplateContext ? '字段到 Prompt / 参数的承接关系' : '等待模板字段接入'}
            </strong>
          </div>
          {hasTemplateContext ? (
            <span className="studio-pro-compare-pill studio-pro-compare-pill-aligned">
              {fieldAlignment.length} 个字段
            </span>
          ) : null}
        </div>
        <p className="studio-pro-metric-copy">
          {hasTemplateContext
            ? '这里固定告诉你每个结构字段主要落到哪一段，方便你按字段做对照和校准。'
            : '从模板进入专业版后，这里会显示结构字段对应的 Prompt / 参数落点。'}
        </p>
        {hasTemplateContext ? (
          <div className="studio-pro-compare-grid">
            {fieldAlignment.map((item) => (
              <article key={item.id} className="studio-pro-compare-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="studio-pro-metric-label">{item.label}</span>
                  <span
                    className={`studio-pro-compare-pill ${
                      item.status === 'aligned'
                        ? 'studio-pro-compare-pill-aligned'
                        : item.status === 'shifted'
                          ? 'studio-pro-compare-pill-shifted'
                          : 'studio-pro-compare-pill-missing'
                    }`}
                  >
                    {item.statusLabel}
                  </span>
                </div>
                <strong className="studio-pro-metric-value">{item.promptAnchorLabel}</strong>
                <p className="studio-pro-metric-copy">
                  {item.groupLabel} · {item.value}
                </p>
                <p className="studio-pro-metric-copy">{item.hint}</p>
                <p className="studio-pro-metric-copy">下一步：{item.recommendedAction}</p>
              </article>
            ))}
          </div>
        ) : null}
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
