import type { StyleToken } from '@/features/studio/studio.types'
import { styleTokens } from '@/features/studio/studio.constants'

type BuildStudioProPromptPreviewInput = {
  prompt: string
  negativePrompt: string
  detailStrength: number
  detailTone: string
  selectedStyleTokens: StyleToken[]
}

export function resolveSelectedStudioStyleTokens(selectedIds: string[]) {
  return styleTokens.filter((token) => selectedIds.includes(token.id))
}

export function buildStudioProPromptPreview({
  prompt,
  negativePrompt,
  detailStrength,
  detailTone,
  selectedStyleTokens,
}: BuildStudioProPromptPreviewInput) {
  const selectedStylePrompt = selectedStyleTokens.length
    ? selectedStyleTokens.map((token) => `${token.label}: ${token.prompt}`).join('\n')
    : ''

  return [
    prompt.trim(),
    selectedStylePrompt ? `常用风格参数：\n${selectedStylePrompt}` : '',
    `细节强度：${detailStrength}/100，${detailTone}细节，保持真实皮肤纹理和自然锐度。`,
    `避免：${negativePrompt.trim()}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}
