import { Crop, Images, Mountain, Palette, RotateCcw, Wand2 } from 'lucide-react'
import { useState } from 'react'
import {
  buildConsumerGuidedFlowSnapshotFromContext,
  findConsumerGuidedFlowById,
  findConsumerGuidedFlowByResultActionId,
  resolveConsumerGuidedFlowSelections,
} from '@/features/studio-home/consumerHomePresets'
import {
  getConsumerGuidedFlowSelectionMap,
  rebaseConsumerGuidedFlowSnapshot,
  type ConsumerGuidedFlowSnapshot,
} from '@/features/studio-consumer/consumerGuidedFlow'
import {
  getStudioFlowActionLabel,
  getStudioFlowScene,
  getStudioFlowSceneLabel,
} from '@/features/prompt-templates/studioFlowSemantic'
import { resolveGenerationContractFromWork } from '@/features/generation/generation.contract'
import {
  getWorkReplayReferenceSummary,
  getWorkReplayStatusText,
  getWorkVersionSourceSummary,
} from '@/features/works/workReplay'
import type { GalleryImage } from '@/features/works/works.types'
import { dispatchStudioConsumerIntent } from './consumerFlow.events'

type ConsumerResultActionsProps = {
  preview: GalleryImage
}

export const studioConsumerResultActionEvent = 'studio-consumer:result-action'

export type StudioConsumerResultActionDetail = {
  actionId: string
  actionTitle: string
  actionDescription: string
  sceneId: ConsumerGuidedFlowSnapshot['sceneId']
  scene: ReturnType<typeof getStudioFlowScene>
  sourceType: 'result-action'
  semanticActionId: 'continue-version' | 'retry-version' | 'branch-version'
  workflowKind: 'continue' | 'retry' | 'branch'
  workflowLabel: string
  preview: {
    id: string
    src: string
    title: string
    meta: string
  }
  submit: boolean
  nextStep: string
  guidedFlowSummary?: string
  loopRunLabel?: string
  loopHint?: string
}

function appendFollowupText(basePrompt: string, promptAppendix: string) {
  const trimmedBase = basePrompt.trim()
  const trimmedAppendix = promptAppendix.trim()
  if (!trimmedAppendix) return trimmedBase
  return trimmedBase ? `${trimmedBase}\n${trimmedAppendix}` : trimmedAppendix
}

const actionDefinitions = [
  {
    id: 'closer',
    title: '更像这一版',
    description: '沿着这张图的主体、光线和构图继续收紧，先回输入区确认后再试。',
    icon: Wand2,
    text: '请沿用这张结果图的主体、光线和构图，再生成一版更接近我想要的效果。',
    submit: false,
    semanticActionId: 'continue-version',
    workflowKind: 'continue',
    workflowLabel: '继续这一版',
    badge: '继续这一版',
  },
  {
    id: 'style',
    title: '换个风格',
    description: '保留主要内容不变，先把这张图带回去，再换一种更有感觉的表现方式。',
    icon: Palette,
    text: '请保留这张结果图的主要内容不变，换一种更有风格感的表现方式。',
    submit: false,
    semanticActionId: 'branch-version',
    workflowKind: 'branch',
    workflowLabel: '从这一版分叉',
    badge: '从这一版分叉',
  },
  {
    id: 'partial',
    title: '只改局部',
    description: '把当前结果带回输入区，只调整最需要修改的一小部分，其他内容尽量不动。',
    icon: Crop,
    text: '请只调整这张结果图里最需要修改的一小部分，其余内容尽量保持不变。',
    submit: false,
    semanticActionId: 'continue-version',
    workflowKind: 'continue',
    workflowLabel: '继续这一版',
    badge: '继续这一版',
  },
  {
    id: 'background',
    title: '主体不动，换背景',
    description: '把这张图当作基础图带回去，保留主体，只换一个更合适的环境。',
    icon: Mountain,
    text: '请保留这张结果图的主体不变，把背景换成更合适的环境，构图尽量自然。',
    submit: false,
    semanticActionId: 'branch-version',
    workflowKind: 'branch',
    workflowLabel: '从这一版分叉',
    badge: '从这一版分叉',
  },
  {
    id: 'more',
    title: '沿着这一版再做几张',
    description: '直接沿着这张图的方向继续生成几版相近方案，不用重新起步。',
    icon: Images,
    text: '请基于这张结果图再多生成几张相近方案，保留主体和整体方向。',
    submit: true,
    semanticActionId: 'continue-version',
    workflowKind: 'continue',
    workflowLabel: '继续这一版',
    badge: '继续这一版',
  },
  {
    id: 'retry',
    title: '重试这一版',
    description: '保留这张图和当前方向，把它带回输入区补一句后重试，适合修正不稳定或不清楚的结果。',
    icon: RotateCcw,
    text: '请保留这张结果图的主体和核心方向，再试一版更稳定、更清楚的结果。',
    submit: false,
    semanticActionId: 'retry-version',
    workflowKind: 'retry',
    workflowLabel: '重试这一版',
    badge: '重试这一版',
  },
] as const

