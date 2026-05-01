import type { DrawStrategyOption, DrawTaskStatus, VariationStrength } from './drawCard.types'

export const drawStrategyOptions: DrawStrategyOption[] = [
  { label: '线性稳定', value: 'linear', hint: '逐张 · 最稳', concurrency: 1, delayMs: 1200, timeoutSec: 300, retries: 2, safeMode: true },
  { label: '智能并发', value: 'smart', hint: '四路 · 推荐', concurrency: 4, delayMs: 700, timeoutSec: 300, retries: 1, safeMode: true },
  { label: '极速并发', value: 'turbo', hint: '八路 · 高速', concurrency: 8, delayMs: 0, timeoutSec: 300, retries: 1, safeMode: false },
]

export const drawTaskStatusText: Record<DrawTaskStatus, string> = {
  pending: '排队中',
  running: '生成中',
  receiving: '接收中',
  success: '已完成',
  failed: '失败',
  retrying: '重试中',
  cancelled: '已取消',
}

export const variationDimensions = [
  { id: 'light', name: '光线' },
  { id: 'pose', name: '姿态' },
  { id: 'framing', name: '构图' },
  { id: 'texture', name: '质感' },
  { id: 'mood', name: '氛围' },
]

export const variationStrengthOptions: Array<{ label: string; value: VariationStrength; hint: string }> = [
  { label: '轻微', value: 'low', hint: '更接近' },
  { label: '均衡', value: 'medium', hint: '推荐' },
  { label: '明显', value: 'high', hint: '更发散' },
]

export const variationStrengthText: Record<VariationStrength, string> = {
  low: '变化幅度很小，仅调整光线、噪点、构图和细节，不改变主体。',
  medium: '变化幅度适中，保持同一主题和人物设定，但允许姿态、光线和镜头距离有自然差异。',
  high: '变化幅度更明显，但仍然保持同一提示词主题、人物设定和画面质感。',
}

export function drawStatusMeta(status: DrawTaskStatus, error?: string, retryable = true) {
  if (status === 'failed') {
    const retryHint = retryable ? '可重试' : '不可重试'
    return error ? `失败，${retryHint}：${error}` : `失败，${retryHint}`
  }
  return drawTaskStatusText[status]
}
