import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImageWallModal } from '@/features/works/ImageWallModal'
import { ImageViewerModal } from '@/features/works/ImageViewerModal'
import { useWorksGallery } from '@/features/works/useWorksGallery'
import type { GalleryImage } from '@/features/works/works.types'
import { queueWorkReplayPayload } from '@/features/works/workReplay'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'
import { createDownloadResultError, downloadImage, downloadWorksZip } from '@/shared/utils/download'

export function WorksPage() {
  const works = useWorksGallery()
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState('')
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [exportError, setExportError] = useState<unknown>(null)
  const [exportMessage, setExportMessage] = useState('')

  async function handleDelete(id: string) {
    setBusyId(id)
    try {
      await works.handleRemoveImage(id)
    } finally {
      setBusyId('')
    }
  }

  function renderWorkCard(work: GalleryImage) {
    const isFavorite = Boolean(work.isFavorite ?? work.favorite)
    const assetSyncLabel = work.assetSyncStatus === 'synced'
      ? '已同步'
      : work.assetSyncStatus === 'pending-sync'
        ? '待同步'
        : work.assetSyncStatus === 'local-only'
          ? '仅本地'
          : null
    return (
      <article key={work.id} className="progress-card">
        {work.src ? <img className="h-56 w-full rounded-2xl object-cover" src={work.src} alt={work.title} /> : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-porcelain-50">{work.title}</h2>
          {isFavorite ? <span className="status-pill">收藏</span> : null}
        </div>
        <p className="mt-2 text-sm text-porcelain-100/60">{work.meta}</p>
        <p className="mt-2 text-xs text-porcelain-100/45">{[work.providerModel, work.size, work.quality].filter(Boolean).join(' · ') || '—'}</p>
        {assetSyncLabel ? <p className="mt-2 text-xs text-signal-cyan">{assetSyncLabel}{work.assetRemoteKey ? ` · ${work.assetRemoteKey}` : ''}</p> : null}
        {work.error ? <ErrorNotice error={work.error} className="mt-3" compact /> : null}
        {Array.isArray(work.tags) && work.tags.length > 0 ? <p className="mt-3 text-xs text-signal-cyan">{work.tags.map((tag) => `#${tag}`).join(' ')}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="rounded-full border border-porcelain-50/10 px-3 py-2 text-xs" onClick={() => works.setViewerImage(work)}>查看</button>
          <button type="button" className="rounded-full border border-porcelain-50/10 px-3 py-2 text-xs" onClick={() => works.toggleWorkFavorite(work.id)}>{isFavorite ? '取消收藏' : '收藏'}</button>
          <button type="button" className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-3 py-2 text-xs text-signal-coral" onClick={() => void handleDelete(work.id)} disabled={busyId === work.id}>{busyId === work.id ? '删除中…' : '删除'}</button>
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
    queueWorkReplayPayload({ work, autoGenerate })
    navigate('/app/studio')
  }

  return (
    <>
      <main className="mx-auto flex min-h-screen w-full max-w-screen-xl px-4 pb-10 pt-32 md:px-8">
        <section className="panel-shell w-full">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Assets</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">作品资产</h1>
              <p className="mt-2 text-sm text-porcelain-100/60">统一查看收藏、标签、筛选与批量管理入口。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-full border border-porcelain-50/10 px-4 py-2 text-sm" type="button" onClick={() => void works.refresh()}>刷新</button>
              <button className="rounded-full border border-porcelain-50/10 px-4 py-2 text-sm" type="button" onClick={() => void works.clearWorkFilters()}>清空筛选</button>
              <button className="rounded-full border border-porcelain-50/10 px-4 py-2 text-sm" type="button" onClick={() => void works.setWallOpen(true)}>打开图片墙</button>
            </div>
          </div>

          {works.error ? <ErrorNotice error={works.error} className="mt-6" /> : null}
          {exportError ? <ErrorNotice error={exportError} className="mt-6" /> : null}
          {exportMessage ? <p className="mt-6 rounded-2xl border border-signal-cyan/30 bg-signal-cyan/10 px-4 py-3 text-sm text-signal-cyan">{exportMessage}</p> : null}
          {works.loading ? <p className="mt-6 text-sm text-porcelain-100/60">正在加载作品…</p> : null}

          <div className="mt-6 grid gap-3 rounded-[1.4rem] border border-porcelain-50/10 bg-ink-950/[0.38] p-3 md:grid-cols-[1fr_auto_auto]">
            <label className="flex min-w-0 items-center gap-2 rounded-full border border-porcelain-50/10 bg-ink-950/60 px-3 py-2 text-xs text-porcelain-100/55 focus-within:border-signal-cyan/55">
              <input
                value={works.workSearchQuery}
                onChange={(event) => works.setWorkSearchQuery(event.target.value)}
                placeholder="搜索标题、Prompt、模型、尺寸、质量、标签、批次、状态、错误"
                className="w-full min-w-0 bg-transparent text-sm font-semibold text-porcelain-50 outline-none placeholder:text-porcelain-100/30"
              />
            </label>
            <button type="button" onClick={() => works.setFavoritesOnly(!works.favoritesOnly)} className={`batch-chip ${works.favoritesOnly ? 'batch-chip-active' : ''}`}>收藏</button>
            <button type="button" onClick={() => works.clearWorkFilters()} className="batch-chip">清空</button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {works.filteredGallery.map(renderWorkCard)}
            {!works.loading && works.filteredGallery.length === 0 ? <div className="progress-card text-sm text-porcelain-100/60">当前没有匹配作品。</div> : null}
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