const semanticActionToResultActionIds: Record<string, string[]> = {
  'continue-edit': ['closer', 'partial', 'more'],
  'guided-refine': ['partial', 'background', 'retry'],
  'branch-version': ['style', 'background'],
  'retry-version': ['retry', 'more'],
  'continue-version': ['closer', 'partial', 'more'],
}

const workflowDescriptions: Array<{
  kind: 'continue' | 'retry' | 'branch'
  label: string
  description: string
}> = [
  {
    kind: 'continue',
    label: '继续这一版',
    description: '沿用当前结果的主体和方向，在这条线上继续细调。',
  },
  {
    kind: 'retry',
    label: '重试这一版',
    description: '保留当前版本意图，但针对不稳定结果再试一次。',
  },
  {
    kind: 'branch',
    label: '从这一版分叉',
    description: '把当前结果当父版，换一种风格或局部方向，起一个新分支。',
  },
]

function trimText(value?: string, fallback = '当前结果') {
  const normalized = value?.trim()
  if (!normalized) return fallback
  return normalized.length > 30 ? `${normalized.slice(0, 30)}…` : normalized
}

function buildRuntimePrioritySummary(actions: ReadonlyArray<(typeof actionDefinitions)[number]>) {
  if (!actions.length) return null
  if (actions.length === 1) return `默认优先动作：${actions[0].title}`
  return `默认先走「${actions[0].title}」，随后优先「${actions
    .slice(1, 3)
    .map((action) => action.title)
    .join('」 / 「')}」`
}

function getPrioritizedActions(guidedFlow?: ConsumerGuidedFlowSnapshot | null) {
  const semanticPriority = guidedFlow?.actionPriority ?? []
  if (!semanticPriority.length) return actionDefinitions

  const rankMap = new Map<string, number>()
  semanticPriority.forEach((semanticActionId, semanticIndex) => {
    const resultActionIds = semanticActionToResultActionIds[semanticActionId] ?? []
    resultActionIds.forEach((actionId, resultIndex) => {
      const nextRank = semanticIndex * 10 + resultIndex
      const currentRank = rankMap.get(actionId)
      if (currentRank == null || nextRank < currentRank) rankMap.set(actionId, nextRank)
    })
  })

  return [...actionDefinitions].sort((left, right) => {
    const leftRank = rankMap.get(left.id) ?? Number.MAX_SAFE_INTEGER
    const rightRank = rankMap.get(right.id) ?? Number.MAX_SAFE_INTEGER
    if (leftRank !== rightRank) return leftRank - rightRank
    return actionDefinitions.indexOf(left) - actionDefinitions.indexOf(right)
  })
}

