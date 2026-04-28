import { ChangeEvent, RefObject } from 'react'
import { ImagePlus, Wand2, X } from 'lucide-react'
import type { ReferenceImage } from '@/features/references/reference.types'

type PromptComposerProps = {
  prompt: string
  referenceImages: ReferenceImage[]
  hasReferenceImage: boolean
  inputRef: RefObject<HTMLInputElement>
  onPromptChange: (value: string) => void
  onReferenceUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveReference: (id: string) => void
}

export function PromptComposer({ prompt, referenceImages, hasReferenceImage, inputRef, onPromptChange, onReferenceUpload, onRemoveReference }: PromptComposerProps) {
  return (
    <div className="field-block prompt-composer">
      <span className="field-label">
        <Wand2 className="h-4 w-4" />
        Prompt
      </span>
      <textarea value={prompt} onChange={(event) => onPromptChange(event.target.value)} className="prompt-area" rows={9} />
      <div className="reference-tray">
        <div className="reference-strip">
          {referenceImages.map((image, index) => (
            <div key={image.id} className="reference-thumb" title={image.name}>
              <img src={image.src} alt={image.name} />
              <span>{`图 ${index + 1} · ${image.source === 'upload' ? '上传' : '作品'}`}</span>
              <button type="button" onClick={() => onRemoveReference(image.id)} aria-label="移除参考图">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button type="button" className="reference-add" onClick={() => inputRef.current?.click()}>
            <ImagePlus className="h-5 w-5" />
            <span>参考图</span>
          </button>
        </div>
        <span className={`reference-mode ${hasReferenceImage ? 'reference-mode-active' : ''}`}>
          {hasReferenceImage ? `已启用图生图 · 将按顺序发送 ${referenceImages.length} 张参考图` : '无参考图时使用文生图'}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="sr-only"
          onChange={onReferenceUpload}
        />
      </div>
    </div>
  )
}
