import { Images, Search, Star, Trash2, X } from 'lucide-react'
import type { DrawBatch } from '@/features/draw-card/drawCard.types'
import { WorkTile } from './WorkTile'
import type { GalleryImage } from './works.types'

type WorksRailProps = {
  items: GalleryImage[]
  totalCount: number
  filteredCount: number
  batches: DrawBatch[]
  activeBatchId: string
  selectedIds: string[]
  searchQuery: string
  availableTags: string[]
  activeTag: string
  favoritesOnly: boolean
  onBatchChange: (batchId: string) => void
  onSearchChange: (query: string) => void
  onTagChange: (tag: string) => void
  onFavoritesOnlyChange: (value: boolean) => void
  onClearFilters: () => void
  onOpenWall: () => void
  onPreview: (item: GalleryImage) => void
  onDownload: (item: GalleryImage) => void
  onPushReference: (item: GalleryImage) => void
  onRemove: (id: string) => void
  onToggleSelect: (id: string) => void
  onToggleFavorite: (id: string) => void
  onAddTag: (id: string, tag: string) => void
  onRemoveTag: (id: string, tag: string) => void
  onClearSelection: () => void
  onRemoveSelected: () => void
  onDownloadSelected: () => void
  includeMetadata: boolean
  onIncludeMetadataChange: (value: boolean) => void
}

export function WorksRail({
  items,
  totalCount,
  filteredCount,
  batches,
  activeBatchId,
  selectedIds,
  searchQuery,
  availableTags,
  activeTag,
  favoritesOnly,
  onBatchChange,
  onSearchChange,
  onTagChange,
  onFavoritesOnlyChange,
  onClearFilters,
  onOpenWall,
  onPreview,
  onDownload,
  onPushReference,
  onRemove,
  onToggleSelect,
  onToggleFavorite,
  onAddTag,
  onRemoveTag,
  onClearSelection,
  onRemoveSelected,
  onDownloadSelected,
  includeMetadata,
  onIncludeMetadataChange,
}: WorksRailProps) {
  const taskCount = items.filter((item) => item.taskStatus).length
  const selectedCount = selectedIds.length
  const hasFilters = Boolean(searchQuery.trim() || activeTag !== 'all' || favoritesOnly)

  return (
    <div className="works-panel works-panel-stacked">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Works Rail</p>
          <h3 className="font-display text-2xl">生成作品</h3>
          <p className="mt-1 text-xs font-semibold text-porcelain-100/45">
            最近 10 项 · 全部 {totalCount} 张{hasFilters ? ` · 当前 ${filteredCount} 张` : ''}{taskCount ? ` · 任务 ${taskCount} 个` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedCount > 0 && (
            <div className="bulk-action-bar">
              <span>已选 {selectedCount}</span>
              <button type="button" onClick={onDownloadSelected} className="bulk-ghost">下载 ZIP</button>
              <label className="bulk-metadata-toggle" onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(event) => onIncludeMetadataChange(event.target.checked)}
                />
                <span>metadata.json</span>
              </label>
              <button type="button" onClick={onRemoveSelected} className="bulk-danger"><Trash2 className="h-3.5 w-3.5" />删除</button>
              <button type="button" onClick={onClearSelection} className="bulk-ghost"><X className="h-3.5 w-3.5" />取消</button>
            </div>
          )}
          <button type="button" onClick={onOpenWall} className="more-wall-button">
            <Images className="h-4 w-4" />
            更多
          </button>
        </div>
      </div>
      <div className="mb-3 grid gap-2 rounded-[1.4rem] border border-porcelain-50/10 bg-ink-950/[0.38] p-3">
        <label className="flex min-w-0 items-center gap-2 rounded-full border border-porcelain-50/10 bg-ink-950/60 px-3 py-2 text-xs text-porcelain-100/55 focus-within:border-signal-cyan/55">
          <Search className="h-4 w-4 shrink-0 text-signal-cyan" />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜索标题、Prompt、模型、尺寸、质量、标签"
            className="w-full min-w-0 bg-transparent text-sm font-semibold text-porcelain-50 outline-none placeholder:text-porcelain-100/30"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => onFavoritesOnlyChange(!favoritesOnly)} className={`batch-chip ${favoritesOnly ? 'batch-chip-active' : ''}`}>
            <Star className={`h-3.5 w-3.5 ${favoritesOnly ? 'fill-current' : ''}`} />
            收藏
          </button>
          <button type="button" onClick={() => onTagChange('all')} className={`batch-chip ${activeTag === 'all' ? 'batch-chip-active' : ''}`}>全部标签</button>
          {availableTags.slice(0, 8).map((tag) => (
            <button key={tag} type="button" onClick={() => onTagChange(tag)} className={`batch-chip ${activeTag === tag ? 'batch-chip-active' : ''}`}>#{tag}</button>
          ))}
          {hasFilters && <button type="button" onClick={onClearFilters} className="batch-chip">清空筛选</button>}
        </div>
      </div>
      {batches.length > 0 && (
        <div className="batch-strip" aria-label="抽卡批次筛选">
          <button type="button" onClick={() => onBatchChange('all')} className={`batch-chip ${activeBatchId === 'all' ? 'batch-chip-active' : ''}`}>全部批次</button>
          {batches.slice(0, 5).map((batch) => (
            <button key={batch.id} type="button" onClick={() => onBatchChange(batch.id)} className={`batch-chip ${activeBatchId === batch.id ? 'batch-chip-active' : ''}`}>
              <span>{batch.title}</span>
              <small>{batch.successCount}/{batch.count} · 并发 {batch.concurrency}</small>
            </button>
          ))}
        </div>
      )}
      <div className="works-grid" aria-label="生成作品列表">
        {items.map((item) => (
          <WorkTile
            key={item.id}
            item={item}
            selected={selectedIds.includes(item.id)}
            onToggleSelect={onToggleSelect}
            onToggleFavorite={onToggleFavorite}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
            onPreview={onPreview}
            onDownload={onDownload}
            onPushReference={onPushReference}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  )
}
