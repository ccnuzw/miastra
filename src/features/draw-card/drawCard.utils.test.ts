import { describe, expect, it } from 'vitest'
import { clampDrawConcurrency, clampDrawCount, pickVariationPrompts } from './drawCard.utils'

describe('drawCard.utils', () => {
  it('clamps draw count into range', () => {
    expect(clampDrawCount(Number.NaN)).toBe(1)
    expect(clampDrawCount(0)).toBe(1)
    expect(clampDrawCount(21)).toBe(20)
    expect(clampDrawCount(8)).toBe(8)
  })

  it('clamps concurrency into range', () => {
    expect(clampDrawConcurrency(Number.NaN)).toBe(1)
    expect(clampDrawConcurrency(0)).toBe(1)
    expect(clampDrawConcurrency(9)).toBe(8)
    expect(clampDrawConcurrency(3)).toBe(3)
  })

  it('returns variation prompts from the active pool', () => {
    const prompts = pickVariationPrompts(['light', 'pose'], 1)
    expect(prompts).toHaveLength(2)
    expect(prompts[0]).toContain('光线')
    expect(prompts[1]).toContain('姿态')
  })
})
