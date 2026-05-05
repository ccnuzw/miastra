import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDrawCardSettings } from '@/features/draw-card/useDrawCardSettings'
import { useGenerationFlow } from '@/features/generation/useGenerationFlow'
import { useGenerationRuntime } from '@/features/generation/useGenerationRuntime'
import type { PromptTemplateListItem } from '@/features/prompt-templates/promptTemplate.types'
import { getPromptTemplateTitle } from '@/features/prompt-templates/promptTemplate.presentation'
import { buildPromptTemplateStructure } from '@/features/prompt-templates/promptTemplate.schema'
import {
  getStudioFlowActionLabel,
  getStudioFlowScene,
  getStudioFlowSceneLabel,
  getStudioFlowSourceLabel,
  type StudioFlowActionId,
  type StudioFlowSceneId,
  type StudioFlowSourceType,
} from '@/features/prompt-templates/studioFlowSemantic'
import {
  clearPromptTemplateStudioLaunch,
  getPromptTemplateStudioLaunchKey,
  readPromptTemplateStudioLaunch,
  resolvePromptTemplateStudioLaunch,
} from '@/features/prompt-templates/promptTemplate.studioEntry'
import { buildPromptTemplateRuntimeConsumption } from '@/features/prompt-templates/promptTemplate.runtime'
import { usePromptTemplateActions } from '@/features/prompt-templates/usePromptTemplateActions'
import { usePromptTemplates } from '@/features/prompt-templates/usePromptTemplates'
import { useProviderConfig } from '@/features/provider/useProviderConfig'
import { useReferenceImages } from '@/features/references/useReferenceImages'
import {
  studioConsumerResultActionEvent,
  type StudioConsumerResultActionDetail,
} from '@/features/studio-consumer/ConsumerResultActions'
import type { ConsumerGuidedFlowSnapshot } from '@/features/studio-consumer/consumerGuidedFlow'
import { rebaseConsumerGuidedFlowSnapshot } from '@/features/studio-consumer/consumerGuidedFlow'
import { useStudioSettings } from '@/features/studio/useStudioSettings'
import { resolutionOptions, resolveSizePreset } from '@/features/studio/studio.constants'
import {
  buildStudioProPromptArtifacts,
  buildStudioProPromptFieldAlignment,
  buildStudioProTextComparison,
  buildStudioProTemplateContext,
  getStudioProRequestKindLabel,
  resolveSelectedStudioStyleTokens,
  type StudioProControlStep,
  type StudioProReplayContext,
  type StudioProTemplateContext,
} from '@/features/studio-pro/studioPro.utils'
import { StudioProDecisionFlowPanel } from '@/features/studio-pro/StudioProDecisionFlowPanel'
import { StudioShellCallout } from '@/features/studio-shared/StudioShellCallout'
import { StudioWorkbenchModeSwitch } from '@/features/studio-shared/StudioWorkbenchModeSwitch'
import { useStudioWorkbenchMode } from '@/features/studio-shared/useStudioWorkbenchMode'
import { useWorksGallery } from '@/features/works/useWorksGallery'
import {
  buildReferenceImagesFromWork,
  consumeWorkReplayPayload,
  getWorkReplayHint,
  getWorkReplayIntentLabel,
  getWorkReplayReferenceSummary,
  getWorkReplayStatusText,
  getWorkVersionSourceSummary,
} from '@/features/works/workReplay'
import type { GalleryImage } from '@/features/works/works.types'
import { getErrorDisplay } from '@/shared/errors/app-error'
import { createDownloadResultError, downloadImage, downloadWorksZip } from '@/shared/utils/download'
import { StudioEditorColumn } from './studio/StudioEditorColumn'
import { StudioGenerationColumn } from './studio/StudioGenerationColumn'
import { StudioWorksColumn } from './studio/StudioWorksColumn'

const StudioOverlayHost = lazy(async () => ({
  default: (await import('./studio/StudioOverlayHost')).StudioOverlayHost,
}))

function trimLabel(value?: string, fallback = '当前结果') {
  const normalized = value?.trim()
  if (!normalized) return fallback
  return normalized.length > 26 ? `${normalized.slice(0, 26)}…` : normalized
}

const studioQualityLabelMap: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  auto: '自动',
}

function getQualityLabel(value: string) {
  return studioQualityLabelMap[value] ?? value
}

function getResolutionLabelByTier(value: '1k' | '2k' | '4k' | null) {
  if (!value) return null
  return resolutionOptions.find((item) => item.value === value)?.label ?? value.toUpperCase()
}

function formatReplayReferenceProgress(restoredCount: number, expectedCount: number) {
  if (expectedCount <= 0) return '这一版没有参考图依赖'
  return `参考图已恢复 ${restoredCount}/${expectedCount} 张`
}

function resolveReplayWorkspacePrompt(context: StudioProReplayContext | null) {
  const workspacePrompt = context?.sourceWorkspacePrompt?.trim()
  if (workspacePrompt) return workspacePrompt
  return context?.requestPrompt.trim() ?? ''
}

function getReplayPrimaryActionLabel(
  context: StudioProReplayContext | null,
  hasCompleteReferenceRestore: boolean,
) {
  if (!context) return '继续当前工作台'
  if (context.recommendedActionId === 'retry-version') {
    return hasCompleteReferenceRestore ? '直接重跑这一版' : '先补齐参考图再重跑'
  }
  if (context.recommendedActionId === 'branch-version') return '从这一版分叉'
  return '继续这一版'
}

function formatReferenceRecoveryGuidance(
  restoredCount: number,
  expectedCount: number,
  options?: {
    continueLabel?: string
    strictGoal?: string
  },
) {
  if (expectedCount <= 0) {
    return '当前链路没有额外参考图依赖，可以直接继续。'
  }
  if (restoredCount >= expectedCount) {
    return `参考图已恢复 ${restoredCount}/${expectedCount} 张，可以直接继续当前链路。`
  }
  return `参考图已恢复 ${restoredCount}/${expectedCount} 张。当前可以${
    options?.continueLabel ?? '继续整理当前控制区'
  }，但如果要${options?.strictGoal ?? '严格复现上一链路'}，建议先补齐参考图。`
}

function applyResolvedSizePreset(
  size: string | undefined,
  handlers: {
    setSize: (value: string) => void
    setAspectLabel: (value: string) => void
    setResolutionTier: (value: '1k' | '2k' | '4k') => void
  },
) {
  const normalized = size?.trim()
  if (!normalized) return
  handlers.setSize(normalized)
  const preset = resolveSizePreset(normalized)
  if (!preset) return
  handlers.setAspectLabel(preset.aspectLabel)
  handlers.setResolutionTier(preset.resolutionTier)
}

