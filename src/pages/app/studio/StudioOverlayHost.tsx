import { ImageViewerModal } from '@/features/works/ImageViewerModal'
import { ImageWallModal } from '@/features/works/ImageWallModal'
import { PromptTemplateLibrary } from '@/features/prompt-templates/PromptTemplateLibrary'
import { ProviderModal } from '@/features/provider/ProviderModal'
import type { PromptTemplateListItem } from '@/features/prompt-templates/PromptTemplateLibrary'
import type { GalleryImage } from '@/features/works/works.types'
import type { ManagedProviderOption, ProviderConfig, ProviderPolicy } from '@/features/provider/provider.types'

type StudioOverlayHostProps = {
  providerModal: {
    open: boolean
    config: ProviderConfig
    draftConfig: ProviderConfig
    managedProviders: ManagedProviderOption[]
    providerPolicy: ProviderPolicy
    onDraftConfigChange: (config: ProviderConfig) => void
    onSave: () => void
    onClose: () => void
  }
  templateLibrary: {
    open: boolean
    templates: PromptTemplateListItem[]
    loading: boolean
    error: string | null
    currentPrompt: string
    saveFeedback: string
    onSaveCurrent: () => void
    onApply: (template: PromptTemplateListItem) => void
    onDuplicate: (template: PromptTemplateListItem) => void
    onDelete: (templateId: string) => void
    onRefresh: () => void
    onClose: () => void
  }
  viewer: {
    image: GalleryImage | null
    onClose: () => void
    onDownload: (item: GalleryImage) => void
    onPushReference: (item: GalleryImage) => void
    onReuseParameters: (item: GalleryImage) => void
    onRegenerateFromParameters: (item: GalleryImage) => void
  }
  wall: {
    open: boolean
    gallery: GalleryImage[]
    totalCount: number
    selectedIds: string[]
    searchQuery: string
    availableTags: string[]
    activeTag: string
    favoritesOnly: boolean
    selectedTags: string[]
    onClose: () => void
    onPreview: (item: GalleryImage) => void
    onDownload: (item: GalleryImage) => void
    onDownloadSelected: () => void
    includeMetadata: boolean
    onIncludeMetadataChange: (value: boolean) => void
    onPushReference: (item: GalleryImage) => void
    onToggleSelect: (id: string) => void
    onToggleFavorite: (id: string) => void
    onAddTag: (id: string, tag: string) => void
    onRemoveTag: (id: string, tag: string) => void
    onAddSelectedTag?: (tag: string) => void
    onRemoveSelectedTag?: (tag: string) => void
    onClearSelection: () => void
    onRemoveSelected: () => void
    onRemove: (id: string) => void
    onRetry?: (item: GalleryImage) => void
    onSearchChange: (query: string) => void
    onTagChange: (tag: string) => void
    onFavoritesOnlyChange: (value: boolean) => void
    onClearFilters: () => void
  }
}

export function StudioOverlayHost({ providerModal, templateLibrary, viewer, wall }: StudioOverlayHostProps) {
  return (
    <>
      <ProviderModal
        open={providerModal.open}
        config={providerModal.config}
        draftConfig={providerModal.draftConfig}
        managedProviders={providerModal.managedProviders}
        providerPolicy={providerModal.providerPolicy}
        onDraftConfigChange={providerModal.onDraftConfigChange}
        onSave={providerModal.onSave}
        onClose={providerModal.onClose}
      />

      <PromptTemplateLibrary
        open={templateLibrary.open}
        templates={templateLibrary.templates}
        loading={templateLibrary.loading}
        error={templateLibrary.error}
        currentPrompt={templateLibrary.currentPrompt}
        saveFeedback={templateLibrary.saveFeedback}
        onSaveCurrent={templateLibrary.onSaveCurrent}
        onApply={templateLibrary.onApply}
        onDuplicate={templateLibrary.onDuplicate}
        onDelete={templateLibrary.onDelete}
        onRefresh={templateLibrary.onRefresh}
        onClose={templateLibrary.onClose}
      />

      <ImageViewerModal
        image={viewer.image}
        onClose={viewer.onClose}
        onDownload={viewer.onDownload}
        onPushReference={viewer.onPushReference}
        onReuseParameters={viewer.onReuseParameters}
        onRegenerateFromParameters={viewer.onRegenerateFromParameters}
      />

      <ImageWallModal
        open={wall.open}
        gallery={wall.gallery}
        totalCount={wall.totalCount}
        selectedIds={wall.selectedIds}
        searchQuery={wall.searchQuery}
        availableTags={wall.availableTags}
        activeTag={wall.activeTag}
        favoritesOnly={wall.favoritesOnly}
        selectedTags={wall.selectedTags}
        onClose={wall.onClose}
        onPreview={wall.onPreview}
        onDownload={wall.onDownload}
        onDownloadSelected={wall.onDownloadSelected}
        includeMetadata={wall.includeMetadata}
        onIncludeMetadataChange={wall.onIncludeMetadataChange}
        onPushReference={wall.onPushReference}
        onToggleSelect={wall.onToggleSelect}
        onToggleFavorite={wall.onToggleFavorite}
        onAddTag={wall.onAddTag}
        onRemoveTag={wall.onRemoveTag}
        onAddSelectedTag={wall.onAddSelectedTag}
        onRemoveSelectedTag={wall.onRemoveSelectedTag}
        onClearSelection={wall.onClearSelection}
        onRemoveSelected={wall.onRemoveSelected}
        onRemove={wall.onRemove}
        onRetry={wall.onRetry}
        onSearchChange={wall.onSearchChange}
        onTagChange={wall.onTagChange}
        onFavoritesOnlyChange={wall.onFavoritesOnlyChange}
        onClearFilters={wall.onClearFilters}
      />
    </>
  )
}