export function ConsumerResultActions({ preview }: ConsumerResultActionsProps) {
  const [lastTriggeredActionId, setLastTriggeredActionId] = useState<string | null>(null)
  const hasPreviewSource = Boolean(preview.src)
  const replaySummary = getWorkReplayReferenceSummary(preview)
  const replayStatusText = getWorkReplayStatusText(replaySummary)
  const versionSource = getWorkVersionSourceSummary(preview)
  const generationContract = resolveGenerationContractFromWork(preview)
  const runtimeGuidedFlow = generationContract.guidedFlow
  const prioritizedActions = getPrioritizedActions(runtimeGuidedFlow)
  const prioritizedActionSummary = runtimeGuidedFlow?.actionPriority?.length
    ? buildRuntimePrioritySummary(prioritizedActions)
    : null
  const templateRuntimeLabel =
    runtimeGuidedFlow?.sourceType === 'template'
      ? `已承接模板「${runtimeGuidedFlow.templateTitle || runtimeGuidedFlow.guideTitle}」`
      : null
  const runtimeEntrySummary = runtimeGuidedFlow?.runtimeDecision?.activeEntry.summary
  const runtimeEntryReason = runtimeGuidedFlow?.runtimeDecision?.activeEntry.reason
  const runtimeContractSummary = runtimeGuidedFlow?.runtimeDecision?.contract.summary
  const loopRunLabel = runtimeGuidedFlow?.loopState?.runLabel
  const loopHint = runtimeGuidedFlow?.loopState?.loopHint
  const resultSceneId = runtimeGuidedFlow?.sceneId ?? generationContract.scene.id ?? 'image-edit'
  const resultScene =
    runtimeGuidedFlow?.scene ?? generationContract.scene ?? getStudioFlowScene('image-edit')

  function handleAction(action: (typeof actionDefinitions)[number]) {
    if (!preview.src) return
    setLastTriggeredActionId(action.id)

    const existingGuidedFlow = generationContract.guidedFlow
    const preferredGuide =
      (existingGuidedFlow ? findConsumerGuidedFlowById(existingGuidedFlow.guideId) : undefined) ??
      findConsumerGuidedFlowByResultActionId(action.id)
    const guidedFlow =
      existingGuidedFlow?.sourceType === 'template'
        ? rebaseConsumerGuidedFlowSnapshot(existingGuidedFlow, {
            sourceType: 'result-action',
            stage: 'result-action',
            actionId: action.semanticActionId,
            followUpMode: 'scene-guided',
            promptAppendix: action.text,
            promptText: appendFollowupText(existingGuidedFlow.promptText, action.text),
          })
        : preferredGuide
          ? (() => {
              const nextGuidedFlow = buildConsumerGuidedFlowSnapshotFromContext(
                preferredGuide,
                {
                  resultActionId: action.id,
                  currentSelections:
                    existingGuidedFlow?.guideId === preferredGuide.id
                      ? getConsumerGuidedFlowSelectionMap(existingGuidedFlow)
                      : resolveConsumerGuidedFlowSelections(preferredGuide, {
                          resultActionId: action.id,
                        }),
                },
                {
                  basePrompt: existingGuidedFlow?.basePrompt,
                  sourceType: 'result-action',
                  selectionSource: 'result-followup',
                  actionId: action.semanticActionId,
                  promptAppendix: action.text,
                },
              )

              return rebaseConsumerGuidedFlowSnapshot(
                {
                  ...nextGuidedFlow,
                  templateId: existingGuidedFlow?.templateId,
                  templateTitle: existingGuidedFlow?.templateTitle,
                  entryMode: existingGuidedFlow?.entryMode ?? nextGuidedFlow.entryMode,
                  entryIntent: existingGuidedFlow?.entryIntent ?? nextGuidedFlow.entryIntent,
                },
                {
                  sourceType: 'result-action',
                  stage: 'result-action',
                  actionId: action.semanticActionId,
                  followUpMode: 'scene-guided',
                  defaultActionId:
                    nextGuidedFlow.defaultActionId ?? existingGuidedFlow?.defaultActionId,
                  actionPriority:
                    nextGuidedFlow.actionPriority ?? existingGuidedFlow?.actionPriority,
                },
              )
            })()
          : null

    dispatchStudioConsumerIntent({
      type: 'prompt',
      mode: 'followup',
      sceneId: resultSceneId,
      scene: resultScene,
      sourceType: 'result-action',
      actionId: action.semanticActionId,
      text: action.text,
      guidedFlow,
      attachPreview: {
        src: preview.src,
        title: preview.title,
      },
      focus: true,
      submit: action.submit,
    })

    const nextStep = action.submit
      ? '系统会沿用这张结果图直接继续这一版，你可以直接等下一版出来。'
      : action.workflowKind === 'retry'
        ? '这张结果图会回到输入区作为本版基础图，你可以直接点“先试试看”，也可以先补一句后重试这一版。'
        : action.workflowKind === 'branch'
          ? '这张结果图会回到输入区作为父版参考图，你可以直接点“先试试看”，也可以先补一句再从这一版分叉。'
          : '这张结果图会回到输入区作为基础图，你可以直接点“先试试看”，也可以再补一句继续这一版。'

    window.dispatchEvent(
      new CustomEvent<StudioConsumerResultActionDetail>(studioConsumerResultActionEvent, {
        detail: {
          actionId: action.id,
          actionTitle: action.title,
          actionDescription: action.description,
          sceneId: resultSceneId,
          scene: resultScene,
          sourceType: 'result-action',
          semanticActionId: action.semanticActionId,
          workflowKind: action.workflowKind,
          workflowLabel: action.workflowLabel,
          preview: {
            id: preview.id,
            src: preview.src,
            title: preview.title || '当前结果',
            meta: preview.meta || '',
          },
          submit: action.submit,
          nextStep,
          guidedFlowSummary: guidedFlow?.summary,
          loopRunLabel: guidedFlow?.loopState?.runLabel,
          loopHint: guidedFlow?.loopState?.loopHint,
        },
      }),
    )
  }

  const previewTitle = trimText(preview.title, '这张刚生成的结果')
  const previewMeta = trimText(preview.meta, '点击任一动作时，都会沿用这张图继续往下改。')
  const lastTriggeredAction = actionDefinitions.find(
    (action) => action.id === lastTriggeredActionId,
  )
  const recommendedDirectLinks = versionSource.recommendedDirectLinkIds.reduce<
    typeof versionSource.directLinks
  >((accumulator, id) => {
    const matchedLink = versionSource.directLinks.find((item) => item.id === id)
    return matchedLink ? [...accumulator, matchedLink] : accumulator
  }, [])
  const compactDeltaItems = (() => {
    const changedItems = versionSource.deltaItems.filter((item) => item.tone !== 'carry')
    return changedItems.length ? changedItems.slice(0, 2) : versionSource.deltaItems.slice(0, 1)
  })()
  const workflowDecisionMap = new Map(
    versionSource.actionDecisions.map((decision) => [decision.workflowKind, decision]),
  )

  return (
    <section className="mt-5 rounded-[1.7rem] border border-porcelain-50/10 bg-ink-950/[0.52] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Continue</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-porcelain-50">
            基于这一版继续往下改
          </h3>
        </div>
        <p className="max-w-md text-sm leading-6 text-porcelain-100/55">
          不用重新开始。下面的动作都会自动沿用当前结果，但会明确告诉你这是继续这一版、重试这一版，还是从这一版分叉。
        </p>
      </div>

      <div className="mt-4 rounded-[1.4rem] border border-signal-cyan/15 bg-signal-cyan/[0.06] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-signal-cyan/70">
          当前继续来源
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {templateRuntimeLabel ? (
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-1 text-sm font-semibold text-emerald-200">
              {templateRuntimeLabel}
            </span>
          ) : null}
          <span className="rounded-full border border-signal-amber/20 bg-signal-amber/[0.1] px-3 py-1 text-sm font-semibold text-signal-amber">
            建议先走：{versionSource.recommendedActionLabel}
          </span>
          <span className="rounded-full border border-signal-cyan/20 bg-signal-cyan/[0.1] px-3 py-1 text-sm font-semibold text-signal-cyan">
            {versionSource.originLabel}
          </span>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-1 text-sm font-semibold text-emerald-200">
            {versionSource.sourceKindLabel}
          </span>
          <span className="rounded-full border border-signal-cyan/20 bg-signal-cyan/[0.1] px-3 py-1 text-sm font-semibold text-signal-cyan">
            {versionSource.sceneLabel ||
              generationContract.scene.label ||
              getStudioFlowSceneLabel('image-edit')}
          </span>
          <span className="rounded-full border border-porcelain-50/10 bg-ink-950/40 px-3 py-1 text-sm text-porcelain-100/62">
            {versionSource.currentLabel}
          </span>
          <span className="rounded-full border border-signal-cyan/20 bg-signal-cyan/[0.1] px-3 py-1 text-sm font-semibold text-signal-cyan">
            {previewTitle}
          </span>
          <span className="rounded-full border border-porcelain-50/10 bg-ink-950/40 px-3 py-1 text-sm text-porcelain-100/62">
            {previewMeta}
          </span>
          {versionSource.quickDeltaLabels.map((label) => (
            <span
              key={`${preview.id}:${label}`}
              className="rounded-full border border-signal-amber/20 bg-signal-amber/[0.1] px-3 py-1 text-sm font-semibold text-signal-amber"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="mt-3 grid gap-2 text-sm leading-6 text-porcelain-100/58">
          <p className="font-semibold text-porcelain-50">{versionSource.decisionSummary}</p>
          <p>{versionSource.recommendedActionSummary}</p>
          <p>{versionSource.actionDecisionReason}</p>
          <p>{versionSource.recommendedDirectLinksLabel}</p>
          {runtimeGuidedFlow?.followUpLabel ? <p>{runtimeGuidedFlow.followUpLabel}</p> : null}
          {runtimeEntrySummary ? <p>入口路径：{runtimeEntrySummary}</p> : null}
          {runtimeEntryReason ? <p>入口判断：{runtimeEntryReason}</p> : null}
          {loopRunLabel ? <p>{loopRunLabel}</p> : null}
          {loopHint ? <p>{loopHint}</p> : null}
          {prioritizedActionSummary ? <p>动作优先级：{prioritizedActionSummary}</p> : null}
          {runtimeContractSummary ? <p>{runtimeContractSummary}</p> : null}
          <p>{versionSource.deltaHeadline}</p>
        </div>
        <div className="mt-3 grid gap-2 xl:grid-cols-2">
          {recommendedDirectLinks.slice(0, 2).map((item) => (
            <div
              key={`${preview.id}:direct:${item.id}`}
              className="rounded-[1.1rem] border border-porcelain-50/10 bg-porcelain-50/[0.03] px-3 py-2 text-sm text-porcelain-100/58"
            >
              <p className="font-semibold text-porcelain-50">{item.label}</p>
              <p className="mt-1">{item.summary}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-2 xl:grid-cols-2">
          {compactDeltaItems.map((item) => (
            <div
              key={`${preview.id}:${item.id}`}
              className="rounded-[1.1rem] border border-porcelain-50/10 bg-porcelain-50/[0.03] px-3 py-2 text-sm text-porcelain-100/58"
            >
              <p className="font-semibold text-porcelain-50">
                {item.label} · {item.toneLabel}
              </p>
              <p className="mt-1">{item.summary}</p>
              {item.detail ? <p className="mt-1 text-porcelain-100/45">{item.detail}</p> : null}
            </div>
          ))}
        </div>
      </div>

      {!hasPreviewSource ? (
        <div className="mt-4 rounded-[1.35rem] border border-signal-coral/20 bg-signal-coral/10 p-4">
          <p className="text-sm font-semibold text-porcelain-50">当前结果还不能继续往下改</p>
          <p className="mt-1 text-sm leading-6 text-porcelain-100/62">
            这一区域需要一张已经落下来的结果图作为继续基线。等首版结果稳定显示后，下面这些动作才会带着当前版本上下文继续、重试或分叉。
          </p>
        </div>
      ) : null}
      {hasPreviewSource && replaySummary.missingReferenceCount > 0 ? (
        <div className="mt-4 rounded-[1.35rem] border border-signal-amber/20 bg-signal-amber/[0.08] p-4">
          <p className="text-sm font-semibold text-porcelain-50">
            当前结果可以继续回流，但恢复还不完整
          </p>
          <p className="mt-1 text-sm leading-6 text-porcelain-100/62">
            {replayStatusText}
            。继续这一版或从这一版分叉仍可用，但如果要直接重试同链路，建议先在工作台补齐缺失参考图。
          </p>
        </div>
      ) : null}

      {lastTriggeredAction ? (
        <div className="mt-4 rounded-[1.35rem] border border-emerald-300/20 bg-emerald-300/[0.08] p-4">
          <p className="text-sm font-semibold text-porcelain-50">
            已选“{lastTriggeredAction.title}”
          </p>
          <p className="mt-1 text-sm leading-6 text-porcelain-100/62">
            {lastTriggeredAction.submit
              ? '系统正在沿用这张结果继续生成下一版。'
              : '当前结果会自动带回输入区作为基础图，你可以直接继续细调。'}
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {workflowDescriptions.map((workflow) => {
          const workflowDecision = workflowDecisionMap.get(workflow.kind)
          return (
            <div
              key={workflow.kind}
              className="rounded-[1.25rem] border border-porcelain-50/10 bg-porcelain-50/[0.03] p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-porcelain-100/40">
                {workflow.label}
              </p>
              <p className="mt-2 text-sm leading-6 text-porcelain-100/58">
                {workflowDecision?.summary ?? workflow.description}
              </p>
              {workflowDecision?.reason ? (
                <p className="mt-2 text-xs leading-5 text-porcelain-100/45">
                  {workflowDecision.reason}
                </p>
              ) : null}
              {workflowDecision?.caution ? (
                <p className="mt-2 text-xs leading-5 text-signal-amber">
                  {workflowDecision.caution}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {prioritizedActions.map((action, index) => {
          const Icon = action.icon
          const isActive = action.id === lastTriggeredActionId
          const isRecommended = action.semanticActionId === versionSource.recommendedActionId
          const actionDecision = versionSource.actionDecisions.find(
            (decision) => decision.actionId === action.semanticActionId,
          )
          const cardTone =
            action.workflowKind === 'retry'
              ? 'hover:border-signal-amber/45 hover:bg-signal-amber/[0.10]'
              : action.workflowKind === 'branch'
                ? 'hover:border-emerald-300/35 hover:bg-emerald-300/[0.08]'
                : 'hover:border-signal-cyan/45 hover:bg-signal-cyan/[0.10]'
          const activeTone =
            action.workflowKind === 'retry'
              ? 'border-signal-amber/45 bg-signal-amber/[0.12]'
              : action.workflowKind === 'branch'
                ? 'border-emerald-300/35 bg-emerald-300/[0.1]'
                : 'border-signal-cyan/45 bg-signal-cyan/[0.12]'
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => handleAction(action)}
              aria-pressed={isActive}
              disabled={!hasPreviewSource}
              className={`group flex min-h-[140px] flex-col items-start gap-3 rounded-[1.4rem] border p-4 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 ${cardTone} ${
                isActive
                  ? activeTone
                  : isRecommended
                    ? 'border-signal-amber/35 bg-signal-amber/[0.08]'
                    : 'border-porcelain-50/10 bg-porcelain-50/[0.04]'
              }`}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-signal-cyan/20 bg-signal-cyan/[0.08] text-signal-cyan transition group-hover:border-signal-cyan/45 group-hover:bg-signal-cyan/15">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-porcelain-50/10 bg-ink-950/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-porcelain-100/55">
                  {action.badge} · {getStudioFlowActionLabel(action.semanticActionId)}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-porcelain-50">{action.title}</p>
                <p className="mt-1 text-sm leading-6 text-porcelain-100/52">{action.description}</p>
                {isRecommended ? (
                  <p className="mt-2 text-[11px] font-medium text-signal-amber">当前版本建议动作</p>
                ) : index === 0 && prioritizedActionSummary ? (
                  <p className="mt-2 text-[11px] font-medium text-emerald-300">模板默认优先动作</p>
                ) : null}
                {actionDecision ? (
                  <p className="mt-2 text-xs leading-5 text-porcelain-100/45">
                    {actionDecision.summary}
                  </p>
                ) : null}
              </div>
              <p className="mt-auto text-xs leading-5 text-porcelain-100/42">
                {actionDecision?.reason ??
                  (action.submit
                    ? '会沿用这张结果图，直接开始下一轮生成。'
                    : action.workflowKind === 'retry'
                      ? '会把这张结果图带回输入区，按同一版方向补一句后再试。'
                      : action.workflowKind === 'branch'
                        ? '会把这张结果图带回输入区，当作父版参考图分出新方向。'
                        : '会把这张结果图带回输入区，保留当前方向继续改。')}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