export function StudioPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const workbench = useStudioWorkbenchMode()
  const provider = useProviderConfig()
  const studio = useStudioSettings()
  const runtime = useGenerationRuntime()
  const reference = useReferenceImages({
    onError: (message) => {
      runtime.setStatus('error')
      runtime.setStatusText(message)
    },
  })
  const draw = useDrawCardSettings()
  const works = useWorksGallery({ batchId: draw.activeBatchId })
  const templates = usePromptTemplates()
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [appliedTemplateLaunchKey, setAppliedTemplateLaunchKey] = useState('')
  const [consumerGuidedFlow, setConsumerGuidedFlow] = useState<ConsumerGuidedFlowSnapshot | null>(
    null,
  )
  const [activeTemplateContext, setActiveTemplateContext] =
    useState<StudioProTemplateContext | null>(null)
  const [proReplayContext, setProReplayContext] = useState<StudioProReplayContext | null>(null)

  const templateActions = usePromptTemplateActions({
    prompt: studio.prompt,
    setPrompt: studio.setPrompt,
    setStatus: runtime.setStatus,
    setStatusText: runtime.setStatusText,
    saveTemplate: templates.saveTemplate,
    deleteTemplate: templates.deleteTemplate,
    refreshPromptTemplates: templates.refresh,
    markTemplateUsed: templates.markTemplateUsed,
  })

  const activeScene = useMemo(() => {
    if (proReplayContext?.scene) return proReplayContext.scene
    if (consumerGuidedFlow?.scene) return consumerGuidedFlow.scene
    if (activeTemplateContext?.scene) return activeTemplateContext.scene
    if (reference.hasReferenceImage) return getStudioFlowScene('image-edit')
    return getStudioFlowScene()
  }, [activeTemplateContext, consumerGuidedFlow, proReplayContext, reference.hasReferenceImage])

  const generation = useGenerationFlow({
    config: provider.config,
    providerLoading: provider.loading,
    requestUrl: provider.requestUrl,
    editRequestUrl: provider.editRequestUrl,
    prompt: studio.prompt,
    studioMode: studio.studioMode,
    size: studio.size,
    quality: studio.quality,
    stream: studio.stream,
    referenceImages: reference.referenceImages,
    hasReferenceImage: reference.hasReferenceImage,
    drawCount: draw.drawCount,
    drawStrategy: draw.drawStrategy,
    drawConcurrency: draw.drawConcurrency,
    drawSafeMode: draw.drawSafeMode,
    drawTimeoutSec: draw.drawTimeoutSec,
    drawDelayMs: draw.drawDelayMs,
    drawRetries: draw.drawRetries,
    variationStrength: draw.variationStrength,
    enabledVariationDimensions: draw.enabledVariationDimensions,
    scene: activeScene,
    consumerGuidedFlow,
    buildPrompt: studio.buildPrompt,
    setSettingsOpen: provider.setSettingsOpen,
    setGallery: works.setGallery,
    setDrawTasks: draw.setDrawTasks,
    setDrawBatches: draw.setDrawBatches,
    setActiveBatchId: draw.setActiveBatchId,
    setStatus: runtime.setStatus,
    setStatusText: runtime.setStatusText,
    setResponseText: runtime.setResponseText,
    setLiveImageSrc: runtime.setLiveImageSrc,
    setPreviewImage: runtime.setPreviewImage,
    setStage: runtime.setStage,
    setElapsedMs: runtime.setElapsedMs,
    setDebounceMs: runtime.setDebounceMs,
    setDrawQueuePaused: runtime.setDrawQueuePaused,
    abortRef: runtime.abortRef,
    cancelRequestedRef: runtime.cancelRequestedRef,
    drawQueuePausedRef: runtime.drawQueuePausedRef,
    taskControllersRef: runtime.taskControllersRef,
    drawTaskSnapshotsRef: runtime.drawTaskSnapshotsRef,
    pauseResolversRef: runtime.pauseResolversRef,
    debounceTimerRef: runtime.debounceTimerRef,
    startedAtRef: runtime.startedAtRef,
    status: runtime.status,
  })

  const templateError =
    templates.error instanceof Error
      ? templates.error.message
      : templates.error
        ? String(templates.error)
        : null
  const providerErrorTitle = provider.error ? getErrorDisplay(provider.error).title : null
  const worksErrorTitle = works.error ? getErrorDisplay(works.error).title : null
  const activePreview = runtime.previewImage ?? runtime.livePreview
  const isGenerating = runtime.status === 'loading'
  const selectedStyleTokens = resolveSelectedStudioStyleTokens(studio.selectedStyleTokenIds)
  const studioProPrompt = buildStudioProPromptArtifacts({
    prompt: studio.prompt,
    negativePrompt: studio.negativePrompt,
    detailStrength: studio.detailStrength,
    detailTone: studio.detailTone,
    selectedStyleTokens,
  })
  const studioProFieldAlignment = useMemo(
    () => buildStudioProPromptFieldAlignment(activeTemplateContext, studioProPrompt.sections),
    [activeTemplateContext, studioProPrompt.sections],
  )
  const studioProWorkspaceBaseline = useMemo(
    () =>
      buildStudioProTextComparison(
        studioProPrompt.workspacePrompt,
        proReplayContext?.sourceWorkspacePrompt ?? proReplayContext?.requestPrompt ?? '',
      ),
    [proReplayContext, studioProPrompt.workspacePrompt],
  )
  const studioProFinalPromptBaseline = useMemo(
    () =>
      buildStudioProTextComparison(
        studioProPrompt.finalPrompt,
        proReplayContext?.requestPrompt ?? '',
      ),
    [proReplayContext, studioProPrompt.finalPrompt],
  )
  const headerStatusText = workbench.isProMode
    ? provider.connectionLabel
    : providerErrorTitle
      ? `创作服务恢复未完成 · ${providerErrorTitle}`
      : provider.loading
        ? '正在连接创作服务'
        : '先选任务，或直接补一句需求也能开始'
  const replayNeedsReferenceRecovery = Boolean(
    proReplayContext &&
      !proReplayContext.hasCompleteReferenceRestore &&
      (proReplayContext.expectedReferenceCount ?? 0) > 0,
  )
  const workspaceRecoverySlot = useMemo(() => {
    if (provider.loading) {
      return (
        <StudioShellCallout
          eyebrow="恢复中"
          title="正在恢复创作服务配置"
          description="工作台已加载，但 Provider、模型和连接状态还在恢复中。先整理 Prompt、模板或参考图，恢复完成后再发起生成更稳。"
          tone="accent"
        >
          <div className="flex flex-wrap gap-2">
            <span className="status-pill">{provider.connectionLabel}</span>
            <span className="status-pill">生成入口暂时只建议整理内容</span>
          </div>
        </StudioShellCallout>
      )
    }

    if (providerErrorTitle) {
      return (
        <StudioShellCallout
          eyebrow="异常态"
          title="创作服务配置还没有恢复成功"
          description={`当前工作台可以继续整理模板、Prompt 和参考图，但发起生成前建议先处理 Provider 配置异常：${providerErrorTitle}。`}
        >
          <div className="flex flex-wrap gap-2">
            <span className="status-pill">{provider.providerStatusLabel}</span>
            <span className="status-pill">{provider.modelStatusLabel}</span>
            <button
              type="button"
              className="settings-button"
              onClick={() => provider.setSettingsOpen(true)}
            >
              打开服务设置
            </button>
          </div>
        </StudioShellCallout>
      )
    }

    if (replayNeedsReferenceRecovery && proReplayContext) {
      return (
        <StudioShellCallout
          eyebrow="降级可继续"
          title="版本回流已部分恢复，可继续但不建议直接重跑"
          description={`${proReplayContext.sourceLabel}回流已经恢复主体参数和版本语义，但参考图还不完整。当前可以继续校准 Prompt、参数和动作分支；如果要严格复现这一链路，建议先补齐参考图。`}
          tone="accent"
        >
          <div className="flex flex-wrap gap-2">
            <span className="status-pill">
              {formatReplayReferenceProgress(
                proReplayContext.restoredReferenceCount,
                proReplayContext.expectedReferenceCount,
              )}
            </span>
            <span className="status-pill">{proReplayContext.actionLabel}</span>
            <span className="status-pill">Provider / 模型仍以当前工作台为准</span>
          </div>
        </StudioShellCallout>
      )
    }

    if (activeTemplateContext && templateError) {
      return (
        <StudioShellCallout
          eyebrow="模板状态"
          title="当前模板上下文已接入，但模板库同步异常"
          description={`工作台会继续沿用当前模板基线；如果要切换模板、刷新模板元信息或重新从模板入口进入，建议先处理模板库异常：${templateError}。`}
        >
          <div className="flex flex-wrap gap-2">
            <span className="status-pill">{activeTemplateContext.title}</span>
            <span className="status-pill">{activeTemplateContext.sceneLabel}</span>
            <button
              type="button"
              className="settings-button"
              onClick={() => void templates.refresh()}
            >
              刷新模板库
            </button>
          </div>
        </StudioShellCallout>
      )
    }

    if (proReplayContext) {
      const primaryActionLabel = getReplayPrimaryActionLabel(
        proReplayContext,
        proReplayContext.hasCompleteReferenceRestore,
      )
      return (
        <StudioShellCallout
          eyebrow="恢复完成"
          title={`已从${proReplayContext.sourceLabel}恢复当前工作台基线`}
          description={`${proReplayContext.statusText}。建议先${primaryActionLabel}；如果还要改 Prompt、参数或参考图，再在这套基线上继续。`}
          tone="accent"
        >
          <div className="flex flex-wrap gap-2">
            <span className="status-pill">{proReplayContext.actionLabel}</span>
            <span className="status-pill">
              {proReplayContext.sceneLabel ?? proReplayContext.scene?.label ?? '未记录场景'}
            </span>
            <span className="status-pill">
              {formatReplayReferenceProgress(
                proReplayContext.restoredReferenceCount,
                proReplayContext.expectedReferenceCount,
              )}
            </span>
          </div>
        </StudioShellCallout>
      )
    }

    return null
  }, [
    activeTemplateContext,
    proReplayContext,
    provider.connectionLabel,
    provider.loading,
    provider.modelStatusLabel,
    provider.providerStatusLabel,
    provider.setSettingsOpen,
    providerErrorTitle,
    replayNeedsReferenceRecovery,
    templateError,
    templates,
  ])
  const proControlSteps = useMemo<StudioProControlStep[]>(
    () => [
      {
        id: 'template',
        label: '结构模板',
        value: activeTemplateContext ? activeTemplateContext.title : '自由输入',
        detail: activeTemplateContext
          ? `${activeTemplateContext.familyLabel} · ${activeTemplateContext.structureFields.join(' / ')}`
          : '当前未绑定结构模板，直接以工作区描述作为本轮结构基线。',
      },
      {
        id: 'prompt',
        label: 'Prompt 组装',
        value: studioProPrompt.workspacePromptLength
          ? `${studioProPrompt.enabledSectionCount}/4 段已启用`
          : '等待输入',
        detail: `工作区 ${studioProPrompt.workspacePromptLength} 字，最终 ${studioProPrompt.finalPromptLength} 字${
          selectedStyleTokens.length ? `，附加 ${selectedStyleTokens.length} 个风格 token` : ''
        }${studio.negativePrompt.trim() ? '，已包含 Negative Prompt' : ''}。`,
      },
      {
        id: 'parameters',
        label: '参数快照',
        value: `${studio.size} · ${studio.selectedResolution.label}`,
        detail: `质量 ${studioQualityLabelMap[studio.quality] ?? studio.quality} · ${
          studio.stream ? '流式回传开启' : '流式回传关闭'
        } · ${studio.studioMode === 'draw' ? `${draw.drawCount} 次抽卡` : '单次生成'}。`,
      },
      {
        id: 'provider',
        label: 'Provider 执行',
        value: `${provider.providerDisplayName} / ${provider.activeModelLabel}`,
        detail: `${reference.hasReferenceImage ? '图生图' : '文生图'} · ${provider.connectionLabel}`,
      },
    ],
    [
      activeTemplateContext,
      draw.drawCount,
      provider.activeModelLabel,
      provider.connectionLabel,
      provider.providerDisplayName,
      reference.hasReferenceImage,
      selectedStyleTokens.length,
      studio.negativePrompt,
      studio.quality,
      studio.selectedResolution.label,
      studio.size,
      studio.studioMode,
      studio.stream,
      studioProPrompt.enabledSectionCount,
      studioProPrompt.finalPromptLength,
      studioProPrompt.workspacePromptLength,
    ],
  )
  const submitStudioForm = useCallback(() => {
    document
      .getElementById('studio-form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  }, [])

  const templateContextSlot = useMemo(() => {
    if (!activeTemplateContext) return null
    const templateGuidedSummary =
      consumerGuidedFlow?.sourceType === 'template' ? consumerGuidedFlow.summary : null
    const templateGuidedLabel =
      consumerGuidedFlow?.sourceType === 'template' ? consumerGuidedFlow.followUpLabel : null
    const templateLoopRunLabel =
      consumerGuidedFlow?.templateId === activeTemplateContext.id
        ? consumerGuidedFlow.loopState?.runLabel
        : null
    const templateLoopHint =
      consumerGuidedFlow?.templateId === activeTemplateContext.id
        ? consumerGuidedFlow.loopState?.loopHint
        : null
    const runtimeEntryDecision =
      consumerGuidedFlow?.templateId === activeTemplateContext.id
        ? consumerGuidedFlow.runtimeDecision?.activeEntry
        : null
    const runtimeResultSummary =
      consumerGuidedFlow?.templateId === activeTemplateContext.id
        ? consumerGuidedFlow.runtimeDecision?.result.summary
        : null
    const runtimeContractSummary =
      consumerGuidedFlow?.templateId === activeTemplateContext.id
        ? consumerGuidedFlow.runtimeDecision?.contract.summary
        : null

    return (
      <StudioShellCallout
        eyebrow="模板上下文"
        title={`当前已接入「${activeTemplateContext.title}」`}
        description={activeTemplateContext.executionIntentSummary}
      >
        <div className="flex flex-wrap gap-2">
          <span className="status-pill">{activeTemplateContext.sceneLabel}</span>
          <span className="status-pill">{activeTemplateContext.structureStatusLabel}</span>
          <span className="status-pill">{activeTemplateContext.defaultSettingsLabel}</span>
          <span className="status-pill">{activeTemplateContext.recommendedLabel}</span>
        </div>
        <div className="mt-3 rounded-[1.05rem] border border-porcelain-50/10 bg-ink-950/[0.28] px-4 py-3 text-sm leading-6 text-porcelain-100/62">
          <p>更适合：{activeTemplateContext.recommendedBestFor}</p>
          <p className="mt-1">下一步：{activeTemplateContext.recommendedNextStep}</p>
          <p className="mt-1">
            首个结果动作：{activeTemplateContext.primaryNextActionLabel}，
            {activeTemplateContext.primaryNextActionDescription}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {activeTemplateContext.structureFields.map((field) => (
            <span key={field} className="status-pill">
              {field}
            </span>
          ))}
        </div>
        <div className="mt-3 rounded-[1.05rem] border border-porcelain-50/10 bg-ink-950/[0.22] px-4 py-3 text-xs leading-5 text-porcelain-100/55">
          {templateLoopRunLabel ? <p>{templateLoopRunLabel}</p> : null}
          {templateLoopHint ? <p className="mt-1">{templateLoopHint}</p> : null}
          {templateGuidedLabel && templateGuidedSummary ? (
            <p>
              {templateGuidedLabel}：{templateGuidedSummary}
            </p>
          ) : null}
          {runtimeEntryDecision ? (
            <p className="mt-1">
              当前入口：
              {runtimeEntryDecision.mode === 'consumer' ? '普通版任务入口' : '专业版控制面板'}，
              {runtimeEntryDecision.reason}
            </p>
          ) : null}
          {runtimeResultSummary ? <p className="mt-1">动作分支：{runtimeResultSummary}</p> : null}
          {runtimeContractSummary ? (
            <p className="mt-1">Contract 联动：{runtimeContractSummary}</p>
          ) : null}
          <p>追问链：{activeTemplateContext.followUpSummary}</p>
          <p className="mt-1">版本链：{activeTemplateContext.versionSummary}</p>
        </div>
      </StudioShellCallout>
    )
  }, [activeTemplateContext, consumerGuidedFlow])

  const applyTemplateStructureDefaults = useCallback(
    (template: PromptTemplateListItem) => {
      const structure = template.structure ?? buildPromptTemplateStructure(template)
      if (structure.defaults.aspectLabel) studio.setAspectLabel(structure.defaults.aspectLabel)
      if (structure.defaults.resolutionTier)
        studio.setResolutionTier(structure.defaults.resolutionTier)
      if (structure.defaults.quality) studio.setQuality(structure.defaults.quality)
      return structure
    },
    [studio.setAspectLabel, studio.setQuality, studio.setResolutionTier],
  )

  const consumeTemplateRuntime = useCallback(
    (
      template: PromptTemplateListItem,
      preferredMode: 'consumer' | 'pro',
      options?: {
        sceneId?: StudioFlowSceneId
        sourceType?: StudioFlowSourceType
        nextActionId?: StudioFlowActionId
      },
    ) => {
      const runtimeConsumption = buildPromptTemplateRuntimeConsumption(
        template,
        preferredMode,
        options,
      )
      applyTemplateStructureDefaults(template)
      studio.setPrompt(runtimeConsumption.promptText)
      setConsumerGuidedFlow(runtimeConsumption.guidedFlow)
      setProReplayContext(null)
      if (runtimeConsumption.context.mode !== workbench.mode) {
        workbench.setMode(runtimeConsumption.context.mode)
      }
      return runtimeConsumption
    },
    [applyTemplateStructureDefaults, studio, workbench],
  )

  const applyActiveTemplateDefaults = useCallback(() => {
    if (!activeTemplateContext) return
    const template = templates.templates.find((item) => item.id === activeTemplateContext.id)
    if (!template) return
    const structure = applyTemplateStructureDefaults(template)
    runtime.setStatus('success')
    runtime.setStatusText(
      `已按模板「${activeTemplateContext.title}」恢复默认参数：${
        [
          structure.defaults.aspectLabel ? `${structure.defaults.aspectLabel} 画幅` : '',
          structure.defaults.resolutionTier ? structure.defaults.resolutionTier.toUpperCase() : '',
          structure.defaults.quality ? `质量 ${getQualityLabel(structure.defaults.quality)}` : '',
        ]
          .filter(Boolean)
          .join(' / ') || '未记录默认参数'
      }。模板起跑线已经恢复完成。现在可以直接继续；如果改尺寸、质量或参考图，本轮会自然转成派生。`,
    )
  }, [activeTemplateContext, applyTemplateStructureDefaults, runtime, templates.templates])

  const applyActiveTemplatePrompt = useCallback(() => {
    if (!activeTemplateContext) return
    const template = templates.templates.find((item) => item.id === activeTemplateContext.id)
    if (!template) return
    studio.setPrompt(template.content)
    runtime.setStatus('success')
    runtime.setStatusText(
      `已按模板「${activeTemplateContext.title}」恢复 Prompt 基线。当前可以先按字段校准；如果继续明显改写主体描述，这一轮会自然转成派生。`,
    )
  }, [activeTemplateContext, runtime, studio, templates.templates])

  const restoreTemplateStart = useCallback(() => {
    if (!activeTemplateContext) return
    const template = templates.templates.find((item) => item.id === activeTemplateContext.id)
    if (!template) return
    studio.setPrompt(template.content)
    const structure = applyTemplateStructureDefaults(template)
    runtime.setStatus('success')
    runtime.setStatusText(
      `已回到模板「${activeTemplateContext.title}」起跑线：Prompt 已恢复，参数已对齐 ${
        [
          structure.defaults.aspectLabel ? `${structure.defaults.aspectLabel} 画幅` : '',
          structure.defaults.resolutionTier ? structure.defaults.resolutionTier.toUpperCase() : '',
          structure.defaults.quality ? `质量 ${getQualityLabel(structure.defaults.quality)}` : '',
        ]
          .filter(Boolean)
          .join(' / ') || '默认设置'
      }。模板起跑线已经恢复完成，当前更适合先按模板基线出一版，再做局部派生。`,
    )
  }, [activeTemplateContext, applyTemplateStructureDefaults, runtime, studio, templates.templates])

  const applyReplayPromptToWorkspace = useCallback(
    (shouldAnnounce = true) => {
      const replayWorkspacePrompt = resolveReplayWorkspacePrompt(proReplayContext)
      if (!replayWorkspacePrompt) return
      studio.setPrompt(replayWorkspacePrompt)
      if (shouldAnnounce) {
        runtime.setStatus('success')
        runtime.setStatusText(
          `已恢复来源快照 ${proReplayContext?.snapshotId} 的工作区 Prompt 基线。当前可以继续沿这条来源链校准；如果继续改字段，这一轮会形成派生。`,
        )
      }
    },
    [proReplayContext, runtime, studio],
  )

  const restoreReplayParameters = useCallback(
    (shouldAnnounce = true) => {
      if (!proReplayContext) return
      if (proReplayContext.sourceSize) {
        applyResolvedSizePreset(proReplayContext.sourceSize, {
          setSize: studio.setSize,
          setAspectLabel: studio.setAspectLabel,
          setResolutionTier: studio.setResolutionTier,
        })
      }
      if (proReplayContext.sourceQuality) studio.setQuality(proReplayContext.sourceQuality)
      if (typeof proReplayContext.sourceStream === 'boolean')
        studio.setStream(proReplayContext.sourceStream)
      if (proReplayContext.sourceStudioMode) studio.setStudioMode(proReplayContext.sourceStudioMode)

      if (proReplayContext.sourceStudioMode === 'draw') {
        if (proReplayContext.sourceDrawCount != null)
          draw.setDrawCount(proReplayContext.sourceDrawCount)
        if (proReplayContext.sourceDrawStrategy)
          draw.setDrawStrategy(proReplayContext.sourceDrawStrategy)
        if (proReplayContext.sourceDrawConcurrency != null)
          draw.setDrawConcurrency(proReplayContext.sourceDrawConcurrency)
        if (proReplayContext.sourceDrawDelayMs != null)
          draw.setDrawDelayMs(proReplayContext.sourceDrawDelayMs)
        if (proReplayContext.sourceDrawRetries != null)
          draw.setDrawRetries(proReplayContext.sourceDrawRetries)
        if (proReplayContext.sourceDrawTimeoutSec != null)
          draw.setDrawTimeoutSec(proReplayContext.sourceDrawTimeoutSec)
        if (typeof proReplayContext.sourceDrawSafeMode === 'boolean')
          draw.setDrawSafeMode(proReplayContext.sourceDrawSafeMode)
        if (proReplayContext.sourceVariationStrength)
          draw.setVariationStrength(proReplayContext.sourceVariationStrength)
        if (proReplayContext.sourceVariationDimensionIds != null) {
          draw.setEnabledVariationDimensions([...proReplayContext.sourceVariationDimensionIds])
        }
      }

      if (shouldAnnounce) {
        runtime.setStatus('success')
        runtime.setStatusText(
          `已恢复来源快照 ${proReplayContext.snapshotId} 的参数基线。当前可以继续沿来源配置重跑；改尺寸、质量、参考图或抽卡策略时才会形成派生。`,
        )
      }
    },
    [draw, proReplayContext, runtime, studio],
  )

  const restoreReplayExecutionBaseline = useCallback(
    (shouldAnnounce = true) => {
      if (!proReplayContext) return
      restoreReplayParameters(false)
      if (shouldAnnounce) {
        runtime.setStatus('success')
        runtime.setStatusText(
          `已按来源快照 ${proReplayContext.snapshotId} 连续对齐参数与执行基线。Provider / 模型仍以当前工作台配置为准；若两者也与来源一致，这一轮最接近同版重跑。`,
        )
      }
    },
    [proReplayContext, restoreReplayParameters, runtime],
  )

  const applyReplayBaselineToWorkspace = useCallback(
    (shouldAnnounce = true) => {
      if (!proReplayContext) return
      applyReplayPromptToWorkspace(false)
      restoreReplayExecutionBaseline(false)
      if (shouldAnnounce) {
        runtime.setStatus('success')
        runtime.setStatusText(
          `已把来源快照 ${proReplayContext.snapshotId} 的工作区 Prompt、参数和执行基线一起恢复到当前控制区。现在可以直接同基线重跑，或在这套基线上继续派生。`,
        )
      }
    },
    [applyReplayPromptToWorkspace, proReplayContext, restoreReplayExecutionBaseline, runtime],
  )

  const runReplayBaselineNow = useCallback(() => {
    if (!proReplayContext) return
    applyReplayBaselineToWorkspace(false)
    if (!proReplayContext.hasCompleteReferenceRestore) {
      runtime.setStatus('success')
      runtime.setStatusText(
        `已恢复来源快照 ${proReplayContext.snapshotId} 的工作区 Prompt、参数和执行基线，但当前处于降级可继续状态。${formatReferenceRecoveryGuidance(
          proReplayContext.restoredReferenceCount,
          proReplayContext.expectedReferenceCount,
          {
            continueLabel: '继续校准当前控制区',
            strictGoal: '严格执行同基线重跑',
          },
        )}`,
      )
      return
    }
    runtime.setStatus('success')
    runtime.setStatusText(
      `已恢复来源快照 ${proReplayContext.snapshotId} 的工作区 Prompt、参数和执行基线，正在按当前 Provider / 模型发起同基线重跑。`,
    )
    window.setTimeout(() => {
      submitStudioForm()
    }, 0)
  }, [applyReplayBaselineToWorkspace, proReplayContext, runtime, submitStudioForm])

  const runCurrentTargetNow = useCallback(() => {
    runtime.setStatus('success')
    runtime.setStatusText('已按当前控制区直接推进目标版，正在发起本轮生成。')
    window.setTimeout(() => {
      submitStudioForm()
    }, 0)
  }, [runtime, submitStudioForm])

  const clearReplayBaseline = useCallback(() => {
    if (!proReplayContext) return
    const snapshotId = proReplayContext.snapshotId
    setProReplayContext(null)
    runtime.setStatus('success')
    runtime.setStatusText(
      `已解除来源快照 ${snapshotId} 绑定，后续会按当前控制区直接作为新分支基线。`,
    )
  }, [proReplayContext, runtime])
  const workspaceReadinessSlot = useMemo(() => {
    if (runtime.status === 'error') {
      return (
        <StudioShellCallout
          eyebrow="恢复反馈"
          title="当前主流程需要先恢复，再继续更稳"
          description={`${runtime.statusText} 建议先把这一步恢复稳定，再继续走模板入口、回流或生成链，回归结果会更可复现。`}
        >
          <div className="flex flex-wrap gap-2">
            {providerErrorTitle ? (
              <button
                type="button"
                className="settings-button"
                onClick={() => provider.setSettingsOpen(true)}
              >
                处理服务配置
              </button>
            ) : null}
            {templateError ? (
              <button
                type="button"
                className="settings-button"
                onClick={() => void templates.refresh()}
              >
                刷新模板库
              </button>
            ) : null}
            {proReplayContext?.requestPrompt.trim() ? (
              <button
                type="button"
                className="settings-button"
                onClick={() => applyReplayPromptToWorkspace()}
              >
                恢复来源 Prompt
              </button>
            ) : null}
            {activeTemplateContext ? (
              <button
                type="button"
                className="settings-button"
                onClick={applyActiveTemplateDefaults}
              >
                恢复模板默认参数
              </button>
            ) : null}
            {worksErrorTitle ? (
              <button
                type="button"
                className="settings-button"
                onClick={() => void works.refresh()}
              >
                刷新作品区
              </button>
            ) : null}
          </div>
        </StudioShellCallout>
      )
    }

    if (worksErrorTitle) {
      return (
        <StudioShellCallout
          eyebrow="资产状态"
          title="作品区还没有恢复到最新状态"
          description={`最近结果、作品回流和批量动作可能不是最新状态：${worksErrorTitle}。发布前回归时，建议先刷新作品区，再继续验证回流链。`}
        >
          <div className="flex flex-wrap gap-2">
            <button type="button" className="settings-button" onClick={() => void works.refresh()}>
              刷新作品区
            </button>
            <span className="status-pill">
              {draw.activeBatchId ? '当前已定位批次' : '当前查看全部结果'}
            </span>
          </div>
        </StudioShellCallout>
      )
    }

    if (templateError && !activeTemplateContext) {
      return (
        <StudioShellCallout
          eyebrow="模板状态"
          title="模板库同步还没恢复成功"
          description={`当前仍可直接输入需求，但模板入口、模板切换和模板回流验收建议先恢复模板库：${templateError}。`}
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="settings-button"
              onClick={() => void templates.refresh()}
            >
              刷新模板库
            </button>
            <button
              type="button"
              className="settings-button"
              onClick={() => templateActions.setTemplateLibraryOpen(true)}
            >
              打开模板库
            </button>
          </div>
        </StudioShellCallout>
      )
    }

    if (
      workbench.isConsumerMode &&
      !studio.prompt.trim() &&
      !reference.hasReferenceImage &&
      !activeTemplateContext &&
      !proReplayContext &&
      !consumerGuidedFlow
    ) {
      return (
        <StudioShellCallout
          eyebrow="空态"
          title="普通版当前还没有起跑基线"
          description="你现在既没有挂模板入口，也没有带参考图或来源版回流。手工验收时，建议优先验证“一句需求 -> 第一版 -> 结果动作 -> 回流继续”这条最短主链。"
          tone="accent"
        >
          <div className="flex flex-wrap gap-2">
            <span className="status-pill">自由输入起手</span>
            <span className="status-pill">模板入口</span>
            <span className="status-pill">结果动作回流</span>
            <button
              type="button"
              className="settings-button"
              onClick={() => templateActions.setTemplateLibraryOpen(true)}
            >
              找一句现成描述
            </button>
          </div>
        </StudioShellCallout>
      )
    }

    if (
      workbench.isProMode &&
      !studio.prompt.trim() &&
      !activeTemplateContext &&
      !proReplayContext
    ) {
      return (
        <StudioShellCallout
          eyebrow="空态"
          title="专业版当前还没有来源版或模板基线"
          description="专业版现在可以直接输入，但为了更稳地做上线前回归，建议先验证“模板进入 -> Prompt 校准 -> 参数对齐 -> 执行链确认 -> 结果回流”这条主路径。"
          tone="accent"
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="settings-button"
              onClick={() => templateActions.setTemplateLibraryOpen(true)}
            >
              打开模板库
            </button>
            <button
              type="button"
              className="settings-button"
              onClick={() => provider.setSettingsOpen(true)}
            >
              检查服务配置
            </button>
          </div>
        </StudioShellCallout>
      )
    }

    return null
  }, [
    activeTemplateContext,
    applyActiveTemplateDefaults,
    applyReplayPromptToWorkspace,
    consumerGuidedFlow,
    draw.activeBatchId,
    proReplayContext,
    provider,
    providerErrorTitle,
    reference.hasReferenceImage,
    runtime.status,
    runtime.statusText,
    studio.prompt,
    templateActions,
    templateError,
    templates,
    workbench.isConsumerMode,
    workbench.isProMode,
    works,
    worksErrorTitle,
  ])

  const editorTopSlot = useMemo(() => {
    if (workbench.isConsumerMode) {
      return (
        <StudioShellCallout
          eyebrow="引导"
          title="从任务入口进入，再顺手补一句需求"
          description="你可以先选任务，也可以直接写一句话；有原图时再补一句想保留什么、想改哪里，就能继续往下做。"
          tone="accent"
        >
          <div className="flex flex-wrap gap-2">
            <span className="status-pill">
              {reference.hasReferenceImage
                ? `已带上 ${reference.referenceImages.length} 张图片`
                : '可直接先从一句话开始'}
            </span>
            <span className="status-pill">
              {studio.studioMode === 'draw' ? '当前会多试几版' : '当前先出 1 版结果'}
            </span>
          </div>
        </StudioShellCallout>
      )
    }

    return (
      <StudioShellCallout
        eyebrow="控制"
        title={
          proReplayContext
            ? `已从${proReplayContext.sourceLabel}回到专业控制区`
            : '完整设置已展开到进阶控制视图'
        }
        description={
          proReplayContext
            ? `${proReplayContext.statusText}。${proReplayContext.hint}`
            : '进阶模式会在现有输入区下方补充最终 Prompt、参数快照和当前 Provider / 模型信息，简洁模式不会出现这些控制块。'
        }
        tone="accent"
      >
        <div className="flex flex-wrap gap-2">
          <span className="status-pill">{provider.providerStatusLabel}</span>
          <span className="status-pill">{provider.modelStatusLabel}</span>
          <span className="status-pill">{studio.stream ? '流式回传开启' : '流式回传关闭'}</span>
          {proReplayContext ? (
            <span className="status-pill">{proReplayContext.actionLabel}</span>
          ) : null}
        </div>
      </StudioShellCallout>
    )
  }, [
    provider.modelStatusLabel,
    provider.providerStatusLabel,
    proReplayContext,
    reference.hasReferenceImage,
    reference.referenceImages.length,
    studio.studioMode,
    studio.stream,
    workbench.isConsumerMode,
  ])

  const generationTopSlot = useMemo(
    () =>
      workbench.isConsumerMode ? (
        <StudioShellCallout
          eyebrow="流程"
          title="先看这版效果，再顺手继续改"
          description="第一版结果出来后，可以直接基于当前结果继续修改。动作会自动绑定这张图，不需要重新从头开始。"
        >
          <div className="flex flex-wrap gap-2">
            <span className="status-pill">
              {activePreview
                ? `当前结果：${trimLabel(activePreview.title, '刚生成的一版')}`
                : '等待生成结果'}
            </span>
            <span className="status-pill">
              {activePreview ? '继续改会自动沿用这张图' : '先出第一版再继续改'}
            </span>
            <span className="status-pill">{runtime.stage}</span>
          </div>
        </StudioShellCallout>
      ) : (
        <StudioShellCallout
          eyebrow="执行"
          title="进度、响应和取消链路保持原样"
          description="当前进阶模式继续保留响应文本、进度状态和取消能力，后续可直接在这一列扩展更多执行细节。"
        >
          <div className="flex flex-wrap gap-2">
            <span className="status-pill">{runtime.status}</span>
            <span className="status-pill">{runtime.stage}</span>
            <span className="status-pill">{runtime.progressValue}%</span>
          </div>
        </StudioShellCallout>
      ),
    [activePreview, runtime.progressValue, runtime.stage, runtime.status, workbench.isConsumerMode],
  )

  const worksTopSlot = useMemo(
    () =>
      workbench.isConsumerMode ? (
        <StudioShellCallout
          eyebrow="复用"
          title="最近做过的图会留在这里"
          description="你可以从这里回看刚才做的结果、继续做下一版，或者把现有结果拿来当参考。"
        >
          <div className="flex flex-wrap gap-2">
            <span className="status-pill">{works.gallery.length} 项结果</span>
            <span className="status-pill">
              {reference.hasReferenceImage ? '当前会话带参考图' : '当前会话无参考图'}
            </span>
          </div>
        </StudioShellCallout>
      ) : (
        <StudioShellCallout
          eyebrow="资产"
          title="批次、筛选和导出继续保留"
          description="进阶模式继续承接批次筛选、批量导出、参数重跑和作品复用，后续更细的资产动作会直接叠加在这里。"
        >
          <div className="flex flex-wrap gap-2">
            <span className="status-pill">
              {draw.activeBatchId ? '已定位当前批次' : '查看全部批次'}
            </span>
            <span className="status-pill">{works.selectedWorkIds.length} 项已选</span>
            <span className="status-pill">{works.filteredGallery.length} 项可见</span>
          </div>
        </StudioShellCallout>
      ),
    [
      draw.activeBatchId,
      reference.hasReferenceImage,
      works.filteredGallery.length,
      works.gallery.length,
      works.selectedWorkIds.length,
      workbench.isConsumerMode,
    ],
  )

  const applyWorkReplay = useCallback(
    (
      item: GalleryImage,
      autoGenerate = false,
      subject = '作品',
      origin: 'work' | 'task' = 'work',
      intent?: 'continue-version' | 'retry-version' | 'branch-version',
    ) => {
      const snapshot = item.generationSnapshot
      const workspacePrompt =
        snapshot?.workspacePrompt ||
        snapshot?.prompt ||
        item.promptText ||
        item.promptSnippet ||
        item.title
      const requestPrompt =
        snapshot?.requestPrompt ||
        snapshot?.prompt ||
        item.promptText ||
        item.promptSnippet ||
        item.title
      const referenceImages = buildReferenceImagesFromWork(item)
      const expectedReferenceCount = snapshot?.references?.count ?? 0
      const canRestoreAllReferences =
        expectedReferenceCount === 0 || referenceImages.length === expectedReferenceCount
      const replayGuidedFlow = snapshot?.guidedFlow
        ? rebaseConsumerGuidedFlowSnapshot(snapshot.guidedFlow, {
            sourceType: origin === 'task' ? 'task-replay' : 'work-replay',
            stage: 'version-replay',
            actionId: intent,
          })
        : null

      studio.setPrompt(workspacePrompt)
      setConsumerGuidedFlow(replayGuidedFlow)
      applyResolvedSizePreset(snapshot?.size ?? item.size, {
        setSize: studio.setSize,
        setAspectLabel: studio.setAspectLabel,
        setResolutionTier: studio.setResolutionTier,
      })
      if (snapshot?.quality || item.quality)
        studio.setQuality(snapshot?.quality ?? item.quality ?? '')
      if (snapshot?.stream !== undefined) studio.setStream(snapshot.stream)
      if (snapshot?.draw || (snapshot?.mode ?? item.mode)?.includes('draw')) {
        studio.setStudioMode('draw')
        if (snapshot?.draw) {
          draw.setDrawCount(snapshot.draw.count)
          draw.setDrawStrategy(snapshot.draw.strategy)
          draw.setDrawConcurrency(snapshot.draw.concurrency)
          draw.setDrawDelayMs(snapshot.draw.delayMs)
          draw.setDrawRetries(snapshot.draw.retries)
          draw.setDrawTimeoutSec(snapshot.draw.timeoutSec)
          draw.setDrawSafeMode(snapshot.draw.safeMode)
          draw.setVariationStrength(snapshot.draw.variationStrength)
          draw.setEnabledVariationDimensions([...snapshot.draw.dimensions])
        }
      } else {
        studio.setStudioMode('create')
      }
      reference.handleReplaceReferenceImages(referenceImages)

      const replaySummary = getWorkReplayReferenceSummary(item)
      const versionSourceSummary = getWorkVersionSourceSummary(item)
      const replayActionLabel = getWorkReplayIntentLabel(intent, origin)
      const replayScene =
        snapshot?.scene ??
        (referenceImages.length > 0 ? getStudioFlowScene('image-edit') : getStudioFlowScene())
      const sourceSize = snapshot?.size ?? item.size ?? ''
      const sourceSizePreset = resolveSizePreset(sourceSize)
      const sourceQuality = snapshot?.quality ?? item.quality ?? ''
      setActiveTemplateContext(null)
      if (replayGuidedFlow?.templateId) {
        const replayTemplate = templates.templates.find(
          (template) => template.id === replayGuidedFlow.templateId,
        )
        if (replayTemplate) {
          setActiveTemplateContext(
            buildStudioProTemplateContext(replayTemplate, '从版本回流继续 Skill'),
          )
        }
      }
      setProReplayContext({
        sourceLabel: subject,
        actionLabel: replayActionLabel,
        scene: replayScene,
        sceneLabel: versionSourceSummary.sceneLabel,
        statusText: getWorkReplayStatusText(replaySummary),
        hint: getWorkReplayHint(origin, autoGenerate, replaySummary),
        originLabel: versionSourceSummary.originLabel,
        sourceKind: versionSourceSummary.sourceKind,
        sourceKindLabel: versionSourceSummary.sourceKindLabel,
        sourceDecisionLabel: versionSourceSummary.sourceDecisionLabel,
        structureLabel: versionSourceSummary.structureLabel,
        nodePathLabel: versionSourceSummary.nodePathLabel,
        deltaHeadline: versionSourceSummary.deltaHeadline,
        parentDeltaLabel: versionSourceSummary.parentDeltaLabel,
        sourceDeltaLabel: versionSourceSummary.sourceDeltaLabel,
        quickDeltaLabels: versionSourceSummary.quickDeltaLabels,
        deltaItems: versionSourceSummary.deltaItems,
        decisionSummary: versionSourceSummary.decisionSummary,
        recommendedActionId: versionSourceSummary.recommendedActionId,
        recommendedActionLabel: versionSourceSummary.recommendedActionLabel,
        actionDecisionReason: versionSourceSummary.actionDecisionReason,
        actionDecisions: versionSourceSummary.actionDecisions,
        directLinks: versionSourceSummary.directLinks,
        detailLabel: versionSourceSummary.detailLabel,
        currentLabel: versionSourceSummary.currentLabel,
        parentLabel: versionSourceSummary.parentLabel,
        ancestorLabel: versionSourceSummary.ancestorLabel,
        guidedFlowLabel:
          replayGuidedFlow?.loopState?.runLabel && replayGuidedFlow?.loopState?.loopHint
            ? `${replayGuidedFlow.loopState.runLabel}；${replayGuidedFlow.loopState.loopHint}`
            : versionSourceSummary.guidedFlowLabel,
        parameterLabel: versionSourceSummary.parameterLabel,
        promptLabel: versionSourceSummary.promptLabel,
        snapshotId: snapshot?.id || item.snapshotId || '未记录快照',
        sourceProviderId: snapshot?.providerId || '未记录 Provider',
        sourceModelLabel: snapshot?.model || item.providerModel || '未记录模型',
        sourceRequestKindLabel: getStudioProRequestKindLabel(snapshot?.mode ?? item.mode),
        sourceSize,
        sourceQuality,
        sourceStream: snapshot?.stream ?? null,
        sourceAspectLabel: sourceSizePreset?.aspectLabel ?? null,
        sourceResolutionLabel: getResolutionLabelByTier(sourceSizePreset?.resolutionTier ?? null),
        sourceResolutionTier: sourceSizePreset?.resolutionTier ?? null,
        sourceStudioMode:
          snapshot?.draw || (snapshot?.mode ?? item.mode)?.includes('draw') ? 'draw' : 'create',
        sourceDrawCount: snapshot?.draw?.count ?? null,
        sourceDrawStrategy: snapshot?.draw?.strategy ?? null,
        sourceDrawConcurrency: snapshot?.draw?.concurrency ?? null,
        sourceDrawDelayMs: snapshot?.draw?.delayMs ?? null,
        sourceDrawRetries: snapshot?.draw?.retries ?? null,
        sourceDrawTimeoutSec: snapshot?.draw?.timeoutSec ?? null,
        sourceDrawSafeMode: snapshot?.draw?.safeMode ?? null,
        sourceVariationStrength: snapshot?.draw?.variationStrength ?? null,
        sourceVariationDimensionCount: snapshot?.draw?.dimensions.length ?? 0,
        sourceVariationDimensionIds: snapshot?.draw?.dimensions
          ? [...snapshot.draw.dimensions]
          : null,
        sourceReferenceCount: snapshot?.references?.count ?? referenceImages.length,
        sourceWorkspacePrompt: workspacePrompt,
        requestPrompt,
        referenceSummaryLabel: formatReplayReferenceProgress(
          referenceImages.length,
          replaySummary.expectedReferenceCount,
        ),
        expectedReferenceCount: replaySummary.expectedReferenceCount,
        restoredReferenceCount: referenceImages.length,
        hasCompleteReferenceRestore: canRestoreAllReferences,
        canAutoRerun: autoGenerate && canRestoreAllReferences,
      })

      runtime.setStatus('success')
      runtime.setStatusText(
        autoGenerate && canRestoreAllReferences
          ? `已恢复${subject}来源基线，正在按当前工作台配置复跑：${requestPrompt}`
          : expectedReferenceCount > referenceImages.length
            ? `已恢复${subject}主体参数，但当前处于降级可继续状态。${formatReferenceRecoveryGuidance(
                referenceImages.length,
                expectedReferenceCount,
                {
                  continueLabel: '继续调整当前控制区',
                  strictGoal: '直接同基线重跑',
                },
              )}`
            : `已恢复${subject}来源基线。当前可以直接继续；如果先改 Prompt、参数或执行链，这一轮会形成派生。`,
      )
      window.setTimeout(() => {
        document
          .getElementById('studio-form')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)

      return autoGenerate && canRestoreAllReferences
    },
    [draw, reference, runtime, studio, templates.templates],
  )

  useEffect(() => {
    const replay = consumeWorkReplayPayload()
    if (!replay) return
    const subject = replay.origin === 'task' ? '任务' : '作品'
    const shouldAutoGenerate = applyWorkReplay(
      replay.work,
      replay.autoGenerate,
      subject,
      replay.origin ?? 'work',
      replay.intent,
    )
    if (!shouldAutoGenerate) return
    window.setTimeout(() => {
      document
        .getElementById('studio-form')
        ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    }, 0)
  }, [applyWorkReplay])

  useEffect(() => {
    const launch = readPromptTemplateStudioLaunch(searchParams)
    if (!launch) return

    const launchKey = getPromptTemplateStudioLaunchKey(launch)
    if (launchKey === appliedTemplateLaunchKey) return
    if (templates.loading) return

    const matchedTemplate = templates.templates.find((item) => item.id === launch.templateId)
    const nextParams = clearPromptTemplateStudioLaunch(searchParams)
    const nextSearch = nextParams.toString()

    if (!matchedTemplate) {
      runtime.setStatus('error')
      runtime.setStatusText(
        templateError
          ? `模板入口没有恢复成功：${templateError}。入口参数已清理，请先刷新模板库后重试。`
          : '没有找到要接入工作台的模板。入口参数已清理，请回到模板页刷新后重试。',
      )
      setAppliedTemplateLaunchKey(launchKey)
      navigate(
        {
          pathname: '/app/studio',
          search: nextSearch ? `?${nextSearch}` : '',
        },
        { replace: true },
      )
      return
    }

    const resolvedLaunch = resolvePromptTemplateStudioLaunch(matchedTemplate, launch)
    const runtimeConsumption = consumeTemplateRuntime(matchedTemplate, resolvedLaunch.mode, {
      sceneId: resolvedLaunch.sceneId,
      sourceType: resolvedLaunch.sourceType,
      nextActionId: resolvedLaunch.nextAction,
    })
    const resolvedScene = runtimeConsumption.context.scene
    const templateGuidedFlow = runtimeConsumption.guidedFlow
    const sourceLabel = getStudioFlowSourceLabel(resolvedLaunch.sourceType)
    const templateContext = buildStudioProTemplateContext(
      matchedTemplate,
      resolvedLaunch.mode === 'consumer'
        ? `从${sourceLabel}进入普通版`
        : `从${sourceLabel}进入专业版`,
    )
    const nextActionLabel = resolvedLaunch.nextAction
      ? getStudioFlowActionLabel(resolvedLaunch.nextAction)
      : templateContext.primaryNextActionLabel
    const launchAdjusted = resolvedLaunch.mode !== launch.mode
    const adjustedMessage = launchAdjusted
      ? `模板当前更适合从${resolvedLaunch.mode === 'consumer' ? '普通版' : '专业版'}进入，已自动按模板 runtime 调整入口。`
      : ''
    runtime.setStatus('success')
    runtime.setStatusText(
      resolvedLaunch.mode === 'consumer'
        ? `已从${sourceLabel}将模板「${getPromptTemplateTitle(matchedTemplate)}」带入普通版任务入口，并同步「${resolvedScene.label}」场景字段${
            templateGuidedFlow
              ? `，已按模板默认追问路径补齐 ${templateGuidedFlow.completedQuestionCount} 步`
              : ''
          }。${adjustedMessage}建议先出第一版，再接“${nextActionLabel}”。`
        : `已从${sourceLabel}将模板「${getPromptTemplateTitle(matchedTemplate)}」带入专业版控制面板，并同步「${resolvedScene.label}」场景字段。${adjustedMessage}建议先按模板控制项起手，再接“${nextActionLabel}”。`,
    )
    setActiveTemplateContext(templateContext)
    void Promise.resolve(templates.markTemplateUsed(matchedTemplate.id)).catch(() => undefined)
    setAppliedTemplateLaunchKey(launchKey)
    navigate(
      {
        pathname: '/app/studio',
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true },
    )
  }, [appliedTemplateLaunchKey, consumeTemplateRuntime, navigate, runtime, searchParams, templates])

  useEffect(() => {
    function handleConsumerResultAction(rawEvent: Event) {
      const event = rawEvent as CustomEvent<StudioConsumerResultActionDetail>
      const previewTitle = trimLabel(event.detail.preview.title, '当前结果')
      const sceneLabel = event.detail.scene?.label ?? getStudioFlowSceneLabel(event.detail.sceneId)
      const statusText = event.detail.submit
        ? `已按“${event.detail.actionTitle}”继续「${sceneLabel}」，正在准备下一轮生成`
        : `已按“${event.detail.actionTitle}”把当前结果带回输入区，继续「${sceneLabel}」`

      runtime.setStatus('idle')
      runtime.setStage('idle')
      runtime.setStatusText(statusText)
      runtime.setResponseCollapsed(false)
      runtime.setResponseText(
        [
          `结果动作：${event.detail.actionTitle}`,
          `统一场景：${sceneLabel}`,
          `动作语义：${getStudioFlowActionLabel(event.detail.semanticActionId)}`,
          `来源类型：${getStudioFlowSourceLabel(event.detail.sourceType)}`,
          event.detail.loopRunLabel ? `闭环状态：${event.detail.loopRunLabel}` : '',
          event.detail.loopHint ? `闭环提示：${event.detail.loopHint}` : '',
          event.detail.guidedFlowSummary ? `追问回写：${event.detail.guidedFlowSummary}` : '',
          `当前结果：${previewTitle}`,
          `动作说明：${event.detail.actionDescription}`,
          `下一步：${event.detail.nextStep}`,
        ]
          .filter(Boolean)
          .join('\n'),
      )
    }

    window.addEventListener(
      studioConsumerResultActionEvent,
      handleConsumerResultAction as EventListener,
    )
    return () => {
      window.removeEventListener(
        studioConsumerResultActionEvent,
        handleConsumerResultAction as EventListener,
      )
    }
  }, [
    runtime.setResponseCollapsed,
    runtime.setResponseText,
    runtime.setStage,
    runtime.setStatus,
    runtime.setStatusText,
  ])

  function handleGenerateStrategy(value: typeof draw.drawStrategy) {
    const next = draw.applyDrawStrategy(value)
    if (next?.quality) studio.setQuality(next.quality)
  }

  function handleApplyTemplateInStudio(template: PromptTemplateListItem) {
    const runtimeConsumption = consumeTemplateRuntime(template, workbench.mode, {
      sourceType: 'template',
    })
    setActiveTemplateContext(buildStudioProTemplateContext(template, '在工作台内应用模板'))
    templateActions.handleApplyPromptTemplate(template)
    const templateGuidedFlow = runtimeConsumption.guidedFlow
    runtime.setStatus('success')
    runtime.setStatusText(
      runtimeConsumption.context.mode === 'consumer'
        ? `已在普通版应用模板「${getPromptTemplateTitle(template)}」${
            templateGuidedFlow
              ? `，并按模板默认追问路径补齐 ${templateGuidedFlow.completedQuestionCount} 步`
              : ''
          }。`
        : `已在专业版应用模板「${getPromptTemplateTitle(template)}」，当前已切回模板控制基线。`,
    )
  }

  function handleShortcut(preset: 'safe3' | 'balanced5' | 'fast8' | 'turbo10') {
    const next = draw.applyDrawShortcut(preset)
    if (next?.quality) studio.setQuality(next.quality)
  }

  function handleReuseParameters(item: GalleryImage) {
    applyWorkReplay(item, false, '作品', 'work')
  }

  function handleRegenerateFromParameters(item: GalleryImage) {
    const canAutoGenerate = applyWorkReplay(item, true, '作品', 'work')
    if (!canAutoGenerate) return
    window.setTimeout(() => {
      document
        .getElementById('studio-form')
        ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    }, 0)
  }

  async function handleDownloadSelected() {
    if (!works.selectedWorks.length) return
    try {
      const result = await downloadWorksZip(works.selectedWorks, { includeMetadata })
      const exportError = createDownloadResultError(result)
      if (exportError) {
        runtime.setStatus('error')
        runtime.setStatusText(exportError.message)
        return
      }
      runtime.setStatus('success')
      runtime.setStatusText(`批量导出完成，共导出 ${result.imageCount} 项`)
    } catch (error) {
      runtime.setStatus('error')
      runtime.setStatusText(`批量导出失败：${getErrorDisplay(error).title}`)
    }
  }

  return (
    <>
      <main id="studio" className="app-page-shell app-page-shell-wide">
        <section className="panel-shell w-full">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">{workbench.isConsumerMode ? '助手' : 'Studio'}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                {workbench.isProMode ? '专业创作工作台' : '先说你想做什么图'}
              </h1>
              <p className="mt-2 text-sm text-porcelain-100/60">
                {workbench.isConsumerMode
                  ? '先选任务，或直接说一句需求；不用一次讲全，先出一版再继续改。'
                  : workbench.viewModel.description}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="status-pill">{workbench.viewModel.label}</span>
              <span className="status-pill">{headerStatusText}</span>
              {workbench.isProMode ? (
                <>
                  <span className="status-pill">{provider.providerStatusLabel}</span>
                  <span className="status-pill">{provider.modelStatusLabel}</span>
                  <button
                    type="button"
                    className="rounded-full border border-signal-cyan/20 bg-signal-cyan/[0.08] px-4 py-2 text-sm font-semibold text-signal-cyan transition hover:border-signal-cyan/50 hover:bg-signal-cyan/[0.16]"
                    onClick={() => provider.setSettingsOpen(true)}
                  >
                    编辑配置
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="rounded-full border border-signal-cyan/20 bg-signal-cyan/[0.08] px-4 py-2 text-sm font-semibold text-signal-cyan transition hover:border-signal-cyan/50 hover:bg-signal-cyan/[0.16]"
                  onClick={() => provider.setSettingsOpen(true)}
                >
                  服务设置
                </button>
              )}
            </div>
          </div>

          <div className="mt-6">
            <StudioWorkbenchModeSwitch
              mode={workbench.mode}
              hint={workbench.viewModel.switchHint}
              onChange={workbench.setMode}
            />
          </div>

          {workspaceRecoverySlot ? <div className="mt-6">{workspaceRecoverySlot}</div> : null}
          {workspaceReadinessSlot ? <div className="mt-6">{workspaceReadinessSlot}</div> : null}

          <div className="studio-workspace">
            <form
              id="studio-form"
              className="studio-form-column"
              onSubmit={generation.handleGenerate}
            >
              <StudioEditorColumn
                mode={workbench.mode}
                shell={workbench.viewModel.editor}
                topSlot={
                  workbench.isProMode ? (
                    <>
                      {editorTopSlot}
                      <StudioProDecisionFlowPanel
                        workspacePromptLength={studioProPrompt.workspacePromptLength}
                        fieldAlignment={studioProFieldAlignment}
                        workspaceBaseline={studioProWorkspaceBaseline}
                        finalPromptBaseline={studioProFinalPromptBaseline}
                        templateContext={activeTemplateContext}
                        replayContext={proReplayContext}
                        studioMode={studio.studioMode}
                        size={studio.size}
                        aspectLabel={studio.aspectLabel}
                        resolutionLabel={studio.selectedResolution.label}
                        quality={studio.quality}
                        stream={studio.stream}
                        referenceCount={reference.referenceImages.length}
                        drawCount={draw.drawCount}
                        drawStrategy={draw.drawStrategy}
                        drawConcurrency={draw.effectiveDrawConcurrency}
                        providerId={provider.activeProviderId}
                        providerLabel={provider.providerDisplayName}
                        modelLabel={provider.activeModelLabel}
                        requestKindLabel={reference.hasReferenceImage ? '图生图' : '文生图'}
                        actionsDisabled={isGenerating || provider.loading}
                        onApplyReplayPrompt={
                          proReplayContext ? applyReplayPromptToWorkspace : undefined
                        }
                        onApplyReplayParameters={
                          proReplayContext ? restoreReplayParameters : undefined
                        }
                        onApplyReplayRoute={
                          proReplayContext ? restoreReplayExecutionBaseline : undefined
                        }
                        onApplyTemplatePrompt={
                          activeTemplateContext ? applyActiveTemplatePrompt : undefined
                        }
                        onApplyTemplateDefaults={
                          activeTemplateContext ? applyActiveTemplateDefaults : undefined
                        }
                        onRestoreTemplateStart={
                          activeTemplateContext ? restoreTemplateStart : undefined
                        }
                        onRunReplayBaseline={proReplayContext ? runReplayBaselineNow : undefined}
                        onRunCurrentTarget={runCurrentTargetNow}
                        onClearReplayBaseline={proReplayContext ? clearReplayBaseline : undefined}
                      />
                    </>
                  ) : (
                    editorTopSlot
                  )
                }
                bottomSlot={workbench.isProMode ? <>{templateContextSlot}</> : templateContextSlot}
                promptProps={{
                  prompt: studio.prompt,
                  negativePrompt: studio.negativePrompt,
                  referenceImages: reference.referenceImages,
                  hasReferenceImage: reference.hasReferenceImage,
                  inputRef: reference.referenceInputRef,
                  onPromptChange: studio.setPrompt,
                  onNegativePromptChange: studio.setNegativePrompt,
                  onReferenceUpload: reference.handleReferenceUpload,
                  onRemoveReference: reference.handleRemoveReferenceImage,
                  onSaveTemplate: templateActions.handleSaveCurrentPromptTemplate,
                  onOpenTemplateLibrary: templateActions.handleOpenTemplateLibrary,
                  templateActionDisabled: isGenerating,
                  consumerGuidedFlow,
                  onConsumerGuidedFlowChange: setConsumerGuidedFlow,
                  proPanel: workbench.isProMode
                    ? {
                        workspacePrompt: studioProPrompt.workspacePrompt,
                        finalPrompt: studioProPrompt.finalPrompt,
                        selectedStyleTokens,
                        promptSections: studioProPrompt.sections,
                        finalPromptLength: studioProPrompt.finalPromptLength,
                        workspacePromptLength: studioProPrompt.workspacePromptLength,
                        enabledSectionCount: studioProPrompt.enabledSectionCount,
                        templateContext: activeTemplateContext,
                        replayContext: proReplayContext,
                        onApplyTemplatePrompt: activeTemplateContext
                          ? applyActiveTemplatePrompt
                          : undefined,
                        onApplyReplayPrompt: proReplayContext
                          ? applyReplayPromptToWorkspace
                          : undefined,
                        onResetPromptToWorkspace: (value) => studio.setPrompt(value),
                      }
                    : null,
                }}
                parameterProps={{
                  size: studio.size,
                  aspectLabel: studio.aspectLabel,
                  selectedResolutionLabel: studio.selectedResolution.label,
                  resolutionTier: studio.resolutionTier,
                  quality: studio.quality,
                  stream: studio.stream,
                  onAspectChange: studio.setAspectLabel,
                  onResolutionChange: studio.setResolutionTier,
                  onQualityChange: studio.setQuality,
                  onStreamChange: studio.setStream,
                  proPanel: workbench.isProMode
                    ? {
                        studioMode: studio.studioMode,
                        detailStrength: studio.detailStrength,
                        detailTone: studio.detailTone,
                        referenceCount: reference.referenceImages.length,
                        requestKindLabel: reference.hasReferenceImage ? '图生图' : '文生图',
                        drawCount: draw.drawCount,
                        drawStrategy: draw.drawStrategy,
                        drawConcurrency: draw.effectiveDrawConcurrency,
                        drawDelayMs: draw.drawDelayMs,
                        drawRetries: draw.drawRetries,
                        drawTimeoutSec: draw.drawTimeoutSec,
                        variationStrength: draw.variationStrength,
                        variationDimensionCount: draw.enabledVariationDimensions.length,
                        providerLabel: provider.providerDisplayName,
                        modelLabel: provider.activeModelLabel,
                        templateContext: activeTemplateContext,
                        replayContext: proReplayContext,
                        onApplyTemplateDefaults: activeTemplateContext
                          ? applyActiveTemplateDefaults
                          : undefined,
                        onApplyReplayParameters: proReplayContext
                          ? restoreReplayParameters
                          : undefined,
                        onRestoreSourceExecution: proReplayContext
                          ? restoreReplayExecutionBaseline
                          : undefined,
                      }
                    : null,
                }}
                advancedProps={{
                  detailStrength: studio.detailStrength,
                  detailTone: studio.detailTone,
                  onDetailStrengthChange: studio.setDetailStrength,
                  proPanel: workbench.isProMode
                    ? {
                        connectionLabel: provider.connectionLabel,
                        providerStatusLabel: provider.providerStatusLabel,
                        providerLabel: provider.providerDisplayName,
                        providerId: provider.activeProviderId,
                        providerModeLabel: provider.providerModeLabel,
                        credentialStatusLabel: provider.credentialStatusLabel,
                        modelStatusLabel: provider.modelStatusLabel,
                        modelLabel: provider.activeModelLabel,
                        requestKindLabel: reference.hasReferenceImage ? '图生图' : '文生图',
                        requestUrl: provider.requestUrl,
                        editRequestUrl: provider.editRequestUrl,
                        loading: provider.loading,
                        controlSteps: proControlSteps,
                        replayContext: proReplayContext,
                        templateContext: activeTemplateContext,
                        onApplyReplayRoute: proReplayContext
                          ? restoreReplayExecutionBaseline
                          : undefined,
                        onClearReplayBaseline: proReplayContext ? clearReplayBaseline : undefined,
                        onOpenProviderSettings: () => provider.setSettingsOpen(true),
                      }
                    : null,
                }}
                styleTokenProps={{
                  selectedIds: studio.selectedStyleTokenIds,
                  onToggle: studio.toggleStyleToken,
                }}
                drawProps={{
                  studioMode: studio.studioMode,
                  drawStrategy: draw.drawStrategy,
                  effectiveDrawConcurrency: draw.effectiveDrawConcurrency,
                  drawStats: draw.drawStats,
                  drawCount: draw.drawCount,
                  drawTimeoutSec: draw.drawTimeoutSec,
                  drawDelayMs: draw.drawDelayMs,
                  drawRetries: draw.drawRetries,
                  variationStrength: draw.variationStrength,
                  enabledVariationDimensions: draw.enabledVariationDimensions,
                  drawSafeMode: draw.drawSafeMode,
                  drawQueuePaused: runtime.drawQueuePaused,
                  isGenerating,
                  taskSlots: draw.taskSlots,
                  onModeChange: studio.setStudioMode,
                  onApplyStrategy: handleGenerateStrategy,
                  onConcurrencyChange: draw.setDrawConcurrency,
                  onDrawCountChange: draw.setDrawCount,
                  onTimeoutChange: draw.setDrawTimeoutSec,
                  onDelayChange: draw.setDrawDelayMs,
                  onRetriesChange: draw.setDrawRetries,
                  onVariationStrengthChange: draw.setVariationStrength,
                  onToggleDimension: draw.toggleVariationDimension,
                  onSafeModeChange: draw.setDrawSafeMode,
                  onShortcut: handleShortcut,
                  onPauseQueue: generation.handlePauseQueue,
                  onResumeQueue: generation.handleResumeQueue,
                  onCancelTask: generation.handleCancelDrawTask,
                  onRetryTask: generation.handleRetryDrawTask,
                  onCancelAllQueue: generation.handleCancelAllQueue,
                }}
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="generate-button"
                  disabled={isGenerating || provider.loading}
                >
                  {provider.loading
                    ? '恢复中…'
                    : isGenerating
                      ? '生成中…'
                      : workbench.isConsumerMode
                        ? '先出第一版'
                        : '开始生成'}
                </button>
                {workbench.isProMode ? (
                  <button
                    type="button"
                    className="settings-button"
                    onClick={provider.saveProviderConfig}
                    disabled={provider.loading}
                  >
                    保存配置
                  </button>
                ) : null}
                <button
                  type="button"
                  className="settings-button"
                  onClick={() => templateActions.setTemplateLibraryOpen(true)}
                >
                  {workbench.isConsumerMode ? '找一句现成描述' : '模板库'}
                </button>
              </div>
              {workbench.isConsumerMode ? (
                <p className="text-sm leading-6 text-porcelain-100/52">
                  不确定时也可以直接生成，我们会先按你现在的内容补出一版，再继续一起收紧。
                </p>
              ) : null}
            </form>

            <div className="studio-preview-column">
              <StudioGenerationColumn
                mode={workbench.mode}
                shell={workbench.viewModel.generation}
                topSlot={generationTopSlot}
                activePreview={activePreview}
                onPreview={works.setViewerImage}
                responseText={runtime.responseText}
                responseCollapsed={runtime.responseCollapsed}
                responseSummary={runtime.responseSummary}
                onToggleResponse={() => runtime.setResponseCollapsed(!runtime.responseCollapsed)}
                onClearResponse={() => runtime.setResponseText('')}
                statusText={runtime.statusText}
                stage={runtime.stage}
                progressValue={runtime.progressValue}
                onCancel={generation.handleCancelGeneration}
              />
            </div>
          </div>

          <div className="studio-works-column">
            <StudioWorksColumn
              mode={workbench.mode}
              shell={workbench.viewModel.works}
              topSlot={worksTopSlot}
              items={works.filteredGallery}
              totalCount={works.gallery.length}
              filteredCount={works.filteredGallery.length}
              batches={draw.drawBatches}
              activeBatchId={draw.activeBatchId}
              selectedIds={works.selectedWorkIds}
              searchQuery={works.workSearchQuery}
              availableTags={works.availableTags}
              activeTag={works.activeTagFilter}
              favoritesOnly={works.favoritesOnly}
              selectedTags={works.selectedWorkTags}
              onBatchChange={draw.setActiveBatchId}
              onSearchChange={works.setWorkSearchQuery}
              onTagChange={works.setActiveTagFilter}
              onFavoritesOnlyChange={works.setFavoritesOnly}
              onClearFilters={works.clearWorkFilters}
              onOpenWall={() => works.setWallOpen(true)}
              onPreview={works.setViewerImage}
              onDownload={downloadImage}
              onPushReference={reference.handlePushReferenceImage}
              onRemove={works.handleRemoveImage}
              onRetry={handleRegenerateFromParameters}
              onToggleSelect={works.toggleWorkSelection}
              onToggleFavorite={works.toggleWorkFavorite}
              onAddTag={works.addWorkTag}
              onRemoveTag={works.removeWorkTag}
              onAddSelectedTag={works.addTagToSelectedWorks}
              onRemoveSelectedTag={works.removeTagFromSelectedWorks}
              onClearSelection={works.clearWorkSelection}
              onRemoveSelected={works.removeSelectedWorks}
              onDownloadSelected={() => void handleDownloadSelected()}
              includeMetadata={includeMetadata}
              onIncludeMetadataChange={setIncludeMetadata}
            />
          </div>
        </section>
      </main>

      <Suspense fallback={null}>
        <StudioOverlayHost
          providerModal={{
            open: provider.settingsOpen,
            config: provider.config,
            draftConfig: provider.draftConfig,
            managedProviders: provider.managedProviders,
            providerPolicy: provider.providerPolicy,
            onDraftConfigChange: provider.setDraftConfig,
            onSave: () => void provider.saveProviderConfig(),
            onClose: () => provider.setSettingsOpen(false),
          }}
          templateLibrary={{
            open: templateActions.templateLibraryOpen,
            templates: templates.templates,
            loading: templates.loading,
            error: templateError,
            currentPrompt: studio.prompt,
            saveFeedback: templateActions.templateFeedback,
            onSaveCurrent: templateActions.handleSaveCurrentPromptTemplate,
            onApply: handleApplyTemplateInStudio,
            onDuplicate: templateActions.handleDuplicatePromptTemplate,
            onDelete: templateActions.handleDeletePromptTemplate,
            onRefresh: () => void templates.refresh(),
            onClose: () => templateActions.setTemplateLibraryOpen(false),
          }}
          viewer={{
            image: works.viewerImage,
            onClose: () => works.setViewerImage(null),
            onDownload: downloadImage,
            onPushReference: reference.handlePushReferenceImage,
            onReuseParameters: handleReuseParameters,
            onRegenerateFromParameters: handleRegenerateFromParameters,
          }}
          wall={{
            open: works.wallOpen,
            gallery: works.gallery,
            totalCount: works.gallery.length,
            selectedIds: works.selectedWorkIds,
            searchQuery: works.workSearchQuery,
            availableTags: works.availableTags,
            activeTag: works.activeTagFilter,
            favoritesOnly: works.favoritesOnly,
            selectedTags: works.selectedWorkTags,
            onClose: () => works.setWallOpen(false),
            onPreview: works.setViewerImage,
            onDownload: downloadImage,
            onDownloadSelected: () => void handleDownloadSelected(),
            includeMetadata,
            onIncludeMetadataChange: setIncludeMetadata,
            onPushReference: reference.handlePushReferenceImage,
            onToggleSelect: works.toggleWorkSelection,
            onToggleFavorite: works.toggleWorkFavorite,
            onAddTag: works.addWorkTag,
            onRemoveTag: works.removeWorkTag,
            onAddSelectedTag: works.addTagToSelectedWorks,
            onRemoveSelectedTag: works.removeTagFromSelectedWorks,
            onClearSelection: works.clearWorkSelection,
            onRemoveSelected: works.removeSelectedWorks,
            onRemove: works.handleRemoveImage,
            onRetry: handleRegenerateFromParameters,
            onSearchChange: works.setWorkSearchQuery,
            onTagChange: works.setActiveTagFilter,
            onFavoritesOnlyChange: works.setFavoritesOnly,
            onClearFilters: works.clearWorkFilters,
          }}
        />
      </Suspense>
    </>
  )
}
