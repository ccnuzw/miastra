import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { useDrawCardSettings } from '@/features/draw-card/useDrawCardSettings'
import { useGenerationFlow } from '@/features/generation/useGenerationFlow'
import { useGenerationRuntime } from '@/features/generation/useGenerationRuntime'
import { usePromptTemplateActions } from '@/features/prompt-templates/usePromptTemplateActions'
import { usePromptTemplates } from '@/features/prompt-templates/usePromptTemplates'
import { useProviderConfig } from '@/features/provider/useProviderConfig'
import { useReferenceImages } from '@/features/references/useReferenceImages'
import { useStudioSettings } from '@/features/studio/useStudioSettings'
import { getErrorDisplay } from '@/shared/errors/app-error'
import { createDownloadResultError, downloadImage, downloadWorksZip } from '@/shared/utils/download'
import { useWorksGallery } from '@/features/works/useWorksGallery'
import type { GalleryImage } from '@/features/works/works.types'
import { buildReferenceImagesFromWork, consumeWorkReplayPayload } from '@/features/works/workReplay'
import { StudioEditorColumn } from './studio/StudioEditorColumn'
import { StudioGenerationColumn } from './studio/StudioGenerationColumn'
import { StudioWorksColumn } from './studio/StudioWorksColumn'

const StudioOverlayHost = lazy(async () => ({ default: (await import('./studio/StudioOverlayHost')).StudioOverlayHost }))

export function StudioPage() {
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

  const templateError = templates.error instanceof Error ? templates.error.message : templates.error ? String(templates.error) : null
  const activePreview = runtime.previewImage ?? runtime.livePreview
  const isGenerating = runtime.status === 'loading'

  const applyWorkReplay = useCallback((item: GalleryImage, autoGenerate = false) => {
    const snapshot = item.generationSnapshot
    const workspacePrompt = snapshot?.workspacePrompt || snapshot?.prompt || item.promptText || item.promptSnippet || item.title
    const requestPrompt = snapshot?.requestPrompt || snapshot?.prompt || item.promptText || item.promptSnippet || item.title
    const referenceImages = buildReferenceImagesFromWork(item)
    const expectedReferenceCount = snapshot?.references?.count ?? 0
    const canRestoreAllReferences = expectedReferenceCount === 0 || referenceImages.length === expectedReferenceCount

    studio.setPrompt(workspacePrompt)
    if (snapshot?.size || item.size) studio.setSize(snapshot?.size ?? item.size ?? '')
    if (snapshot?.quality || item.quality) studio.setQuality(snapshot?.quality ?? item.quality ?? '')
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
    runtime.setStatusText(autoGenerate && canRestoreAllReferences
      ? `已恢复作品参数，正在复跑：${requestPrompt}`
      : expectedReferenceCount > referenceImages.length
        ? `已恢复作品参数，但参考图未完整保存，请先补齐参考图后再复跑`
        : `已恢复作品参数，可以直接再次生成`)

    return autoGenerate && canRestoreAllReferences
  }, [
    draw,
    reference,
    runtime,
    studio,
  ])

  useEffect(() => {
    const replay = consumeWorkReplayPayload()
    if (!replay) return
    const shouldAutoGenerate = applyWorkReplay(replay.work, replay.autoGenerate)
    if (!shouldAutoGenerate) return
    window.setTimeout(() => {
      document.getElementById('studio-form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
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
      document.getElementById('studio-form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
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
      <main id="studio" className="mx-auto flex min-h-screen w-full max-w-screen-xl px-4 pb-10 pt-32 md:px-8">
        <section className="panel-shell w-full">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Studio</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">工作台</h1>
              <p className="mt-2 text-sm text-porcelain-100/60">提示词、参数、参考图、抽卡、作品和模板都集中在这里。</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="status-pill">{provider.connectionLabel}</span>
              <span className="status-pill">{provider.config.model || '未配置模型'}</span>
              <button type="button" className="rounded-full border border-signal-cyan/20 bg-signal-cyan/[0.08] px-4 py-2 text-sm font-semibold text-signal-cyan transition hover:border-signal-cyan/50 hover:bg-signal-cyan/[0.16]" onClick={() => provider.setSettingsOpen(true)}>
                编辑配置
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <form id="studio-form" className="space-y-6" onSubmit={generation.handleGenerate}>
              <StudioEditorColumn
                promptProps={{
                  prompt: studio.prompt,
                  referenceImages: reference.referenceImages,
                  hasReferenceImage: reference.hasReferenceImage,
                  inputRef: reference.referenceInputRef,
                  onPromptChange: studio.setPrompt,
                  onReferenceUpload: reference.handleReferenceUpload,
                  onRemoveReference: reference.handleRemoveReferenceImage,
                  onSaveTemplate: templateActions.handleSaveCurrentPromptTemplate,
                  onOpenTemplateLibrary: templateActions.handleOpenTemplateLibrary,
                  templateActionDisabled: isGenerating,
                }}
                parameterProps={{
                  size: studio.size,
                  aspectLabel: studio.aspectLabel,
                  selectedResolutionLabel: studio.selectedResolution.label,
                  resolutionTier: studio.resolutionTier,
                  quality: studio.quality,
                  stream: studio.stream,
                  detailStrength: studio.detailStrength,
                  detailTone: studio.detailTone,
                  negativePrompt: studio.negativePrompt,
                  onAspectChange: studio.setAspectLabel,
                  onResolutionChange: studio.setResolutionTier,
                  onQualityChange: studio.setQuality,
                  onStreamChange: studio.setStream,
                  onDetailStrengthChange: studio.setDetailStrength,
                  onNegativePromptChange: studio.setNegativePrompt,
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
                <button type="submit" className="generate-button" disabled={isGenerating}>
                  {isGenerating ? '生成中…' : '开始生成'}
                </button>
                <button type="button" className="settings-button" onClick={provider.saveProviderConfig}>
                  保存配置
                </button>
                <button type="button" className="settings-button" onClick={() => templateActions.setTemplateLibraryOpen(true)}>
                  模板库
                </button>
              </div>
            </form>

            <StudioGenerationColumn
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

          <div className="mt-8 space-y-6">
            <StudioWorksColumn
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
