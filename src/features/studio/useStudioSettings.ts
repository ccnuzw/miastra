import { useEffect, useMemo, useState } from 'react'
import type { ResolutionTier, StudioMode } from '@/features/studio/studio.types'
import { defaultNegativePrompt, defaultPrompt, resolutionOptions, resolveImageSize, styleTokens } from '@/features/studio/studio.constants'

export function useStudioSettings() {
  const [prompt, setPrompt] = useState(defaultPrompt)
  const [studioMode, setStudioMode] = useState<StudioMode>('create')
  const [resolutionTier, setResolutionTier] = useState<ResolutionTier>('1k')
  const [aspectLabel, setAspectLabel] = useState('3:4')
  const [size, setSize] = useState(() => resolveImageSize('3:4', '1k'))
  const [quality, setQuality] = useState('low')
  const [detailStrength, setDetailStrength] = useState(58)
  const [negativePrompt, setNegativePrompt] = useState(defaultNegativePrompt)
  const [stream, setStream] = useState(true)
  const [selectedStyleTokenIds, setSelectedStyleTokenIds] = useState<string[]>([])

  const selectedResolution = resolutionOptions.find((option) => option.value === resolutionTier) ?? resolutionOptions[0]
  const detailTone = detailStrength < 34 ? '柔和' : detailStrength > 70 ? '锐利' : '均衡'
  const selectedStylePrompt = useMemo(() => {
    const selectedStylePrompts = styleTokens.filter((token) => selectedStyleTokenIds.includes(token.id))
    return selectedStylePrompts.length
      ? selectedStylePrompts.map((token) => `${token.label}: ${token.prompt}`).join('\n')
      : ''
  }, [selectedStyleTokenIds])

  useEffect(() => {
    setSize(resolveImageSize(aspectLabel, resolutionTier))
  }, [aspectLabel, resolutionTier])

  function buildPrompt(extraPrompt = '') {
    return [
      prompt.trim(),
      extraPrompt,
      selectedStylePrompt ? `常用风格参数：\n${selectedStylePrompt}` : '',
      `细节强度：${detailStrength}/100，${detailTone}细节，保持真实皮肤纹理和自然锐度。`,
      `避免：${negativePrompt.trim()}`,
    ].filter(Boolean).join('\n\n')
  }

  function toggleStyleToken(id: string) {
    setSelectedStyleTokenIds((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    )
  }

  function applyTestPreset() {
    setPrompt('a simple red apple on a white table, realistic photo')
    setAspectLabel('1:1')
    setResolutionTier('1k')
    setQuality('low')
    setStream(true)
  }

  return {
    prompt,
    studioMode,
    resolutionTier,
    aspectLabel,
    size,
    quality,
    detailStrength,
    negativePrompt,
    stream,
    selectedStyleTokenIds,
    selectedResolution,
    detailTone,
    setPrompt,
    setStudioMode,
    setResolutionTier,
    setAspectLabel,
    setQuality,
    setDetailStrength,
    setNegativePrompt,
    setStream,
    buildPrompt,
    toggleStyleToken,
    applyTestPreset,
  }
}
