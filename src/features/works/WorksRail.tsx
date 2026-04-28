import { Images, Trash2, X } from 'lucide-react'
import type { DrawBatch } from '@/features/draw-card/drawCard.types'
import { WorkTile } from './WorkTile'
import type { GalleryImage } from './works.types'

type WorksRailProps = {
  items: GalleryImage[]
  totalCount: number
  batches: DrawBatch[]
  activeBatchId: string
  selectedIds: string[]
  onBatchChange: (batchId: string) => void
  onOpenWall: () => void
  onPreview: (item: GalleryImage) => void
  onDownload: (item: GalleryImage) => void
  onPushReference: (item: GalleryImage) => void
  onRemove: (id: string) => void
  onToggleSelect: (id: string) => void
  onClearSelection: () => void
  onRemoveSelected: () => void
  onDownloadSelected: () => void
}

export function WorksRail({
  items,
  totalCount,
  batches,
  activeBatchId,
  selectedIds,
  onBatchChange,
  onOpenWall,
  onPreview,
  onDownload,
  onPushReference,
  onRemove,
  onToggleSelect,
  onClearSelection,
  onRemoveSelected,
  onDownloadSelected,
}: WorksRailProps) {
  const taskCount = items.filter((item) => item.taskStatus).length
  const selectedCount = selectedIds.length

  return (
    <div className="works-panel works-panel-stacked">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Works Rail</p>
          <h3 className="font-display text-2xl">生成作品</h3>
          <p className="mt-1 text-xs font-semibold text-porcelain-100/45">
            最近 10 项 · 全部 {totalCount} 张{taskCount ? ` · 任务 ${taskCount} 个` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedCount > 0 && (
            <div className="bulk-action-bar">
              <span>已选 {selectedCount}</span>
              <button type="button" onClick={onDownloadSelected} className="bulk-ghost">下载</button>
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
