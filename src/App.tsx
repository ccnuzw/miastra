import { useState } from 'react'
import {
  BadgeCheck,
  Bolt,
  Loader2,
  Settings2,
  Sparkles,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { PreviewStage } from '@/features/generation/PreviewStage'
import { ResponsePanel } from '@/features/generation/ResponsePanel'
import { ProviderModal } from '@/features/provider/ProviderModal'
import { useProviderConfig } from '@/features/provider/useProviderConfig'
import { ImageViewerModal } from '@/features/works/ImageViewerModal'
import { ImageWallModal } from '@/features/works/ImageWallModal'
import { WorksRail } from '@/features/works/WorksRail'
import { filterWorksGallery, useWorksGallery } from '@/features/works/useWorksGallery'
import { DrawCardPanel } from '@/features/draw-card/DrawCardPanel'
import { useDrawCardSettings } from '@/features/draw-card/useDrawCardSettings'
import { PromptTemplateLibrary, type PromptTemplateListItem } from '@/features/prompt-templates/PromptTemplateLibrary'
import { usePromptTemplates } from '@/features/prompt-templates/usePromptTemplates'
import { ParameterPanel } from '@/features/studio/ParameterPanel'
import { PromptComposer } from '@/features/studio/PromptComposer'
import { StyleTokensPanel } from '@/features/studio/StyleTokensPanel'
import { aspectSizeMap } from '@/features/studio/studio.constants'
import { useStudioSettings } from '@/features/studio/useStudioSettings'
import { useReferenceImages } from '@/features/references/useReferenceImages'
import type { GalleryImage } from '@/features/works/works.types'
import { clampDrawCount } from '@/features/draw-card/drawCard.utils'
import { stageLabels } from '@/features/generation/generation.constants'
import { useGenerationRuntime } from '@/features/generation/useGenerationRuntime'
import { useGenerationFlow } from '@/features/generation/useGenerationFlow'
import { formatElapsed, waitingHint } from '@/features/generation/generation.utils'
import { downloadImage, downloadWorksZip } from '@/shared/utils/download'

type SavePromptTemplateInput = {
  title: string
  content: string
}

type SavePromptTemplate = (template: SavePromptTemplateInput) => Promise<unknown> | unknown
type DeletePromptTemplate = (templateId: string) => Promise<unknown> | unknown

function createPromptTemplateTitle(content: string) {
  const firstLine = content.split('\n').find((line) => line.trim())?.trim() ?? 'Prompt 模板'
  return firstLine.length > 28 ? `${firstLine.slice(0, 28)}…` : firstLine
}

function App() {
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false)
  const [templateFeedback, setTemplateFeedback] = useState('')
  const [includeZipMetadata, setIncludeZipMetadata] = useState(true)
  const {
    templates: promptTemplates,
    loading: promptTemplatesLoading,
    error: promptTemplatesError,
    saveTemplate,
    deleteTemplate,
    refresh: refreshPromptTemplates,
  } = usePromptTemplates()
  const promptTemplateErrorText = promptTemplatesError
    ? promptTemplatesError instanceof Error ? promptTemplatesError.message : String(promptTemplatesError)
    : null

  const {
    status,
    statusText,
    responseText,
    responseCollapsed,
    liveImageSrc,
    previewImage,
    stage,
    elapsedMs,
    debounceMs,
    drawQueuePaused,
    abortRef,
    cancelRequestedRef,
    drawQueuePausedRef,
    taskControllersRef,
    drawTaskSnapshotsRef,
    pauseResolversRef,
    debounceTimerRef,
    startedAtRef,
    progressValue,
    isBusy,
    livePreview,
    responseSummary,
    setStatus,
    setStatusText,
    setResponseText,
    setResponseCollapsed,
    setLiveImageSrc,
    setPreviewImage,
    setStage,
    setElapsedMs,
    setDebounceMs,
    setDrawQueuePaused,
  } = useGenerationRuntime()


  const {
    config,
    draftConfig,
    settingsOpen,
    requestUrl,
    editRequestUrl,
    activePreset,
    setDraftConfig,
    setSettingsOpen,
    applyProviderSnapshot,
    handleProviderChange,
    saveProviderConfig,
  } = useProviderConfig({
    onSaved: () => {
      setStatus('success')
      setStatusText('Provider 配置已保存到本地')
    },
  })
  const {
    prompt,
    studioMode,
    resolutionTier,
    aspectLabel,
    size,
    quality,
    detailStrength,
    negativePrompt,
    stream,
    selectedStyleTokenIds,
    selectedResolution,
    detailTone,
    setPrompt,
    setStudioMode,
    setResolutionTier,
    setAspectLabel,
    setSize,
    setQuality,
    setDetailStrength,
    setNegativePrompt,
    setStream,
    buildPrompt,
    toggleStyleToken,
    applyTestPreset,
  } = useStudioSettings()
  const {
    drawCount,
    drawStrategy,
    drawConcurrency,
    drawBatches,
    activeBatchId,
    variationStrength,
    enabledVariationDimensions,
    drawDelayMs,
    drawRetries,
    drawTimeoutSec,
    drawSafeMode,
    effectiveDrawConcurrency,
    drawStats,
    taskSlots,
    setDrawCount,
    setDrawStrategy,
    setDrawConcurrency,
    setDrawTasks,
    setDrawBatches,
    setActiveBatchId,
    setVariationStrength,
    setDrawDelayMs,
    setDrawRetries,
    setDrawTimeoutSec,
    setDrawSafeMode,
    setEnabledVariationDimensions,
    toggleVariationDimension,
    applyDrawStrategy,
    applyDrawShortcut,
  } = useDrawCardSettings()
  const {
    gallery,
    wallOpen,
    viewerImage,
    setGallery,
    setWallOpen,
    setViewerImage,
    availableTags,
    workSearchQuery,
    activeTagFilter,
    favoritesOnly,
    setWorkSearchQuery,
    setActiveTagFilter,
    setFavoritesOnly,
    clearWorkFilters,
    selectedWorkIds,
    toggleWorkSelection,
    clearWorkSelection,
    removeSelectedWorks,
    toggleWorkFavorite,
    addWorkTag,
    removeWorkTag,
    handleRemoveImage,
  } = useWorksGallery({
    onRemoveImage: (id) => setPreviewImage((current) => (current?.id === id ? null : current)),
  })
  const {
    referenceImages,
    hasReferenceImage,
    referenceInputRef,
    handleReferenceUpload,
    handleRemoveReferenceImage,
    handlePushReferenceImage,
  } = useReferenceImages({
    onSuccess: (message) => {
      setStatus('success')
      setStatusText(message)
    },
    onError: (message) => {
      setStatus('error')
      setStatusText(message)
    },
  })
  const { handleGenerate, handleCancelGeneration, handlePauseQueue, handleResumeQueue, handleCancelDrawTask, handleRetryDrawTask, handleCancelAllQueue } = useGenerationFlow({
    config,
    requestUrl,
    editRequestUrl,
    prompt,
    studioMode,
    size,
    quality,
    stream,
    referenceImages,
    hasReferenceImage,
    drawCount,
    drawStrategy,
    drawConcurrency,
    drawSafeMode,
    drawTimeoutSec,
    drawDelayMs,
    drawRetries,
    variationStrength,
    enabledVariationDimensions,
    buildPrompt,
    setSettingsOpen,
    setGallery,
    setDrawTasks,
    setDrawBatches,
    setActiveBatchId,
    setStatus,
    setStatusText,
    setResponseText,
    setLiveImageSrc,
    setPreviewImage,
    setStage,
    setElapsedMs,
    setDebounceMs,
    setDrawQueuePaused,
    abortRef,
    cancelRequestedRef,
    drawQueuePausedRef,
    taskControllersRef,
    drawTaskSnapshotsRef,
    pauseResolversRef,
    debounceTimerRef,
    startedAtRef,
    status,
  })

  const activePreview = livePreview ?? previewImage ?? gallery.find((item) => item.src)
  const generateButtonText = isBusy
    ? (studioMode === 'draw' ? '抽卡中' : '生成中')
    : studioMode === 'draw'
      ? `${hasReferenceImage ? '参考图抽卡' : '开始抽卡'} ×${clampDrawCount(drawCount)}`
      : hasReferenceImage ? '参考图生成' : '生成图片'
  const workFilters = {
    batchId: activeBatchId,
    searchQuery: workSearchQuery,
    tag: activeTagFilter,
    favoritesOnly,
  }
  const filteredTasks = filterWorksGallery(taskSlots, workFilters)
  const filteredGallery = filterWorksGallery(gallery, workFilters)
  const visibleWorks = [...filteredTasks, ...filteredGallery]
  const workSlots: GalleryImage[] = Array.from({ length: 10 }, (_, index) => visibleWorks[index] ?? {
    id: `empty-work-slot-${index}`,
    title: '',
    meta: '',
  })

  async function handleTestConnection() {
    if (!config.model || !config.apiKey) {
      setStatus('error')
      setStatusText('请先在设置里补全 Model 和 API Key；Provider API URL 可留空走 /sub2api 代理')
      setSettingsOpen(true)
      return
    }
    applyTestPreset()
    setStatusText('已填入最小测试参数，请点击生成图片验证链路')
  }

  async function handleDownloadSelectedWorks() {
    const selectedWorks = gallery.filter((item) => selectedWorkIds.includes(item.id) && item.src)
    const selectedWithoutImageCount = selectedWorkIds.length - selectedWorks.length

    if (!selectedWorks.length) {
      setStatus('error')
      setStatusText(selectedWorkIds.length ? '已选作品中没有可下载的图片，请避开任务占位项。' : '请先选择要导出的作品')
      return
    }

    setStatus('loading')
    setStatusText(`正在打包 ${selectedWorks.length} 张作品为 ZIP${includeZipMetadata ? '，包含 metadata.json' : ''}…`)

    try {
      const result = await downloadWorksZip(selectedWorks, { includeMetadata: includeZipMetadata })
      const skippedText = selectedWithoutImageCount > 0 ? `，已跳过 ${selectedWithoutImageCount} 个无图片占位项` : ''

      if (!result.blob || result.imageCount === 0) {
        setStatus('error')
        setStatusText(`ZIP 导出失败：没有成功写入图片${skippedText}${result.failedCount ? `，失败 ${result.failedCount} 项` : ''}`)
        return
      }

      if (result.failedCount > 0 || selectedWithoutImageCount > 0) {
        setStatus('error')
        setStatusText(`ZIP 已下载，成功 ${result.imageCount} 张，失败 ${result.failedCount} 项${skippedText}`)
        return
      }

      setStatus('success')
      setStatusText(`ZIP 已下载：${result.imageCount} 张图片${result.metadataIncluded ? '，包含 metadata.json' : ''}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      setStatus('error')
      setStatusText(`ZIP 导出失败：${message}`)
    }
  }

  function handleApplyDrawStrategy(value: Parameters<typeof applyDrawStrategy>[0]) {
    const result = applyDrawStrategy(value)
    if (result?.quality) setQuality(result.quality)
  }

  function handleApplyDrawShortcut(preset: Parameters<typeof applyDrawShortcut>[0]) {
    const result = applyDrawShortcut(preset)
    setQuality(result.quality)
  }

  function handleOpenTemplateLibrary() {
    setTemplateLibraryOpen(true)
    setTemplateFeedback('')
    void Promise.resolve(refreshPromptTemplates()).catch(() => undefined)
  }

  async function handleSaveCurrentPromptTemplate() {
    const content = prompt.trim()
    if (!content) {
      const message = 'Prompt 为空，无法保存为模板'
      setTemplateFeedback(message)
      setStatus('error')
      setStatusText(message)
      return
    }

    try {
      await (saveTemplate as SavePromptTemplate)({
        title: createPromptTemplateTitle(content),
        content,
      })
      const message = '已保存当前 Prompt 为模板'
      setTemplateFeedback(message)
      setStatus('success')
      setStatusText(message)
      void Promise.resolve(refreshPromptTemplates()).catch(() => undefined)
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存 Prompt 模板失败'
      setTemplateFeedback(message)
      setStatus('error')
      setStatusText(message)
    }
  }

  function handleApplyPromptTemplate(template: PromptTemplateListItem) {
    setPrompt(template.content)
    setTemplateLibraryOpen(false)
    setTemplateFeedback('')
    setStatus('success')
    setStatusText(`已应用 Prompt 模板：${template.title || template.name || '未命名模板'}`)
    window.setTimeout(() => document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  async function handleDeletePromptTemplate(templateId: string) {
    try {
      await (deleteTemplate as DeletePromptTemplate)(templateId)
      const message = '已删除 Prompt 模板'
      setTemplateFeedback(message)
      setStatus('success')
      setStatusText(message)
      void Promise.resolve(refreshPromptTemplates()).catch(() => undefined)
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除 Prompt 模板失败'
      setTemplateFeedback(message)
      setStatus('error')
      setStatusText(message)
    }
  }

  function applySnapshotSize(nextSize?: string) {
    if (!nextSize) return
    const matched = Object.entries(aspectSizeMap).flatMap(([aspect, tiers]) =>
      Object.entries(tiers).map(([tier, value]) => ({ aspect, tier, value })),
    ).find((item) => item.value === nextSize)

    if (matched) {
      setAspectLabel(matched.aspect)
      setResolutionTier(matched.tier as Parameters<typeof setResolutionTier>[0])
      return
    }

    setSize(nextSize)
  }

  function handleReuseParameters(image: GalleryImage, options: { regenerate?: boolean } = {}) {
    const snapshot = image.generationSnapshot
    const promptText = snapshot?.workspacePrompt || snapshot?.prompt || image.promptText || image.promptSnippet
    const mode = snapshot?.mode ?? image.mode
    const draw = snapshot?.draw
    const isDrawMode = Boolean(mode?.startsWith('draw') || draw || image.batchId)
    const nextSize = snapshot?.size || image.size
    const nextQuality = snapshot?.quality || image.quality
    const nextModel = snapshot?.model || image.providerModel

    if (promptText) setPrompt(promptText)
    setStudioMode(isDrawMode ? 'draw' : 'create')
    applySnapshotSize(nextSize)
    if (nextQuality) setQuality(nextQuality)
    if (typeof snapshot?.stream === 'boolean') setStream(snapshot.stream)

    applyProviderSnapshot({
      providerId: snapshot?.providerId,
      apiUrl: snapshot?.apiUrl,
      model: nextModel,
    })

    if (draw) {
      setDrawCount(draw.count)
      setDrawStrategy(draw.strategy)
      setDrawConcurrency(draw.concurrency)
      setDrawDelayMs(draw.delayMs)
      setDrawRetries(draw.retries)
      setDrawTimeoutSec(draw.timeoutSec)
      setDrawSafeMode(draw.safeMode)
      setVariationStrength(draw.variationStrength)
      setEnabledVariationDimensions(draw.dimensions)
      setActiveBatchId(draw.batchId)
    } else if (image.batchId) {
      setActiveBatchId(image.batchId)
    }

    const referenceWarning = snapshot?.references?.count || mode?.includes('image2image')
      ? '；参考图文件需重新提供'
      : ''
    setStatus('success')
    setStatusText(options.regenerate
      ? `已复用旧参数${referenceWarning}。为避免状态异步读取旧值，请确认后点击主生成按钮再次生成。`
      : `已将作品参数回填到当前工作区${referenceWarning}。`)
    setViewerImage(null)
    window.setTimeout(() => document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  function handleRegenerateFromParameters(image: GalleryImage) {
    handleReuseParameters(image, { regenerate: true })
  }


  return (
    <main id="top" className="relative min-h-screen overflow-hidden bg-ink-950 text-porcelain-50">
      <div className="absolute inset-0 bg-aurora-radial" />
      <div className="absolute inset-0 bg-lumio-orbit" />
      <div className="studio-grid absolute inset-0" />
      <div className="grain-layer pointer-events-none absolute inset-0" />
      <Header />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 pb-8 pt-24 md:px-8 lg:pt-28">
        <div className="grid flex-1 gap-5 lg:grid-cols-[0.92fr_1.28fr] xl:grid-cols-[0.86fr_1.34fr]">
          <form id="studio" onSubmit={handleGenerate} className="panel-shell flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Image Studio</p>
                <h1 className="mt-2 max-w-2xl font-display text-2xl leading-tight tracking-tight md:text-3xl xl:text-4xl">
                  选择参数，生成图片，管理作品
                </h1>
                <p className="mt-3 max-w-xl text-xs leading-6 text-porcelain-100/[0.56] md:text-sm">
                  主流程聚焦图片创作：提示词、尺寸、质量、生成状态和作品管理。Provider 配置被收进设置弹窗，不干扰创作台。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleTestConnection} className="settings-button" disabled={isBusy}>
                  <Bolt className="h-4 w-4" />
                  测试连接
                </button>
                <button type="button" onClick={() => setSettingsOpen(true)} className="settings-button" disabled={isBusy}>
                  <Settings2 className="h-4 w-4" />
                  Provider 设置
                </button>
              </div>
            </div>

            <div className="progress-card">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="status-pill">
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                      {stageLabels[stage]}
                    </span>
                    <span className="rounded-full border border-porcelain-50/10 bg-porcelain-50/[0.04] px-3 py-1.5 text-xs text-porcelain-100/[0.62]">
                      耗时 {formatElapsed(elapsedMs)}
                    </span>
                    {debounceMs > 0 && (
                      <span className="rounded-full border border-signal-amber/30 bg-signal-amber/10 px-3 py-1.5 text-xs text-signal-amber">
                        防抖 {Math.ceil(debounceMs / 100) / 10}s
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-porcelain-100/[0.66]">{statusText}</p>
                  <p className="mt-1 text-xs leading-5 text-porcelain-100/[0.48]">{waitingHint(stage, elapsedMs)}</p>
                </div>
                {isBusy && (
                  <button type="button" onClick={handleCancelGeneration} className="cancel-button">
                    取消生成
                  </button>
                )}
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-porcelain-50/[0.07]">
                <div className="progress-fill" style={{ width: `${progressValue}%` }} />
              </div>
            </div>

            <DrawCardPanel
              studioMode={studioMode}
              drawStrategy={drawStrategy}
              effectiveDrawConcurrency={effectiveDrawConcurrency}
              drawStats={drawStats}
              drawCount={drawCount}
              drawTimeoutSec={drawTimeoutSec}
              drawDelayMs={drawDelayMs}
              drawRetries={drawRetries}
              variationStrength={variationStrength}
              enabledVariationDimensions={enabledVariationDimensions}
              drawSafeMode={drawSafeMode}
              drawQueuePaused={drawQueuePaused}
              isGenerating={isBusy}
              taskSlots={taskSlots}
              onModeChange={setStudioMode}
              onApplyStrategy={handleApplyDrawStrategy}
              onConcurrencyChange={setDrawConcurrency}
              onDrawCountChange={setDrawCount}
              onTimeoutChange={setDrawTimeoutSec}
              onDelayChange={setDrawDelayMs}
              onRetriesChange={setDrawRetries}
              onVariationStrengthChange={setVariationStrength}
              onToggleDimension={toggleVariationDimension}
              onSafeModeChange={setDrawSafeMode}
              onShortcut={handleApplyDrawShortcut}
              onPauseQueue={handlePauseQueue}
              onResumeQueue={handleResumeQueue}
              onCancelTask={handleCancelDrawTask}
              onRetryTask={handleRetryDrawTask}
              onCancelAllQueue={handleCancelAllQueue}
            />

            <PromptComposer
              prompt={prompt}
              referenceImages={referenceImages}
              hasReferenceImage={hasReferenceImage}
              inputRef={referenceInputRef}
              onPromptChange={setPrompt}
              onReferenceUpload={handleReferenceUpload}
              onRemoveReference={handleRemoveReferenceImage}
              onSaveTemplate={handleSaveCurrentPromptTemplate}
              onOpenTemplateLibrary={handleOpenTemplateLibrary}
              templateActionDisabled={promptTemplatesLoading}
            />

            <ParameterPanel
              size={size}
              aspectLabel={aspectLabel}
              selectedResolutionLabel={selectedResolution.label}
              resolutionTier={resolutionTier}
              quality={quality}
              stream={stream}
              detailStrength={detailStrength}
              detailTone={detailTone}
              negativePrompt={negativePrompt}
              onAspectChange={setAspectLabel}
              onResolutionChange={setResolutionTier}
              onQualityChange={setQuality}
              onStreamChange={setStream}
              onDetailStrengthChange={setDetailStrength}
              onNegativePromptChange={setNegativePrompt}
            />

            <StyleTokensPanel
              selectedIds={selectedStyleTokenIds}
              onToggle={toggleStyleToken}
            />

            <div className="flex flex-col gap-3 rounded-[2rem] border border-porcelain-50/10 bg-ink-950/[0.55] p-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.28em] text-porcelain-100/35">当前服务</p>
                <p className="mt-1 truncate text-sm text-porcelain-100/[0.72]">
                  {activePreset.name} · <span className="font-mono text-signal-cyan">{config.model || '未配置模型'}</span>
                </p>
                {requestUrl.startsWith('/sub2api') && (
                  <p className="mt-1 text-xs text-signal-amber">本地预览已自动通过 Vite 代理访问远端，绕开浏览器 CORS。</p>
                )}
              </div>
              <button type="submit" className="generate-button" disabled={isBusy}>
                {isBusy ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <Sparkles className="h-5 w-5 shrink-0" />}
                <span className="whitespace-nowrap">{generateButtonText}</span>
              </button>
            </div>
          </form>

          <aside className="flex min-w-0 flex-col gap-5">
            <PreviewStage activePreview={activePreview} onPreview={setViewerImage} />
            <ResponsePanel
              responseText={responseText}
              collapsed={responseCollapsed}
              summary={responseSummary}
              onToggle={() => setResponseCollapsed((value) => !value)}
              onClear={() => { setResponseText(''); setResponseCollapsed(true) }}
            />
            <WorksRail
              items={workSlots}
              totalCount={gallery.length}
              filteredCount={filteredGallery.length}
              batches={drawBatches}
              activeBatchId={activeBatchId}
              selectedIds={selectedWorkIds}
              searchQuery={workSearchQuery}
              availableTags={availableTags}
              activeTag={activeTagFilter}
              favoritesOnly={favoritesOnly}
              onBatchChange={setActiveBatchId}
              onSearchChange={setWorkSearchQuery}
              onTagChange={setActiveTagFilter}
              onFavoritesOnlyChange={setFavoritesOnly}
              onClearFilters={clearWorkFilters}
              onOpenWall={() => setWallOpen(true)}
              onPreview={setViewerImage}
              onDownload={downloadImage}
              onPushReference={handlePushReferenceImage}
              onRemove={handleRemoveImage}
              onRetry={handleRetryDrawTask}
              onToggleSelect={toggleWorkSelection}
              onToggleFavorite={toggleWorkFavorite}
              onAddTag={addWorkTag}
              onRemoveTag={removeWorkTag}
              onClearSelection={clearWorkSelection}
              onRemoveSelected={removeSelectedWorks}
              onDownloadSelected={handleDownloadSelectedWorks}
              includeMetadata={includeZipMetadata}
              onIncludeMetadataChange={setIncludeZipMetadata}
            />
          </aside>
        </div>
      </section>

      <ImageViewerModal
        image={viewerImage}
        onClose={() => setViewerImage(null)}
        onDownload={downloadImage}
        onPushReference={handlePushReferenceImage}
        onReuseParameters={handleReuseParameters}
        onRegenerateFromParameters={handleRegenerateFromParameters}
      />

      <ImageWallModal
        open={wallOpen}
        gallery={filteredGallery}
        totalCount={gallery.length}
        selectedIds={selectedWorkIds}
        searchQuery={workSearchQuery}
        availableTags={availableTags}
        activeTag={activeTagFilter}
        favoritesOnly={favoritesOnly}
        onSearchChange={setWorkSearchQuery}
        onTagChange={setActiveTagFilter}
        onFavoritesOnlyChange={setFavoritesOnly}
        onClearFilters={clearWorkFilters}
        onToggleSelect={toggleWorkSelection}
        onToggleFavorite={toggleWorkFavorite}
        onAddTag={addWorkTag}
        onRemoveTag={removeWorkTag}
        onClearSelection={clearWorkSelection}
        onRemoveSelected={removeSelectedWorks}
        onRemove={handleRemoveImage}
        onRetry={handleRetryDrawTask}
        onClose={() => setWallOpen(false)}
        onPreview={setViewerImage}
        onDownload={downloadImage}
        onDownloadSelected={handleDownloadSelectedWorks}
        includeMetadata={includeZipMetadata}
        onIncludeMetadataChange={setIncludeZipMetadata}
        onPushReference={handlePushReferenceImage}
      />

      <PromptTemplateLibrary
        open={templateLibraryOpen}
        templates={promptTemplates}
        loading={promptTemplatesLoading}
        error={promptTemplateErrorText}
        currentPrompt={prompt}
        saveFeedback={templateFeedback}
        onSaveCurrent={handleSaveCurrentPromptTemplate}
        onApply={handleApplyPromptTemplate}
        onDelete={handleDeletePromptTemplate}
        onRefresh={refreshPromptTemplates}
        onClose={() => setTemplateLibraryOpen(false)}
      />

      <ProviderModal
        open={settingsOpen}
        draftConfig={draftConfig}
        onDraftConfigChange={setDraftConfig}
        onProviderChange={handleProviderChange}
        onSave={saveProviderConfig}
        onClose={() => setSettingsOpen(false)}
      />
    </main>
  )
}

export default App