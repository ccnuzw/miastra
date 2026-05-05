import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImageViewerModal } from '@/features/works/ImageViewerModal'
import { ImageWallModal } from '@/features/works/ImageWallModal'
import { useWorksGallery } from '@/features/works/useWorksGallery'
import {
  getWorkReplayActionLabels,
  getWorkReplayGuide,
  getWorkReplayReferenceSummary,
  getWorkReplayStatusText,
  getWorkVersionSourceSummary,
  queueWorkReplayPayload,
} from '@/features/works/workReplay'
import { getAssetSyncLabel } from '@/features/works/works.asset'
import type { GalleryImage } from '@/features/works/works.types'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'
import { createDownloadResultError, downloadImage, downloadWorksZip } from '@/shared/utils/download'

export function WorksPage() {
  const works = useWorksGallery()
  const navigate = useNavigate()
  const replayLabels = getWorkReplayActionLabels('work')
  const [busyId, setBusyId] = useState('')
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [exportError, setExportError] = useState<unknown>(null)
  const [exportMessage, setExportMessage] = useState('')
  const hasActiveFilters =
    Boolean(works.workSearchQuery.trim()) || works.favoritesOnly || Boolean(works.activeTagFilter)
  const replayRecoveryPendingCount = useMemo(
    () =>
      works.filteredGallery.filter(
        (work) => getWorkReplayReferenceSummary(work).missingReferenceCount > 0,
      ).length,
    [works.filteredGallery],
  )
  const missingPreviewCount = useMemo(
    () => works.filteredGallery.filter((work) => !work.src).length,
    [works.filteredGallery],
  )

  async function handleDelete(id: string) {
    setBusyId(id)
    try {
      await works.handleRemoveImage(id)
    } finally {
      setBusyId('')
    }
  }

  function renderWorkCard(work: GalleryImage) {
    const isFavorite = Boolean(work.isFavorite)
    const assetSyncLabel = getAssetSyncLabel(work.assetSyncStatus)
    const replaySummary = getWorkReplayReferenceSummary(work)
    const replayStatusText = getWorkReplayStatusText(replaySummary)
    const versionSource = getWorkVersionSourceSummary(work)
    const recommendedDirectLinks = versionSource.recommendedDirectLinkIds.reduce<
      typeof versionSource.directLinks
    >((accumulator, id) => {
      const matchedLink = versionSource.directLinks.find((item) => item.id === id)
      return matchedLink ? [...accumulator, matchedLink] : accumulator
    }, [])
    const changedDeltaItems = versionSource.deltaItems.filter((item) => item.tone !== 'carry')
    const compactDeltaItems = changedDeltaItems.length
      ? changedDeltaItems.slice(0, 2)
      : versionSource.deltaItems.slice(0, 1)
    const replayActions = [
      {
        id: 'continue-version',
        label:
          versionSource.recommendedActionId === 'continue-version'
            ? `推荐：${replayLabels.restore}`
            : replayLabels.restore,
        autoGenerate: false,
        className:
          versionSource.recommendedActionId === 'continue-version'
            ? 'rounded-full border border-signal-cyan/35 bg-signal-cyan/15 px-3 py-2 text-xs font-semibold text-signal-cyan'
            : 'rounded-full border border-porcelain-50/10 px-3 py-2 text-xs',
      },
      {
        id: 'branch-version',
        label:
          versionSource.recommendedActionId === 'branch-version'
            ? `推荐：${replayLabels.regenerate}`
            : replayLabels.regenerate,
        autoGenerate: true,
        className:
          versionSource.recommendedActionId === 'branch-version'
            ? 'rounded-full border border-emerald-300/35 bg-emerald-300/[0.14] px-3 py-2 text-xs font-semibold text-emerald-200'
            : 'rounded-full border border-emerald-300/25 bg-emerald-300/[0.08] px-3 py-2 text-xs font-semibold text-emerald-200',
      },
    ].sort((left, right) => Number(right.id === versionSource.recommendedActionId) - Number(left.id === versionSource.recommendedActionId))
    return (
      <article key={work.id} className="progress-card">
        {work.src ? (
          <img className="h-56 w-full rounded-2xl object-cover" src={work.src} alt={work.title} />
        ) : (
          <div className="flex h-56 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-porcelain-50/15 bg-ink-950/[0.32] px-4 text-center">
            <p className="text-sm font-semibold text-porcelain-50">预览图暂未恢复</p>
            <p className="mt-2 text-xs leading-6 text-porcelain-100/55">
              当前仍可继续回流参数或重跑这一版，但查看大图前建议先刷新作品库，确认资源已同步落下。
            </p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-porcelain-50">{work.title}</h2>
          {isFavorite ? <span className="status-pill">收藏</span> : null}
        </div>
        <p className="mt-2 text-sm text-porcelain-100/60">{work.meta}</p>
        <p className="mt-2 text-xs text-porcelain-100/45">
          {[work.providerModel, work.size, work.quality].filter(Boolean).join(' · ') || '—'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-signal-cyan/20 bg-signal-cyan/[0.08] px-3 py-1 text-[11px] font-semibold text-signal-cyan">
            {versionSource.originLabel}
          </span>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-1 text-[11px] font-semibold text-emerald-200">
            {versionSource.sourceKindLabel}
          </span>
          <span className="rounded-full border border-signal-amber/20 bg-signal-amber/[0.08] px-3 py-1 text-[11px] font-semibold text-signal-amber">
            建议：{versionSource.recommendedActionLabel}
          </span>
          <span className="rounded-full border border-porcelain-50/10 bg-porcelain-50/[0.04] px-3 py-1 text-[11px] text-porcelain-100/58">
            场景：{versionSource.sceneLabel}
          </span>
          <span className="rounded-full border border-porcelain-50/10 bg-porcelain-50/[0.04] px-3 py-1 text-[11px] text-porcelain-100/58">
            {versionSource.currentLabel}
          </span>
          {versionSource.quickDeltaLabels.map((label) => (
            <span
              key={`${work.id}:${label}`}
              className="rounded-full border border-signal-amber/20 bg-signal-amber/[0.08] px-3 py-1 text-[11px] font-semibold text-signal-amber"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="mt-3 rounded-[1.1rem] border border-porcelain-50/10 bg-ink-950/[0.32] p-3 text-xs text-porcelain-100/58">
          <div className="grid gap-2 md:grid-cols-3">
            <div className="rounded-2xl border border-signal-amber/20 bg-signal-amber/[0.08] px-3 py-2">
              <p className="text-[11px] font-semibold text-signal-amber">建议动作</p>
              <p className="mt-1 font-semibold text-porcelain-50">{versionSource.recommendedActionLabel}</p>
              <p className="mt-1">{versionSource.recommendedActionSummary}</p>
            </div>
            <div className="rounded-2xl border border-signal-cyan/20 bg-signal-cyan/[0.08] px-3 py-2">
              <p className="text-[11px] font-semibold text-signal-cyan">优先直达</p>
              <p className="mt-1 font-semibold text-porcelain-50">{versionSource.recommendedDirectLinksLabel}</p>
              <p className="mt-1">{versionSource.deltaHeadline}</p>
            </div>
            <div className="rounded-2xl border border-porcelain-50/10 bg-porcelain-50/[0.03] px-3 py-2">
              <p className="text-[11px] font-semibold text-porcelain-50">判断提示</p>
              <p className="mt-1">{versionSource.decisionSummary}</p>
              <p className="mt-1 text-porcelain-100/45">{versionSource.actionDecisionReason}</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {recommendedDirectLinks.slice(0, 2).map((item) => (
              <div
                key={`${work.id}:${item.id}`}
                className="rounded-2xl border border-porcelain-50/10 bg-porcelain-50/[0.03] px-3 py-2"
              >
                <p className="text-[11px] font-semibold text-porcelain-50">{item.label}</p>
                <p className="mt-1">{item.summary}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2">
            {compactDeltaItems.map((item) => (
              <div
                key={`${work.id}:${item.id}`}
                className="rounded-2xl border border-porcelain-50/10 bg-porcelain-50/[0.03] px-3 py-2"
              >
                <p className="text-[11px] font-semibold text-porcelain-50">
                  {item.label} · {item.toneLabel}
                </p>
                <p className="mt-1">{item.summary}</p>
                {item.detail ? <p className="mt-1 text-porcelain-100/45">{item.detail}</p> : null}
              </div>
            ))}
          </div>
          <p className="mt-3">{versionSource.parentDeltaLabel}</p>
          <p>{versionSource.sourceDeltaLabel}</p>
        </div>
        <p
          className={`mt-2 text-xs ${replaySummary.missingReferenceCount > 0 ? 'text-signal-coral' : 'text-signal-cyan'}`}
        >
          {replayStatusText}
        </p>
        {assetSyncLabel ? (
          <p className="mt-2 text-xs text-signal-cyan">
            {assetSyncLabel}
            {work.assetRemoteKey ? ` · ${work.assetRemoteKey}` : ''}
          </p>
        ) : null}
        {work.error ? <ErrorNotice error={work.error} className="mt-3" compact /> : null}
        {Array.isArray(work.tags) && work.tags.length > 0 ? (
          <p className="mt-3 text-xs text-signal-cyan">
            {work.tags.map((tag) => `#${tag}`).join(' ')}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {replayActions.map((action) => (
            <button
              key={`${work.id}:${action.id}`}
              type="button"
              className={action.className}
              onClick={() => handleReuseParameters(work, action.autoGenerate)}
            >
              {action.label}
            </button>
          ))}
          <button
            type="button"
            className="rounded-full border border-porcelain-50/10 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => works.setViewerImage(work)}
            disabled={!work.src}
          >
            查看
          </button>
          <button
            type="button"
            className="rounded-full border border-porcelain-50/10 px-3 py-2 text-xs"
            onClick={() => works.toggleWorkFavorite(work.id)}
          >
            {isFavorite ? '取消收藏' : '收藏'}
          </button>
          <button
            type="button"
            className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-3 py-2 text-xs text-signal-coral"
            onClick={() => void handleDelete(work.id)}
            disabled={busyId === work.id}
          >
            {busyId === work.id ? '删除中…' : '删除'}
          </button>
        </div>
      </article>
    )
  }

  async function handleDownloadSelected() {
    if (!works.selectedWorks.length) return
    setExportError(null)
    setExportMessage('')
    const result = await downloadWorksZip(works.selectedWorks, { includeMetadata })
    const nextError = createDownloadResultError(result)
    if (nextError) {
      setExportError(nextError)
      return
    }
    setExportMessage(`批量导出完成，共导出 ${result.imageCount} 项。`)
  }

  function handleReuseParameters(work: GalleryImage, autoGenerate = false) {
    queueWorkReplayPayload({
      work,
      autoGenerate,
      origin: 'work',
      intent: autoGenerate ? 'branch-version' : 'continue-version',
    })
    navigate('/app/studio')
  }

  return (
    <>
      <main className="app-page-shell app-page-shell-wide">
        <section className="panel-shell w-full">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Assets</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">作品资产</h1>
              <p className="mt-2 text-sm text-porcelain-100/60">
                统一查看收藏、标签、筛选、批量管理和继续创作入口。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-full border border-porcelain-50/10 px-4 py-2 text-sm"
                type="button"
                onClick={() => void works.refresh()}
              >
                刷新
              </button>
              <button
                className="rounded-full border border-porcelain-50/10 px-4 py-2 text-sm"
                type="button"
                onClick={() => void works.clearWorkFilters()}
              >
                清空筛选
              </button>
              <button
                className="rounded-full border border-porcelain-50/10 px-4 py-2 text-sm"
                type="button"
                onClick={() => void works.setWallOpen(true)}
              >
                打开图片墙
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-[1.35rem] border border-signal-cyan/20 bg-signal-cyan/[0.08] px-4 py-3 text-sm text-porcelain-100/78">
            {getWorkReplayGuide('work')}
          </div>

          {works.error ? <ErrorNotice error={works.error} className="mt-6" /> : null}
          {exportError ? <ErrorNotice error={exportError} className="mt-6" /> : null}
          {works.error ? (
            <div className="mt-6 rounded-[1.3rem] border border-signal-coral/20 bg-signal-coral/10 px-4 py-3 text-sm text-porcelain-100/78">
              作品列表没有完整加载成功。当前无法保证回流链、批量导出和标签筛选是最新状态；建议先刷新作品库后再继续从这里回到工作台。
            </div>
          ) : null}
          {!works.loading && !works.error && replayRecoveryPendingCount > 0 ? (
            <div className="mt-6 rounded-[1.3rem] border border-signal-amber/20 bg-signal-amber/[0.08] px-4 py-3 text-sm text-porcelain-100/78">
              当前筛选结果里有 {replayRecoveryPendingCount} 项作品回流时需要手动补参考图。继续这一版仍可用，但自动重跑前建议先回工作台补齐参考图。
            </div>
          ) : null}
          {!works.loading && !works.error && missingPreviewCount > 0 ? (
            <div className="mt-6 rounded-[1.3rem] border border-porcelain-50/10 bg-ink-950/[0.35] px-4 py-3 text-sm text-porcelain-100/70">
              当前筛选结果里有 {missingPreviewCount} 项作品只有参数快照、预览图未完全恢复。它们仍可继续回流控制区，但查看和人工验收前建议先刷新作品库确认资源同步完成。
            </div>
          ) : null}
          {exportMessage ? (
            <p className="mt-6 rounded-2xl border border-signal-cyan/30 bg-signal-cyan/10 px-4 py-3 text-sm text-signal-cyan">
              {exportMessage}
            </p>
          ) : null}
          {works.loading ? (
            <p className="mt-6 text-sm text-porcelain-100/60">正在加载作品…</p>
          ) : null}

          <div className="mt-6 grid gap-3 rounded-[1.4rem] border border-porcelain-50/10 bg-ink-950/[0.38] p-3 md:grid-cols-[1fr_auto_auto]">
            <label className="flex min-w-0 items-center gap-2 rounded-full border border-porcelain-50/10 bg-ink-950/60 px-3 py-2 text-xs text-porcelain-100/55 focus-within:border-signal-cyan/55">
              <input
                value={works.workSearchQuery}
                onChange={(event) => works.setWorkSearchQuery(event.target.value)}
                placeholder="搜索标题、Prompt、模型、尺寸、质量、标签、批次、状态、错误"
                className="w-full min-w-0 bg-transparent text-sm font-semibold text-porcelain-50 outline-none placeholder:text-porcelain-100/30"
              />
            </label>
            <button
              type="button"
              onClick={() => works.setFavoritesOnly(!works.favoritesOnly)}
              className={`batch-chip ${works.favoritesOnly ? 'batch-chip-active' : ''}`}
            >
              收藏
            </button>
            <button type="button" onClick={() => works.clearWorkFilters()} className="batch-chip">
              清空
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4 min-[1680px]:grid-cols-5 min-[1920px]:grid-cols-6">
            {works.filteredGallery.map(renderWorkCard)}
            {!works.loading && works.filteredGallery.length === 0 ? (
              <div className="progress-card">
                <p className="text-base font-semibold text-porcelain-50">
                  {hasActiveFilters ? '当前筛选下没有匹配作品' : '当前还没有作品'}
                </p>
                <p className="mt-2 text-sm leading-6 text-porcelain-100/60">
                  {hasActiveFilters
                    ? '这属于筛空态。清空关键词、标签或收藏筛选后，就可以继续从作品回流到工作台。'
                    : '先去工作台出第一版结果，作品回流、继续这一版和批量管理入口都会在这里出现。'}
                </p>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    className="mt-4 rounded-full border border-porcelain-50/10 px-4 py-2 text-sm"
                    onClick={() => works.clearWorkFilters()}
                  >
                    清空筛选
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <ImageViewerModal
        image={works.viewerImage}
        onClose={() => works.setViewerImage(null)}
        onDownload={downloadImage}
        onPushReference={undefined}
        onReuseParameters={(item) => handleReuseParameters(item, false)}
        onRegenerateFromParameters={(item) => handleReuseParameters(item, true)}
      />
      <ImageWallModal
        open={works.wallOpen}
        gallery={works.gallery}
        totalCount={works.gallery.length}
        selectedIds={works.selectedWorkIds}
        searchQuery={works.workSearchQuery}
        availableTags={works.availableTags}
        activeTag={works.activeTagFilter}
        favoritesOnly={works.favoritesOnly}
        selectedTags={works.selectedWorkTags}
        onClose={() => works.setWallOpen(false)}
        onPreview={works.setViewerImage}
        onDownload={downloadImage}
        onDownloadSelected={() => void handleDownloadSelected()}
        includeMetadata={includeMetadata}
        onIncludeMetadataChange={setIncludeMetadata}
        onPushReference={undefined}
        onToggleSelect={works.toggleWorkSelection}
        onToggleFavorite={works.toggleWorkFavorite}
        onAddTag={works.addWorkTag}
        onRemoveTag={works.removeWorkTag}
        onAddSelectedTag={works.addTagToSelectedWorks}
        onRemoveSelectedTag={works.removeTagFromSelectedWorks}
        onClearSelection={works.clearWorkSelection}
        onRemoveSelected={works.removeSelectedWorks}
        onRemove={works.handleRemoveImage}
        onSearchChange={works.setWorkSearchQuery}
        onTagChange={works.setActiveTagFilter}
        onFavoritesOnlyChange={works.setFavoritesOnly}
        onClearFilters={works.clearWorkFilters}
      />
    </>
  )
}
