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
  resolvePromptTemplateScene,
} from '@/features/prompt-templates/studioFlowSemantic'
import {
  clearPromptTemplateStudioLaunch,
  getPromptTemplateStudioLaunchKey,
  readPromptTemplateStudioLaunch,
} from '@/features/prompt-templates/promptTemplate.studioEntry'
import { buildPromptTemplateGuidedFlowSnapshot } from '@/features/prompt-templates/promptTemplate.runtime'
import { usePromptTemplateActions } from '@/features/prompt-templates/usePromptTemplateActions'
import { usePromptTemplates } from '@/features/prompt-templates/usePromptTemplates'
import { useProviderConfig } from '@/features/provider/useProviderConfig'
import { useReferenceImages } from '@/features/references/useReferenceImages'
import {
  studioConsumerResultActionEvent,
  type StudioConsumerResultActionDetail,
} from '@/features/studio-consumer/ConsumerResultActions'
import type { ConsumerGuidedFlowSnapshot } from '@/features/studio-consumer/consumerGuidedFlow'
import { useStudioSettings } from '@/features/studio/useStudioSettings'
import { resolutionOptions, resolveSizePreset } from '@/features/studio/studio.constants'
import {
  buildStudioProPromptArtifacts,
  buildStudioProTemplateContext,
  getStudioProRequestKindLabel,
  resolveSelectedStudioStyleTokens,
  type StudioProControlStep,
  type StudioProReplayContext,
  type StudioProTemplateContext,
} from '@/features/studio-pro/studioPro.utils'
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
  const [consumerGuidedFlow, setConsumerGuidedFlow] = useState<ConsumerGuidedFlowSnapshot | null>(null)
  const [activeTemplateContext, setActiveTemplateContext] = useState<StudioProTemplateContext | null>(null)
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
  const headerStatusText = workbench.isProMode
    ? provider.connectionLabel
    : provider.loading
      ? '正在连接创作服务'
      : '先选任务，或直接补一句需求也能开始'
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
        value: studioProPrompt.workspacePromptLength ? `${studioProPrompt.enabledSectionCount}/4 段已启用` : '等待输入',
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

  const templateContextSlot = useMemo(() => {
    if (!activeTemplateContext) return null
    const templateGuidedSummary =
      consumerGuidedFlow?.sourceType === 'template' ? consumerGuidedFlow.summary : null
    const templateGuidedLabel =
      consumerGuidedFlow?.sourceType === 'template' ? consumerGuidedFlow.followUpLabel : null

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
            首个结果动作：{activeTemplateContext.primaryNextActionLabel}，{activeTemplateContext.primaryNextActionDescription}
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
          {templateGuidedLabel && templateGuidedSummary ? (
            <p>
              {templateGuidedLabel}：{templateGuidedSummary}
            </p>
          ) : null}
          <p>追问链：{activeTemplateContext.followUpSummary}</p>
          <p className="mt-1">版本链：{activeTemplateContext.versionSummary}</p>
        </div>
      </StudioShellCallout>
    )
  }, [activeTemplateContext, consumerGuidedFlow])

  const applyTemplateStructureDefaults = useCallback((template: PromptTemplateListItem) => {
    const structure = template.structure ?? buildPromptTemplateStructure(template)
    if (structure.defaults.aspectLabel) studio.setAspectLabel(structure.defaults.aspectLabel)
    if (structure.defaults.resolutionTier) studio.setResolutionTier(structure.defaults.resolutionTier)
    if (structure.defaults.quality) studio.setQuality(structure.defaults.quality)
    return structure
  }, [studio.setAspectLabel, studio.setQuality, studio.setResolutionTier])

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
      }`,
    )
  }, [activeTemplateContext, applyTemplateStructureDefaults, runtime, templates.templates])

  const applyActiveTemplatePrompt = useCallback(() => {
    if (!activeTemplateContext) return
    const template = templates.templates.find((item) => item.id === activeTemplateContext.id)
    if (!template) return
    studio.setPrompt(template.content)
    runtime.setStatus('success')
    runtime.setStatusText(`已按模板「${activeTemplateContext.title}」恢复结构化 Prompt 基线`)
  }, [activeTemplateContext, runtime, studio, templates.templates])

  const applyReplayPromptToWorkspace = useCallback(() => {
    if (!proReplayContext?.requestPrompt.trim()) return
    studio.setPrompt(proReplayContext.requestPrompt)
    runtime.setStatus('success')
    runtime.setStatusText(`已将来源快照 ${proReplayContext.snapshotId} 的请求 Prompt 带回工作区`)
  }, [proReplayContext, runtime, studio])

  const restoreReplayParameters = useCallback(() => {
    if (!proReplayContext) return
    if (proReplayContext.sourceSize) {
      applyResolvedSizePreset(proReplayContext.sourceSize, {
        setSize: studio.setSize,
        setAspectLabel: studio.setAspectLabel,
        setResolutionTier: studio.setResolutionTier,
      })
    }
    if (proReplayContext.sourceQuality) studio.setQuality(proReplayContext.sourceQuality)
    if (typeof proReplayContext.sourceStream === 'boolean') studio.setStream(proReplayContext.sourceStream)
    if (proReplayContext.sourceStudioMode) studio.setStudioMode(proReplayContext.sourceStudioMode)

    if (proReplayContext.sourceStudioMode === 'draw') {
      if (proReplayContext.sourceDrawCount != null) draw.setDrawCount(proReplayContext.sourceDrawCount)
      if (proReplayContext.sourceDrawStrategy) draw.setDrawStrategy(proReplayContext.sourceDrawStrategy)
      if (proReplayContext.sourceDrawConcurrency != null) draw.setDrawConcurrency(proReplayContext.sourceDrawConcurrency)
      if (proReplayContext.sourceDrawDelayMs != null) draw.setDrawDelayMs(proReplayContext.sourceDrawDelayMs)
      if (proReplayContext.sourceDrawRetries != null) draw.setDrawRetries(proReplayContext.sourceDrawRetries)
      if (proReplayContext.sourceDrawTimeoutSec != null) draw.setDrawTimeoutSec(proReplayContext.sourceDrawTimeoutSec)
      if (proReplayContext.sourceVariationStrength) draw.setVariationStrength(proReplayContext.sourceVariationStrength)
    }

    runtime.setStatus('success')
    runtime.setStatusText(`已恢复来源快照 ${proReplayContext.snapshotId} 的参数控制基线`)
  }, [draw, proReplayContext, runtime, studio])

  const restoreReplayExecutionBaseline = useCallback(() => {
    if (!proReplayContext) return
    restoreReplayParameters()
    runtime.setStatus('success')
    runtime.setStatusText(
      `已恢复来源快照 ${proReplayContext.snapshotId} 的参数与执行基线；Provider / 模型请按来源信息确认`,
    )
  }, [proReplayContext, restoreReplayParameters, runtime])

  const clearReplayBaseline = useCallback(() => {
    if (!proReplayContext) return
    const snapshotId = proReplayContext.snapshotId
    setProReplayContext(null)
    runtime.setStatus('success')
    runtime.setStatusText(`已解除来源快照 ${snapshotId} 绑定，后续将按当前控制区直接形成新版本`)
  }, [proReplayContext, runtime])

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
        title={proReplayContext ? `已从${proReplayContext.sourceLabel}回到专业控制区` : '完整设置已展开到进阶控制视图'}
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
          {proReplayContext ? <span className="status-pill">{proReplayContext.actionLabel}</span> : null}
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
              {activePreview ? `当前结果：${trimLabel(activePreview.title, '刚生成的一版')}` : '等待生成结果'}
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

      studio.setPrompt(workspacePrompt)
      setConsumerGuidedFlow(snapshot?.guidedFlow ?? null)
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
        snapshot?.scene ?? (referenceImages.length > 0 ? getStudioFlowScene('image-edit') : getStudioFlowScene())
      const sourceSize = snapshot?.size ?? item.size ?? ''
      const sourceSizePreset = resolveSizePreset(sourceSize)
      const sourceQuality = snapshot?.quality ?? item.quality ?? ''
      setActiveTemplateContext(null)
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
        detailLabel: versionSourceSummary.detailLabel,
        currentLabel: versionSourceSummary.currentLabel,
        parentLabel: versionSourceSummary.parentLabel,
        ancestorLabel: versionSourceSummary.ancestorLabel,
        guidedFlowLabel: versionSourceSummary.guidedFlowLabel,
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
        sourceResolutionLabel:
          getResolutionLabelByTier(sourceSizePreset?.resolutionTier ?? null),
        sourceResolutionTier: sourceSizePreset?.resolutionTier ?? null,
        sourceStudioMode: snapshot?.draw || (snapshot?.mode ?? item.mode)?.includes('draw') ? 'draw' : 'create',
        sourceDrawCount: snapshot?.draw?.count ?? null,
        sourceDrawStrategy: snapshot?.draw?.strategy ?? null,
        sourceDrawConcurrency: snapshot?.draw?.concurrency ?? null,
        sourceDrawDelayMs: snapshot?.draw?.delayMs ?? null,
        sourceDrawRetries: snapshot?.draw?.retries ?? null,
        sourceDrawTimeoutSec: snapshot?.draw?.timeoutSec ?? null,
        sourceVariationStrength: snapshot?.draw?.variationStrength ?? null,
        sourceVariationDimensionCount: snapshot?.draw?.dimensions.length ?? 0,
        sourceReferenceCount: snapshot?.references?.count ?? referenceImages.length,
        sourceWorkspacePrompt: workspacePrompt,
        requestPrompt,
        referenceSummaryLabel:
          replaySummary.expectedReferenceCount > 0
            ? `参考图已恢复 ${referenceImages.length}/${replaySummary.expectedReferenceCount} 张`
            : '这一版没有参考图依赖',
      })

      runtime.setStatus('success')
      runtime.setStatusText(
        autoGenerate && canRestoreAllReferences
          ? `已恢复${subject}参数，正在复跑：${requestPrompt}`
          : expectedReferenceCount > referenceImages.length
            ? `已恢复${subject}参数，但参考图未完整保存，请先补齐参考图后再复跑`
            : `已恢复${subject}参数，可以直接再次生成`,
      )
      window.setTimeout(() => {
        document.getElementById('studio-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)

      return autoGenerate && canRestoreAllReferences
    },
    [draw, reference, runtime, studio],
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
      runtime.setStatusText('没有找到要接入工作台的模板。')
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

    workbench.setMode(launch.mode)
    const structure = applyTemplateStructureDefaults(matchedTemplate)
    const resolvedScene = launch.sceneId
      ? getStudioFlowScene(launch.sceneId)
      : resolvePromptTemplateScene(structure.scenarioId)
    const templateGuidedFlow =
      launch.mode === 'consumer' ? buildPromptTemplateGuidedFlowSnapshot(matchedTemplate) : null
    studio.setPrompt(templateGuidedFlow?.promptText?.trim() || matchedTemplate.content)
    setConsumerGuidedFlow(templateGuidedFlow)
    const sourceLabel = getStudioFlowSourceLabel(launch.sourceType)
    const templateContext = buildStudioProTemplateContext(
      matchedTemplate,
      launch.mode === 'consumer' ? `从${sourceLabel}进入普通版` : `从${sourceLabel}进入专业版`,
    )
    const nextActionLabel = launch.nextAction ? getStudioFlowActionLabel(launch.nextAction) : templateContext.primaryNextActionLabel
    runtime.setStatus('success')
    runtime.setStatusText(
      launch.mode === 'consumer'
        ? `已从${sourceLabel}将模板「${getPromptTemplateTitle(matchedTemplate)}」带入普通版任务入口，并同步「${resolvedScene.label}」场景字段${
            templateGuidedFlow
              ? `，已按模板默认追问路径补齐 ${templateGuidedFlow.completedQuestionCount} 步`
              : ''
          }。建议先出第一版，再接“${nextActionLabel}”。`
        : `已从${sourceLabel}将模板「${getPromptTemplateTitle(matchedTemplate)}」带入专业版控制面板，并同步「${resolvedScene.label}」场景字段。建议先按模板控制项起手，再接“${nextActionLabel}”。`,
    )
    setActiveTemplateContext(templateContext)
    setProReplayContext(null)
    void Promise.resolve(templates.markTemplateUsed(matchedTemplate.id)).catch(() => undefined)
    setAppliedTemplateLaunchKey(launchKey)
    navigate(
      {
        pathname: '/app/studio',
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true },
    )
  }, [
    applyTemplateStructureDefaults,
    appliedTemplateLaunchKey,
    navigate,
    runtime,
    searchParams,
    studio,
    templates,
    workbench,
  ])

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
          event.detail.guidedFlowSummary ? `追问回写：${event.detail.guidedFlowSummary}` : '',
          `当前结果：${previewTitle}`,
          `动作说明：${event.detail.actionDescription}`,
          `下一步：${event.detail.nextStep}`,
        ]
          .filter(Boolean)
          .join('\n'),
      )
    }

    window.addEventListener(studioConsumerResultActionEvent, handleConsumerResultAction as EventListener)
    return () => {
      window.removeEventListener(studioConsumerResultActionEvent, handleConsumerResultAction as EventListener)
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
    applyTemplateStructureDefaults(template)
    setActiveTemplateContext(buildStudioProTemplateContext(template, '在工作台内应用模板'))
    setProReplayContext(null)
    templateActions.handleApplyPromptTemplate(template)
    const templateGuidedFlow =
      workbench.isConsumerMode ? buildPromptTemplateGuidedFlowSnapshot(template) : null
    if (templateGuidedFlow?.promptText?.trim()) {
      studio.setPrompt(templateGuidedFlow.promptText)
    }
    setConsumerGuidedFlow(templateGuidedFlow)
    runtime.setStatus('success')
    runtime.setStatusText(
      workbench.isConsumerMode
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

          <div className="studio-workspace">
            <form
              id="studio-form"
              className="studio-form-column"
              onSubmit={generation.handleGenerate}
            >
              <StudioEditorColumn
                mode={workbench.mode}
                shell={workbench.viewModel.editor}
                topSlot={editorTopSlot}
                bottomSlot={templateContextSlot}
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
                        onApplyTemplatePrompt: activeTemplateContext ? applyActiveTemplatePrompt : undefined,
                        onApplyReplayPrompt: proReplayContext ? applyReplayPromptToWorkspace : undefined,
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
                        onApplyTemplateDefaults: activeTemplateContext ? applyActiveTemplateDefaults : undefined,
                        onApplyReplayParameters: proReplayContext ? restoreReplayParameters : undefined,
                        onRestoreSourceExecution: proReplayContext ? restoreReplayExecutionBaseline : undefined,
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
                        onApplyReplayRoute: proReplayContext ? restoreReplayExecutionBaseline : undefined,
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
