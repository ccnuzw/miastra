import { drawStatusMeta as drawStatusMetaFromConstants, variationDimensions } from './drawCard.constants'
import type { DrawTaskStatus } from './drawCard.types'

export function pickVariationPrompts(enabledDimensions: string[], index: number) {
  const active = variationDimensions.filter((item) => enabledDimensions.includes(item.id))
  const pool = active.length ? active : variationDimensions
  return pool.slice(0, 3).map((item, itemIndex) => {
    const seed = (index + itemIndex) % 4
    const variants = ['更柔和', '更自然', '更暖', '更生活化']
    return `${item.name}：${variants[seed]}`
  })
}

export function clampDrawCount(value: number) {
  return Math.min(20, Math.max(1, Number.isFinite(value) ? value : 1))
}

export function clampDrawConcurrency(value: number) {
  return Math.min(8, Math.max(1, Number.isFinite(value) ? value : 1))
}

export function drawStatusMeta(status: DrawTaskStatus, error?: string, retryable = true) {
  return drawStatusMetaFromConstants(status, error, retryable)
}
