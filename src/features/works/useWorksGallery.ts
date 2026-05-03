import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { GalleryImage } from '@/features/works/works.types'
import { importLegacyWorks, normalizeGallery, normalizeGalleryImage, readStoredGallery, writeStoredGallery } from './works.storage'

type UseWorksGalleryOptions = {
  onRemoveImage?: (id: string) => void
  batchId?: string
}

export type WorksGalleryFilters = {
  batchId?: string
  searchQuery?: string
  tag?: string
  favoritesOnly?: boolean
}

const galleryPersistDebounceMs = 400

function normalizeTag(tag: string) {
  return tag.trim()
}

function getSearchText(item: GalleryImage) {
  return [
    item.title,
    item.meta,
    item.promptText,
    item.promptSnippet,
    item.providerModel,
    item.size,
    item.quality,
    item.batchId,
    item.variation,
    item.taskStatus,
    item.error,
    item.snapshotId,
    item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '',
    ...(item.tags ?? []),
  ].filter(Boolean).join(' ').toLowerCase()
}

export function filterWorksGallery(items: GalleryImage[], filters: WorksGalleryFilters = {}) {
  const batchId = filters.batchId && filters.batchId !== 'all' ? filters.batchId : undefined
  const queryTerms = (filters.searchQuery ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  const tag = filters.tag && filters.tag !== 'all' ? filters.tag : undefined
  const favoritesOnly = Boolean(filters.favoritesOnly)

  return items.filter((item) => {
    if (batchId && item.batchId !== batchId) return false
    if (favoritesOnly && !(item.isFavorite ?? item.favorite)) return false
    if (tag && !(item.tags ?? []).includes(tag)) return false
    if (queryTerms.length) {
      const text = getSearchText(item)
      if (!queryTerms.every((term) => text.includes(term))) return false
    }
    return true
  })
}

export function useWorksGallery({ onRemoveImage, batchId }: UseWorksGalleryOptions = {}) {
  const [gallery, setGalleryState] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const galleryHydratedRef = useRef(false)
  const persistTimerRef = useRef<number | null>(null)
  const [wallOpen, setWallOpen] = useState(false)
  const [viewerImage, setViewerImage] = useState<GalleryImage | null>(null)
  const [selectedWorkIds, setSelectedWorkIds] = useState<string[]>([])
  const [workSearchQuery, setWorkSearchQuery] = useState('')
  const [activeTagFilter, setActiveTagFilter] = useState('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  const setGallery: Dispatch<SetStateAction<GalleryImage[]>> = (value) => {
    setGalleryState((current) => normalizeGallery(typeof value === 'function'
      ? (value as (previous: GalleryImage[]) => GalleryImage[])(current)
      : value))
  }

  const loadGallery = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const items = await readStoredGallery()
      const next = batchId && batchId !== 'all' ? items.filter((item) => item.batchId === batchId) : items
      setGalleryState(next)
      galleryHydratedRef.current = true
      return next
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
      return []
    } finally {
      setLoading(false)
    }
  }, [batchId])

  useEffect(() => {
    let cancelled = false
    void importLegacyWorks().then(() => {
      if (cancelled) return
      void loadGallery()
    })
    return () => {
      cancelled = true
    }
  }, [loadGallery])

  useEffect(() => {
    if (!galleryHydratedRef.current) return
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current)
    }
    persistTimerRef.current = window.setTimeout(() => {
      void writeStoredGallery(gallery)
      persistTimerRef.current = null
    }, galleryPersistDebounceMs)

    return () => {
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current)
        persistTimerRef.current = null
      }
    }
  }, [gallery])

  const availableTags = useMemo(() => Array.from(new Set(gallery.flatMap((item) => item.tags ?? []))).sort((a, b) => a.localeCompare(b, 'zh-CN')), [gallery])
  const selectedWorkSet = useMemo(() => new Set(selectedWorkIds), [selectedWorkIds])
  const selectedWorks = useMemo(() => gallery.filter((item) => selectedWorkSet.has(item.id)), [gallery, selectedWorkSet])
  const selectedWorkTags = useMemo(() => Array.from(new Set(selectedWorks.flatMap((item) => item.tags ?? []))).sort((a, b) => a.localeCompare(b, 'zh-CN')), [selectedWorks])
  const filteredGallery = useMemo(() => filterWorksGallery(gallery, {
    batchId,
    searchQuery: workSearchQuery,
    tag: activeTagFilter,
    favoritesOnly,
  }), [activeTagFilter, batchId, favoritesOnly, gallery, workSearchQuery])

  useEffect(() => {
    if (activeTagFilter === 'all') return
    if (availableTags.includes(activeTagFilter)) return
    setActiveTagFilter('all')
  }, [activeTagFilter, availableTags])

  function updateWorks(ids: string[], updater: (item: GalleryImage) => GalleryImage) {
    if (!ids.length) return
    const targetIds = new Set(ids)
    setGallery((items) => items.map((item) => (targetIds.has(item.id) ? normalizeGalleryImage(updater(item)) : item)))
    setViewerImage((current) => current && targetIds.has(current.id) ? normalizeGalleryImage(updater(current)) : current)
  }

  function updateWork(id: string, updater: (item: GalleryImage) => GalleryImage) {
    updateWorks([id], updater)
  }

  function addImage(image: GalleryImage) {
    setGallery((items) => [normalizeGalleryImage(image), ...items])
  }

  function handleRemoveImage(id: string) {
    setGallery((items) => items.filter((item) => item.id !== id))
    setSelectedWorkIds((items) => items.filter((item) => item !== id))
    setViewerImage((current) => current?.id === id ? null : current)
    onRemoveImage?.(id)
  }

  function toggleWorkSelection(id: string) {
    setSelectedWorkIds((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  }

  function clearWorkSelection() {
    setSelectedWorkIds([])
  }

  function removeSelectedWorks() {
    selectedWorkIds.forEach((id) => onRemoveImage?.(id))
    setGallery((items) => items.filter((item) => !selectedWorkSet.has(item.id)))
    setViewerImage((current) => current && selectedWorkSet.has(current.id) ? null : current)
    setSelectedWorkIds([])
  }

  function toggleWorkFavorite(id: string) {
    updateWork(id, (item) => ({ ...item, isFavorite: !(item.isFavorite ?? item.favorite) }))
  }

  function addWorkTag(id: string, tag: string) {
    const nextTag = normalizeTag(tag)
    if (!nextTag) return
    updateWork(id, (item) => {
      const tags = item.tags ?? []
      if (tags.includes(nextTag)) return item
      return { ...item, tags: [...tags, nextTag] }
    })
  }

  function removeWorkTag(id: string, tag: string) {
    const nextTag = normalizeTag(tag)
    if (!nextTag) return
    updateWork(id, (item) => ({ ...item, tags: (item.tags ?? []).filter((currentTag) => currentTag !== nextTag) }))
  }

  function addTagToSelectedWorks(tag: string) {
    const nextTag = normalizeTag(tag)
    if (!nextTag || !selectedWorkIds.length) return
    updateWorks(selectedWorkIds, (item) => {
      const tags = item.tags ?? []
      if (tags.includes(nextTag)) return item
      return { ...item, tags: [...tags, nextTag] }
    })
  }

  function removeTagFromSelectedWorks(tag: string) {
    const nextTag = normalizeTag(tag)
    if (!nextTag || !selectedWorkIds.length) return
    updateWorks(selectedWorkIds, (item) => ({ ...item, tags: (item.tags ?? []).filter((currentTag) => currentTag !== nextTag) }))
  }

  function clearWorkFilters() {
    setWorkSearchQuery('')
    setActiveTagFilter('all')
    setFavoritesOnly(false)
  }

  return {
    gallery,
    filteredGallery,
    availableTags,
    workSearchQuery,
    activeTagFilter,
    favoritesOnly,
    wallOpen,
    viewerImage,
    loading,
    error,
    refresh: loadGallery,
    setGallery,
    setWallOpen,
    setViewerImage,
    setWorkSearchQuery,
    setActiveTagFilter,
    setFavoritesOnly,
    clearWorkFilters,
    selectedWorkIds,
    selectedWorkSet,
    selectedWorks,
    selectedCount: selectedWorkIds.length,
    selectedWorkTags,
    toggleWorkSelection,
    clearWorkSelection,
    removeSelectedWorks,
    toggleWorkFavorite,
    addWorkTag,
    removeWorkTag,
    addTagToSelectedWorks,
    removeTagFromSelectedWorks,
    addImage,
    handleRemoveImage,
  }
}
