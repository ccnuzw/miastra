import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useAuthSession } from '@/features/auth/useAuthSession'
import type { GalleryImage } from '@/features/works/works.types'
import {
  addTagToStoredWorks,
  deleteStoredWork,
  deleteStoredWorks,
  normalizeGallery,
  normalizeGalleryImage,
  readStoredGallery,
  removeTagFromStoredWorks,
  replaceStoredWorkTags,
  updateStoredWorkFavorite,
} from './works.storage'

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

type WorkMutationVersions = Map<string, number>

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
    if (favoritesOnly && !item.isFavorite) return false
    if (tag && !(item.tags ?? []).includes(tag)) return false
    if (queryTerms.length) {
      const text = getSearchText(item)
      if (!queryTerms.every((term) => text.includes(term))) return false
    }
    return true
  })
}

export function useWorksGallery({ onRemoveImage, batchId }: UseWorksGalleryOptions = {}) {
  const { isAuthenticated, loading: authLoading } = useAuthSession()
  const [gallery, setGalleryState] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const galleryRef = useRef<GalleryImage[]>([])
  const mutationVersionRef = useRef<Record<string, number>>({})
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

  const loadGallery = useCallback(async (options: { clearError?: boolean } = {}) => {
    if (!isAuthenticated) {
      setGalleryState([])
      setError(null)
      setLoading(false)
      return []
    }

    setLoading(true)
    if (options.clearError !== false) setError(null)
    try {
      const items = await readStoredGallery()
      setGalleryState(items)
      return items
    } catch (nextError) {
      setError(nextError)
      return []
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    galleryRef.current = gallery
  }, [gallery])

  useEffect(() => {
    if (authLoading) return

    let _cancelled = false

    if (!isAuthenticated) {
      setGalleryState([])
      setError(null)
      setLoading(false)
      return () => {
        _cancelled = true
      }
    }

    void loadGallery()

    return () => {
      _cancelled = true
    }
  }, [authLoading, isAuthenticated, loadGallery])

  useEffect(() => {
    const existingIds = new Set(gallery.map((item) => item.id))
    setSelectedWorkIds((items) => items.filter((id) => existingIds.has(id)))
    setViewerImage((current) => current && existingIds.has(current.id) ? current : null)
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

  function beginMutation(ids: string[]): WorkMutationVersions {
    setError(null)
    const versions = new Map<string, number>()
    for (const id of ids) {
      const nextVersion = (mutationVersionRef.current[id] ?? 0) + 1
      mutationVersionRef.current[id] = nextVersion
      versions.set(id, nextVersion)
    }
    return versions
  }

  function hasCurrentMutation(versions: WorkMutationVersions) {
    for (const [id, version] of versions) {
      if (mutationVersionRef.current[id] === version) return true
    }
    return false
  }

  function applyServerWorks(works: GalleryImage[], versions: WorkMutationVersions) {
    const nextWorks = new Map<string, GalleryImage>()
    for (const work of works) {
      const version = versions.get(work.id)
      if (version === undefined || mutationVersionRef.current[work.id] !== version) continue
      nextWorks.set(work.id, normalizeGalleryImage(work))
    }

    if (!nextWorks.size) return

    setGallery((items) => items.map((item) => nextWorks.get(item.id) ?? item))
    setViewerImage((current) => current ? (nextWorks.get(current.id) ?? current) : current)
  }

  function reportMutationError(nextError: unknown, versions: WorkMutationVersions) {
    setError(nextError)
    if (!hasCurrentMutation(versions)) return
    void loadGallery({ clearError: false })
  }

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

  async function handleRemoveImage(id: string) {
    const versions = beginMutation([id])
    setGallery((items) => items.filter((item) => item.id !== id))
    setSelectedWorkIds((items) => items.filter((item) => item !== id))
    setViewerImage((current) => current?.id === id ? null : current)
    onRemoveImage?.(id)

    try {
      await deleteStoredWork(id)
    } catch (nextError) {
      reportMutationError(nextError, versions)
    }
  }

  function toggleWorkSelection(id: string) {
    setSelectedWorkIds((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  }

  function clearWorkSelection() {
    setSelectedWorkIds([])
  }

  async function removeSelectedWorks() {
    const ids = [...selectedWorkIds]
    if (!ids.length) return

    const versions = beginMutation(ids)
    const targetIds = new Set(ids)
    ids.forEach((id) => {
      onRemoveImage?.(id)
    })
    setGallery((items) => items.filter((item) => !targetIds.has(item.id)))
    setViewerImage((current) => current && targetIds.has(current.id) ? null : current)
    setSelectedWorkIds([])

    try {
      await deleteStoredWorks(ids)
    } catch (nextError) {
      reportMutationError(nextError, versions)
    }
  }

  async function toggleWorkFavorite(id: string) {
    const currentWork = galleryRef.current.find((item) => item.id === id)
    if (!currentWork) return

    const nextFavorite = !currentWork.isFavorite
    const versions = beginMutation([id])
    updateWork(id, (item) => ({ ...item, isFavorite: nextFavorite }))

    try {
      const work = await updateStoredWorkFavorite(id, nextFavorite)
      applyServerWorks([work], versions)
    } catch (nextError) {
      reportMutationError(nextError, versions)
    }
  }

  async function addWorkTag(id: string, tag: string) {
    const nextTag = normalizeTag(tag)
    if (!nextTag) return

    const currentWork = galleryRef.current.find((item) => item.id === id)
    if (!currentWork) return

    const nextTags = Array.from(new Set([...(currentWork.tags ?? []), nextTag]))
    const versions = beginMutation([id])
    updateWork(id, (item) => ({ ...item, tags: nextTags }))

    try {
      const work = await replaceStoredWorkTags(id, nextTags)
      applyServerWorks([work], versions)
    } catch (nextError) {
      reportMutationError(nextError, versions)
    }
  }

  async function removeWorkTag(id: string, tag: string) {
    const nextTag = normalizeTag(tag)
    if (!nextTag) return

    const currentWork = galleryRef.current.find((item) => item.id === id)
    if (!currentWork) return

    const nextTags = (currentWork.tags ?? []).filter((currentTag) => currentTag !== nextTag)
    const versions = beginMutation([id])
    updateWork(id, (item) => ({ ...item, tags: nextTags }))

    try {
      const work = await replaceStoredWorkTags(id, nextTags)
      applyServerWorks([work], versions)
    } catch (nextError) {
      reportMutationError(nextError, versions)
    }
  }

  async function addTagToSelectedWorks(tag: string) {
    const nextTag = normalizeTag(tag)
    const ids = [...selectedWorkIds]
    if (!nextTag || !ids.length) return

    const versions = beginMutation(ids)
    updateWorks(ids, (item) => {
      const tags = item.tags ?? []
      return tags.includes(nextTag) ? item : { ...item, tags: [...tags, nextTag] }
    })

    try {
      const result = await addTagToStoredWorks(ids, nextTag)
      applyServerWorks(result.works, versions)
    } catch (nextError) {
      reportMutationError(nextError, versions)
    }
  }

  async function removeTagFromSelectedWorks(tag: string) {
    const nextTag = normalizeTag(tag)
    const ids = [...selectedWorkIds]
    if (!nextTag || !ids.length) return

    const versions = beginMutation(ids)
    updateWorks(ids, (item) => ({ ...item, tags: (item.tags ?? []).filter((currentTag) => currentTag !== nextTag) }))

    try {
      const result = await removeTagFromStoredWorks(ids, nextTag)
      applyServerWorks(result.works, versions)
    } catch (nextError) {
      reportMutationError(nextError, versions)
    }
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
    loading: authLoading || loading,
    error,
    refresh: () => loadGallery(),
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
