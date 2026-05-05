import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDrawCardSettings } from '@/features/draw-card/useDrawCardSettings'
import { useGenerationFlow } from '@/features/generation/useGenerationFlow'
import { useGenerationRuntime } from '@/features/generation/useGenerationRuntime'
import { getPromptTemplateTitle } from '@/features/prompt-templates/promptTemplate.presentation'
import {
  clearPromptTemplateStudioLaunch,
  getPromptTemplateStudioLaunchKey,
  readPromptTemplateStudioLaunch,
} from '@/features/prompt-templates/promptTemplate.studioEntry'
import { usePromptTemplateActions } from '@/features/prompt-templates/usePromptTemplateActions'
import { usePromptTemplates } from '@/features/prompt-templates/usePromptTemplates'
import { useProviderConfig } from '@/features/provider/useProviderConfig'
import { useReferenceImages } from '@/features/references/useReferenceImages'
import {
  studioConsumerResultActionEvent,
  type StudioConsumerResultActionDetail,
} from '@/features/studio-consumer/ConsumerResultActions'
import { useStudioSettings } from '@/features/studio/useStudioSettings'
import {
  buildStudioProPromptArtifacts,
  resolveSelectedStudioStyleTokens,
} from '@/features/studio-pro/studioPro.utils'
import { StudioShellCallout } from '@/features/studio-shared/StudioShellCallout'
import { StudioWorkbenchModeSwitch } from '@/features/studio-shared/StudioWorkbenchModeSwitch'
import { useStudioWorkbenchMode } from '@/features/studio-shared/useStudioWorkbenchMode'
import { useWorksGallery } from '@/features/works/useWorksGallery'
import {
  buildReferenceImagesFromWork,
  consumeWorkReplayPayload,
  getWorkReplayHint,
  getWorkReplayReferenceSummary,
  getWorkReplayStatusText,
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
  const [proReplayContext, setProReplayContext] = useState<{
    sourceLabel: string
    actionLabel: string
    statusText: string
    hint: string
  } | null>(null)

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
        title={proReplayContext ? `已从${proReplayContext.sourceLabel}恢复到控制区` : '完整设置已展开到进阶控制视图'}
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
    (item: GalleryImage, autoGenerate = false, subject = '作品', origin: 'work' | 'task' = 'work') => {
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
      if (snapshot?.size || item.size) studio.setSize(snapshot?.size ?? item.size ?? '')
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
      setProReplayContext({
        sourceLabel: subject,
        actionLabel: autoGenerate ? '按当前参数复跑' : '恢复到控制区',
        statusText: getWorkReplayStatusText(replaySummary),
        hint: getWorkReplayHint(origin, autoGenerate, replaySummary),
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
    studio.setPrompt(matchedTemplate.content)
    runtime.setStatus('success')
    runtime.setStatusText(
      launch.mode === 'consumer'
        ? `已将模板「${getPromptTemplateTitle(matchedTemplate)}」带入普通版任务入口，可以直接先试一版。`
        : `已将模板「${getPromptTemplateTitle(matchedTemplate)}」带入专业版控制面板，可继续补参数后生成。`,
    )
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
      const statusText = event.detail.submit
        ? `已按“${event.detail.actionTitle}”继续这一版，正在准备下一轮生成`
        : `已按“${event.detail.actionTitle}”把当前结果带回输入区`

      runtime.setStatus('idle')
      runtime.setStage('idle')
      runtime.setStatusText(statusText)
      runtime.setResponseCollapsed(false)
      runtime.setResponseText(
        [
          `继续这一版：${event.detail.actionTitle}`,
          `当前结果：${previewTitle}`,
          `动作说明：${event.detail.actionDescription}`,
          `下一步：${event.detail.nextStep}`,
        ].join('\n'),
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
                  proPanel: workbench.isProMode
                    ? {
                        workspacePrompt: studioProPrompt.workspacePrompt,
                        finalPrompt: studioProPrompt.finalPrompt,
                        selectedStyleTokens,
                        promptSections: studioProPrompt.sections,
                        finalPromptLength: studioProPrompt.finalPromptLength,
                        workspacePromptLength: studioProPrompt.workspacePromptLength,
                        enabledSectionCount: studioProPrompt.enabledSectionCount,
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
                        replayContext: proReplayContext,
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
            onApply: templateActions.handleApplyPromptTemplate,
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
