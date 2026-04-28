import { useEffect, useRef, useState } from 'react'
import type { GalleryImage } from '@/features/works/works.types'
import { readStoredGallery, writeStoredGallery } from './works.storage'

type UseWorksGalleryOptions = {
  onRemoveImage?: (id: string) => void
}

export function useWorksGallery({ onRemoveImage }: UseWorksGalleryOptions = {}) {
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const galleryHydratedRef = useRef(false)
  const [wallOpen, setWallOpen] = useState(false)
  const [viewerImage, setViewerImage] = useState<GalleryImage | null>(null)
  const [selectedWorkIds, setSelectedWorkIds] = useState<string[]>([])


  useEffect(() => {
    let cancelled = false
    readStoredGallery().then((items) => {
      if (cancelled) return
      setGallery((current) => (current.length ? current : items))
      galleryHydratedRef.current = true
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!galleryHydratedRef.current) return
    void writeStoredGallery(gallery)
  }, [gallery])

  function addImage(image: GalleryImage) {
    setGallery((items) => [image, ...items])
  }

  function handleRemoveImage(id: string) {
    setGallery((items) => items.filter((item) => item.id !== id))
    setSelectedWorkIds((items) => items.filter((item) => item !== id))
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
    setGallery((items) => items.filter((item) => !selectedWorkIds.includes(item.id)))
    setSelectedWorkIds([])
  }

  return {
    gallery,
    wallOpen,
    viewerImage,
    setGallery,
    setWallOpen,
    setViewerImage,
    selectedWorkIds,
    selectedCount: selectedWorkIds.length,
    toggleWorkSelection,
    clearWorkSelection,
    removeSelectedWorks,
    addImage,
    handleRemoveImage,
  }
}
