import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { acceptedReferenceImageTypes, maxReferenceImageSize } from '@/features/references/reference.constants'
import type { ReferenceImage } from '@/features/references/reference.types'
import type { GalleryImage } from '@/features/works/works.types'

type UseReferenceImagesOptions = {
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

function revokeReferenceImage(image: ReferenceImage) {
  if (image.source === 'upload' && image.src.startsWith('blob:')) URL.revokeObjectURL(image.src)
}

export function useReferenceImages({ onSuccess, onError }: UseReferenceImagesOptions = {}) {
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([])
  const referenceInputRef = useRef<HTMLInputElement | null>(null)
  const referenceImagesRef = useRef<ReferenceImage[]>([])

  const hasReferenceImage = referenceImages.length > 0

  useEffect(() => {
    referenceImagesRef.current = referenceImages
  }, [referenceImages])

  useEffect(() => {
    return () => {
      referenceImagesRef.current.forEach(revokeReferenceImage)
    }
  }, [])

  function handleReferenceUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return

    const validImages: ReferenceImage[] = []
    const rejectedNames: string[] = []
    files.forEach((file) => {
      if (!acceptedReferenceImageTypes.includes(file.type) || file.size > maxReferenceImageSize) {
        rejectedNames.push(file.name)
        return
      }
      validImages.push({
        id: crypto.randomUUID(),
        src: URL.createObjectURL(file),
        name: file.name,
        source: 'upload',
        file,
      })
    })

    if (validImages.length) {
      setReferenceImages((items) => [...items, ...validImages].slice(0, 4))
      onSuccess?.(`已添加 ${validImages.length} 张参考图，本次生成将自动使用图生图`)
    }
    if (rejectedNames.length) {
      onError?.(`已忽略不支持的参考图：${rejectedNames.join('、')}。仅支持 PNG/JPG/WebP，单张不超过 20MB`)
    }
  }

  function handleRemoveReferenceImage(id: string) {
    setReferenceImages((items) => {
      const target = items.find((item) => item.id === id)
      if (target) revokeReferenceImage(target)
      return items.filter((item) => item.id !== id)
    })
  }

  function handlePushReferenceImage(image: GalleryImage) {
    if (!image.src) return
    setReferenceImages((items) => {
      if (items.some((item) => item.src === image.src)) return items
      return [{
        id: crypto.randomUUID(),
        src: image.src,
        name: `${image.title || 'work'}-reference.png`,
        source: 'work',
      }, ...items].slice(0, 4)
    })
    onSuccess?.('已推送到输入框参考图托盘，本次生成将自动使用图生图')
  }

  return {
    referenceImages,
    hasReferenceImage,
    referenceInputRef,
    handleReferenceUpload,
    handleRemoveReferenceImage,
    handlePushReferenceImage,
  }
}
