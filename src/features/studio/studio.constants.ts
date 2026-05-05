import type { ResolutionTier, StyleToken } from './studio.types'

export const styleTokens: StyleToken[] = [
  { id: 'iphone-native', label: 'iPhone 直出', prompt: 'shot on iPhone native camera, casual snapshot, natural dynamic range, no heavy HDR, authentic mobile photo look' },
  { id: 'film-grain', label: '电影颗粒', prompt: 'subtle cinematic film grain, natural image noise, gentle texture, not over-sharpened' },
  { id: 'soft-flash', label: '柔和直闪', prompt: 'soft direct flash from phone camera, mild frontal highlight, low contrast shadows, natural indoor flash feeling' },
  { id: 'real-skin', label: '真实皮肤', prompt: 'realistic skin texture, visible natural pores, no plastic skin, no excessive retouching, no beauty filter' },
  { id: 'warm-bedroom', label: '暖调卧室', prompt: 'warm-toned bedroom ambience, cream or white bedding, cozy indoor light, intimate lifestyle atmosphere' },
  { id: 'life-snapshot', label: '生活抓拍', prompt: 'candid lifestyle snapshot, relaxed composition, spontaneous moment, non-commercial studio feeling' },
]

export const aspectOptions = [
  { label: '1:1', note: '方图' },
  { label: '3:4', note: '竖构图' },
  { label: '4:3', note: '横构图' },
  { label: '16:9', note: '宽画面' },
  { label: '9:16', note: '手机竖屏' },
]

export const resolutionOptions: Array<{ label: string; value: ResolutionTier; hint: string }> = [
  { label: '1K', value: '1k', hint: '快速试图' },
  { label: '2K', value: '2k', hint: '细节增强' },
  { label: '4K', value: '4k', hint: '高分辨率' },
]

export const aspectSizeMap: Record<string, Record<ResolutionTier, string>> = {
  '1:1': { '1k': '1024x1024', '2k': '2048x2048', '4k': '4096x4096' },
  '3:4': { '1k': '1024x1536', '2k': '2048x3072', '4k': '3072x4096' },
  '4:3': { '1k': '1536x1024', '2k': '3072x2048', '4k': '4096x3072' },
  '16:9': { '1k': '1536x864', '2k': '2560x1440', '4k': '3840x2160' },
  '9:16': { '1k': '864x1536', '2k': '1440x2560', '4k': '2160x3840' },
}

export function resolveImageSize(aspect: string, tier: ResolutionTier) {
  return aspectSizeMap[aspect]?.[tier] ?? aspectSizeMap['3:4'][tier]
}

export function findAspectLabelBySize(size: string) {
  const normalized = size.trim()
  if (!normalized) return null
  return (
    Object.entries(aspectSizeMap).find(([, tierMap]) =>
      Object.values(tierMap).includes(normalized),
    )?.[0] ?? null
  )
}

export function findResolutionTierBySize(size: string): ResolutionTier | null {
  const normalized = size.trim()
  if (!normalized) return null

  for (const tierMap of Object.values(aspectSizeMap)) {
    const matchedTier = (Object.entries(tierMap).find(([, value]) => value === normalized)?.[0] ??
      null) as ResolutionTier | null
    if (matchedTier) return matchedTier
  }

  return null
}

export function resolveSizePreset(size: string) {
  const aspectLabel = findAspectLabelBySize(size)
  const resolutionTier = findResolutionTierBySize(size)
  if (!aspectLabel || !resolutionTier) return null
  return { aspectLabel, resolutionTier }
}

export const qualityOptions = [
  { label: '低', value: 'low', hint: '更快' },
  { label: '中', value: 'medium', hint: '均衡' },
  { label: '高', value: 'high', hint: '精细' },
  { label: '自动', value: 'auto', hint: '推荐' },
]

export const defaultPrompt = ''

export const defaultNegativePrompt =
  '过度磨皮，塑料感皮肤，强HDR，锐化过度，AI脸，畸形五官，手部异常，低清晰度，卡通风，插画风，过度滤镜，夸张光影，商业棚拍感，裸体，露点，色情姿势，未成年人'
