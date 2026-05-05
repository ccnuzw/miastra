import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useDrawCardSettings } from '@/features/draw-card/useDrawCardSettings'
import { useGenerationFlow } from '@/features/generation/useGenerationFlow'
import { useGenerationRuntime } from '@/features/generation/useGenerationRuntime'
import { usePromptTemplateActions } from '@/features/prompt-templates/usePromptTemplateActions'
import { usePromptTemplates } from '@/features/prompt-templates/usePromptTemplates'
import { useProviderConfig } from '@/features/provider/useProviderConfig'
import { useReferenceImages } from '@/features/references/useReferenceImages'
import { useStudioSettings } from '@/features/studio/useStudioSettings'
import {
  buildStudioProPromptPreview,
  resolveSelectedStudioStyleTokens,
} from '@/features/studio-pro/studioPro.utils'
import { StudioShellCallout } from '@/features/studio-shared/StudioShellCallout'
import { StudioWorkbenchModeSwitch } from '@/features/studio-shared/StudioWorkbenchModeSwitch'
import { useStudioWorkbenchMode } from '@/features/studio-shared/useStudioWorkbenchMode'
import { useWorksGallery } from '@/features/works/useWorksGallery'
import { buildReferenceImagesFromWork, consumeWorkReplayPayload } from '@/features/works/workReplay'
import type { GalleryImage } from '@/features/works/works.types'
import { getErrorDisplay } from '@/shared/errors/app-error'
import { createDownloadResultError, downloadImage, downloadWorksZip } from '@/shared/utils/download'
import { StudioEditorColumn } from './studio/StudioEditorColumn'
import { StudioGenerationColumn } from './studio/StudioGenerationColumn'
import { StudioWorksColumn } from './studio/StudioWorksColumn'

const StudioOverlayHost = lazy(async () => ({
  default: (await import('./studio/StudioOverlayHost')).StudioOverlayHost,
}))

export function StudioPage() {
  const workbench = useStudioWorkbenchMode()
  const provider = useProviderConfig()
  const studio = useStudioSettings()
  const reference = useReferenceImages()
  const runtime = useGenerationRuntime()
  const draw = useDrawCardSettings()
  const works = useWorksGallery({ batchId: draw.activeBatchId })
  const templates = usePromptTemplates()
  const [includeMetadata, setIncludeMetadata] = useState(true)

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
  const studioProPromptPreview = buildStudioProPromptPreview({
    prompt: studio.prompt,
    negativePrompt: studio.negativePrompt,
    detailStrength: studio.detailStrength,
    detailTone: studio.detailTone,
    selectedStyleTokens,
  })
  const headerStatusText = workbench.isProMode
    ? provider.connectionLabel
    : provider.loading
      ? '正在恢复创作服务'
      : '切换模式不会丢失当前输入和结果'

  const editorTopSlot = useMemo(() => {
    if (workbench.isConsumerMode) {
      return (
        <StudioShellCallout
          eyebrow="引导"
          title="从一句话或一张图开始"
          description="可以直接描述你想做什么，也可以先上传图片，再告诉我想保留什么、想改哪里。"
          tone="accent"
        >
          <div className="flex flex-wrap gap-2">
            <span className="status-pill">
              {reference.hasReferenceImage
                ? `已上传 ${reference.referenceImages.length} 张参考图`
                : '可直接先从文字开始'}
            </span>
            <span className="status-pill">
              {studio.studioMode === 'draw' ? '当前会一次多试几版' : '当前先出单张结果'}
            </span>
          </div>
        </StudioShellCallout>
      )
    }

    return (
      <StudioShellCallout
        eyebrow="控制"
        title="完整设置已展开到进阶控制视图"
        description="进阶模式会在现有输入区下方补充最终 Prompt、参数快照和当前 Provider / 模型信息，简洁模式不会出现这些控制块。"
        tone="accent"
      >
        <div className="flex flex-wrap gap-2">
          <span className="status-pill">{provider.providerStatusLabel}</span>
          <span className="status-pill">{provider.modelStatusLabel}</span>
          <span className="status-pill">{studio.stream ? '流式回传开启' : '流式回传关闭'}</span>
        </div>
      </StudioShellCallout>
    )
  }, [
    provider.modelStatusLabel,
    provider.providerStatusLabel,
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
          description="第一版结果出来后，可以直接基于当前结果继续修改，不需要重新从头开始。"
        >
          <div className="flex flex-wrap gap-2">
            <span className="status-pill">{activePreview ? '已有当前预览' : '等待生成结果'}</span>
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
    (item: GalleryImage, autoGenerate = false, subject = '作品') => {
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

      runtime.setStatus('success')
      runtime.setStatusText(
        autoGenerate && canRestoreAllReferences
          ? `已恢复${subject}参数，正在复跑：${requestPrompt}`
          : expectedReferenceCount > referenceImages.length
            ? `已恢复${subject}参数，但参考图未完整保存，请先补齐参考图后再复跑`
            : `已恢复${subject}参数，可以直接再次生成`,
      )

      return autoGenerate && canRestoreAllReferences
    },
    [draw, reference, runtime, studio],
  )

  useEffect(() => {
    const replay = consumeWorkReplayPayload()
    if (!replay) return
    const subject = replay.origin === 'task' ? '任务' : '作品'
    const shouldAutoGenerate = applyWorkReplay(replay.work, replay.autoGenerate, subject)
    if (!shouldAutoGenerate) return
    window.setTimeout(() => {
      document
        .getElementById('studio-form')
        ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    }, 0)
  }, [applyWorkReplay])

  function handleGenerateStrategy(value: typeof draw.drawStrategy) {
    const next = draw.applyDrawStrategy(value)
    if (next?.quality) studio.setQuality(next.quality)
  }

  function handleShortcut(preset: 'safe3' | 'balanced5' | 'fast8' | 'turbo10') {
    const next = draw.applyDrawShortcut(preset)
    if (next?.quality) studio.setQuality(next.quality)
  }

  function handleReuseParameters(item: GalleryImage) {
    applyWorkReplay(item, false)
  }

  function handleRegenerateFromParameters(item: GalleryImage) {
    const canAutoGenerate = applyWorkReplay(item, true)
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
              <p className="eyebrow">{workbench.isConsumerMode ? 'Consumer' : 'Studio'}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                {workbench.isProMode ? '专业创作工作台' : '开始做一张图'}
              </h1>
              <p className="mt-2 text-sm text-porcelain-100/60">
                {workbench.isConsumerMode
                  ? '一句话描述，或上传一张图，我们帮你开始；先出第一版，不满意再继续改。'
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
                        finalPrompt: studioProPromptPreview,
                        selectedStyleTokens,
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
                      }
                    : null,
                }}
                advancedProps={{
                  detailStrength: studio.detailStrength,
                  detailTone: studio.detailTone,
                  onDetailStrengthChange: studio.setDetailStrength,
                  proPanel: workbench.isProMode
                    ? {
                        providerLabel: provider.providerDisplayName,
                        providerId: provider.activeProviderId,
                        providerModeLabel: provider.providerModeLabel,
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
                        ? '先试试看'
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
                  {workbench.isConsumerMode ? '常用描述' : '模板库'}
                </button>
              </div>
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
