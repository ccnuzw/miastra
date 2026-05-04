import { useMemo } from 'react'
import { WorksRail } from '@/features/works/WorksRail'
import type { DrawBatch } from '@/features/draw-card/drawCard.types'
import type { GalleryImage } from '@/features/works/works.types'

const studioWorksDisplayLimit = 12

function getWorkSortTimestamp(item: GalleryImage) {
  return item.createdAt ?? item.assetUpdatedAt ?? 0
}

type StudioWorksColumnProps = {
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
  selectedTags: string[]
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
  onRetry?: (item: GalleryImage) => void
  onToggleSelect: (id: string) => void
  onToggleFavorite: (id: string) => void
  onAddTag: (id: string, tag: string) => void
  onRemoveTag: (id: string, tag: string) => void
  onAddSelectedTag?: (tag: string) => void
  onRemoveSelectedTag?: (tag: string) => void
  onClearSelection: () => void
  onRemoveSelected: () => void
  onDownloadSelected: () => void
  includeMetadata: boolean
  onIncludeMetadataChange: (value: boolean) => void
}

export function StudioWorksColumn(props: StudioWorksColumnProps) {
  const limitedItems = useMemo(() => (
    [...props.items]
      .sort((left, right) => getWorkSortTimestamp(right) - getWorkSortTimestamp(left))
      .slice(0, studioWorksDisplayLimit)
  ), [props.items])

  return (
    <div className="space-y-6">
      <WorksRail {...props} items={limitedItems} />
    </div>
  )
}
