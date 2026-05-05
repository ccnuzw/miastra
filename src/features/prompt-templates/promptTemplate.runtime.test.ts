import { describe, expect, it } from 'vitest'
import { buildPromptTemplateGuidedFlowSnapshot } from './promptTemplate.runtime'

describe('promptTemplate runtime', () => {
  it('builds template guided flow snapshot with default action priority', () => {
    const snapshot = buildPromptTemplateGuidedFlowSnapshot({
      id: 'template-product',
      title: '商品展示模板',
      content: '做一张适合商品展示的图片。',
      category: '电商',
      tags: ['商品', '白底'],
      createdAt: 1,
    })

    expect(snapshot).not.toBeNull()
    expect(snapshot?.sourceType).toBe('template')
    expect(snapshot?.templateId).toBe('template-product')
    expect(snapshot?.followUpMode).toBe('template-guided')
    expect(snapshot?.completedQuestionCount).toBe(3)
    expect(snapshot?.defaultActionId).toBe('continue-edit')
    expect(snapshot?.actionPriority).toEqual(['continue-edit', 'guided-refine', 'retry-version'])
    expect(snapshot?.promptText).toContain('优先满足电商主图使用')
    expect(snapshot?.summary).toContain('已按模板默认追问路径带入')
  })

  it('returns null when template does not expose guided fields', () => {
    const snapshot = buildPromptTemplateGuidedFlowSnapshot({
      id: 'template-illustration',
      title: '插画概念模板',
      content: '生成一张未来旅人的概念插画。',
      category: '插画',
      tags: ['概念图'],
      createdAt: 1,
      structure: {
        status: 'structured',
        familyId: 'illustration',
        scenarioId: 'illustration-concept',
        scenarioLabel: '插画概念',
        sceneDescription: '适合概念图、叙事插画和风格实验。',
        scene: {
          id: 'illustration-concept',
          label: '插画概念',
          description: '适合概念图、叙事插画和风格实验。',
          recommendedMode: 'pro',
          recommendedIntent: 'panel',
        },
        recommendedMode: 'pro',
        recommendedIntent: 'panel',
        entryModes: ['pro'],
        defaults: {
          aspectLabel: '3:4',
          resolutionTier: '2k',
          quality: 'high',
        },
        fields: [
          {
            id: 'story-subject',
            label: '故事主体',
            description: '说明故事主体。',
            group: 'subject',
            input: 'textarea',
            required: true,
          },
        ],
        summary: [],
      },
    })

    expect(snapshot).toBeNull()
  })
})
