import { describe, expect, it } from 'vitest'
import {
  buildConsumerGuidedFlowSnapshot,
  buildGuidedPrompt,
  findConsumerGuidedFlowById,
  findConsumerGuidedFlowBySceneId,
  getConsumerGuidedFlowNextQuestionIndex,
} from './consumerHomePresets'

describe('consumerHomePresets guided flow', () => {
  it('builds structured snapshot for product guided flow', () => {
    const guide = findConsumerGuidedFlowById('product-shot')
    expect(guide).toBeTruthy()
    if (!guide) return

    const selections = {
      'product-subject': 'listing',
      'usage-scene': 'studio',
    }

    const snapshot = buildConsumerGuidedFlowSnapshot(guide, selections, 123456)

    expect(snapshot.guideId).toBe('product-shot')
    expect(snapshot.sceneId).toBe('product-shot')
    expect(snapshot.scene.id).toBe('product-shot')
    expect(snapshot.scene.label).toBe('商品展示')
    expect(snapshot.completedQuestionCount).toBe(2)
    expect(snapshot.totalQuestionCount).toBe(3)
    expect(snapshot.questionOrder).toEqual(['product-subject', 'usage-scene', 'background-direction'])
    expect(snapshot.summary).toBe('用途场景：电商主图 / 背景方向：影棚质感')
    expect(snapshot.promptText).toBe(buildGuidedPrompt(guide, selections))
    expect(snapshot.updatedAt).toBe(123456)
    expect(snapshot.steps.map((step) => step.questionId)).toEqual(['product-subject', 'usage-scene'])
    expect(snapshot.steps[0]?.fieldId).toBe('usageScenario')
  })

  it('returns next unanswered question index', () => {
    const guide = findConsumerGuidedFlowById('poster-campaign')
    expect(guide).toBeTruthy()
    if (!guide) return

    expect(getConsumerGuidedFlowNextQuestionIndex(guide, {})).toBe(0)
    expect(getConsumerGuidedFlowNextQuestionIndex(guide, { headline: 'event' })).toBe(1)
    expect(getConsumerGuidedFlowNextQuestionIndex(guide, { headline: 'event', value: 'minimal' })).toBe(2)
    expect(
      getConsumerGuidedFlowNextQuestionIndex(guide, {
        headline: 'event',
        value: 'minimal',
        'visual-style': 'visual',
      }),
    ).toBe(2)
  })

  it('supports space scene guided flow from template-driven config', () => {
    const guide = findConsumerGuidedFlowBySceneId('space-showcase')
    expect(guide).toBeTruthy()
    if (!guide) return

    expect(guide.id).toBe('space-scene')
    expect(guide.questions).toHaveLength(3)
    expect(guide.questions.map((question) => question.id)).toEqual(['space-type', 'viewpoint', 'lighting'])
    expect(guide.questions[0]?.defaultOptionId).toBe('living')
  })
})
