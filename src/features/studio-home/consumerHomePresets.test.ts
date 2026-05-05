import { describe, expect, it } from 'vitest'
import {
  buildConsumerGuidedFlowSnapshot,
  buildGuidedPrompt,
  findConsumerGuidedFlowById,
  getConsumerGuidedFlowNextQuestionIndex,
} from './consumerHomePresets'

describe('consumerHomePresets guided flow', () => {
  it('builds structured snapshot for product guided flow', () => {
    const guide = findConsumerGuidedFlowById('product-shot')
    expect(guide).toBeTruthy()
    if (!guide) return

    const selections = {
      usage: 'listing',
      background: 'studio',
    }

    const snapshot = buildConsumerGuidedFlowSnapshot(guide, selections, 123456)

    expect(snapshot.guideId).toBe('product-shot')
    expect(snapshot.completedQuestionCount).toBe(2)
    expect(snapshot.totalQuestionCount).toBe(3)
    expect(snapshot.questionOrder).toEqual(['usage', 'background', 'look'])
    expect(snapshot.summary).toBe('用途场景：电商主图 / 背景方向：影棚质感')
    expect(snapshot.promptText).toBe(buildGuidedPrompt(guide, selections))
    expect(snapshot.updatedAt).toBe(123456)
    expect(snapshot.steps.map((step) => step.questionId)).toEqual(['usage', 'background'])
  })

  it('returns next unanswered question index', () => {
    const guide = findConsumerGuidedFlowById('poster-campaign')
    expect(guide).toBeTruthy()
    if (!guide) return

    expect(getConsumerGuidedFlowNextQuestionIndex(guide, {})).toBe(0)
    expect(getConsumerGuidedFlowNextQuestionIndex(guide, { goal: 'event' })).toBe(1)
    expect(getConsumerGuidedFlowNextQuestionIndex(guide, { goal: 'event', tone: 'minimal' })).toBe(2)
    expect(
      getConsumerGuidedFlowNextQuestionIndex(guide, {
        goal: 'event',
        tone: 'minimal',
        layout: 'visual',
      }),
    ).toBe(2)
  })
})
