import { type ReactNode, useMemo } from 'react'
import type { DrawBatch } from '@/features/draw-card/drawCard.types'
import { StudioShellCallout } from '@/features/studio-shared/StudioShellCallout'
import type {
  StudioShellSectionViewModel,
  StudioWorkbenchMode,
} from '@/features/studio-shared/studioShell.adapters'
import { WorksRail } from '@/features/works/WorksRail'
import type { GalleryImage } from '@/features/works/works.types'

const studioWorksDisplayLimit = 12

function getWorkSortTimestamp(item: GalleryImage) {
  return item.createdAt ?? item.assetUpdatedAt ?? 0
}

export type StudioWorksColumnProps = {
  mode: StudioWorkbenchMode
  shell: StudioShellSectionViewModel
  topSlot?: ReactNode
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
  const {
    mode,
    shell,
    topSlot,
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
    selectedTags,
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
    onRetry,
    onToggleSelect,
    onToggleFavorite,
    onAddTag,
    onRemoveTag,
    onAddSelectedTag,
    onRemoveSelectedTag,
    onClearSelection,
    onRemoveSelected,
    onDownloadSelected,
    includeMetadata,
    onIncludeMetadataChange,
  } = props

  const limitedItems = useMemo(
    () =>
      [...items]
        .sort((left, right) => getWorkSortTimestamp(right) - getWorkSortTimestamp(left))
        .slice(0, studioWorksDisplayLimit),
    [items],
  )

  return (
    <div className="space-y-6" data-workbench-mode={mode}>
      <StudioShellCallout
        eyebrow={shell.eyebrow}
        title={shell.title}
        description={shell.description}
      />
      {topSlot}
      <WorksRail
        items={limitedItems}
        totalCount={totalCount}
        filteredCount={filteredCount}
        batches={batches}
        activeBatchId={activeBatchId}
        selectedIds={selectedIds}
        searchQuery={searchQuery}
        availableTags={availableTags}
        activeTag={activeTag}
        favoritesOnly={favoritesOnly}
        selectedTags={selectedTags}
        onBatchChange={onBatchChange}
        onSearchChange={onSearchChange}
        onTagChange={onTagChange}
        onFavoritesOnlyChange={onFavoritesOnlyChange}
        onClearFilters={onClearFilters}
        onOpenWall={onOpenWall}
        onPreview={onPreview}
        onDownload={onDownload}
        onPushReference={onPushReference}
        onRemove={onRemove}
        onRetry={onRetry}
        onToggleSelect={onToggleSelect}
        onToggleFavorite={onToggleFavorite}
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
        onAddSelectedTag={onAddSelectedTag}
        onRemoveSelectedTag={onRemoveSelectedTag}
        onClearSelection={onClearSelection}
        onRemoveSelected={onRemoveSelected}
        onDownloadSelected={onDownloadSelected}
        includeMetadata={includeMetadata}
        onIncludeMetadataChange={onIncludeMetadataChange}
      />
    </div>
  )
}
