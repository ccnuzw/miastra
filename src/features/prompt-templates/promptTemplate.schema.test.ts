import { describe, expect, it } from 'vitest'
import {
  buildPromptTemplateStructure,
  getPromptTemplateStructureFieldDigest,
  resolvePromptTemplateGuidedFieldDefaultOptionId,
  resolvePromptTemplateGuidedFieldRecommendedOptionId,
} from './promptTemplate.schema'

describe('promptTemplate schema', () => {
  it('infers a product template structure', () => {
    const structure = buildPromptTemplateStructure({
      id: 'product-template',
      title: '商品白底图模板',
      content: '生成一个适合电商上架的商品白底图，突出产品主体和包装细节。',
      category: '电商',
      tags: ['产品', '白底'],
      createdAt: 1,
    })

    expect(structure.familyId).toBe('product')
    expect(structure.scenarioId).toBe('product-shot')
    expect(structure.scene.id).toBe('product-shot')
    expect(structure.scene.label).toBe('商品展示')
    expect(structure.defaults.aspectLabel).toBe('1:1')
    expect(structure.recommendedMode).toBe('consumer')
    expect(getPromptTemplateStructureFieldDigest(structure.fields)).toContain('必填 · 商品主体')
  })

  it('infers a character template structure', () => {
    const structure = buildPromptTemplateStructure({
      id: 'portrait-template',
      title: '职业人像模板',
      content: '生成一张职业人像，人物状态自然，服装干练，适合职业照展示。',
      category: '人像',
      tags: ['人物', '职业照'],
      createdAt: 1,
    })

    expect(structure.familyId).toBe('character')
    expect(structure.scenarioId).toBe('portrait-look')
    expect(structure.scene.id).toBe('portrait-avatar')
    expect(structure.recommendedMode).toBe('pro')
    expect(structure.summary.find((item) => item.id === 'entry')?.value).toContain('专业版')
  })

  it('resolves guided default and recommended option strategies', () => {
    const structure = buildPromptTemplateStructure({
      id: 'generic-template',
      title: '通用起稿模板',
      content: '做一张能继续细化的图片，先把主体和用途说清楚。',
      createdAt: 1,
      structure: {
        status: 'structured',
        familyId: 'generic',
        scenarioId: 'generic-starter',
        scenarioLabel: '通用起稿',
        sceneDescription: '适合快速起稿。',
        scene: {
          id: 'generic-create',
          label: '通用创作',
          description: '适合快速起稿。',
          recommendedMode: 'consumer',
          recommendedIntent: 'task',
        },
        recommendedMode: 'consumer',
        recommendedIntent: 'task',
        entryModes: ['consumer'],
        defaults: {
          aspectLabel: '3:4',
          resolutionTier: '1k',
          quality: 'low',
        },
        fields: [
          {
            id: 'style',
            label: '风格方向',
            description: '说明整体风格。',
            group: 'style',
            input: 'text',
            guided: {
              defaultStrategy: 'first-option',
              recommendedOptionId: 'stylized',
              recommendedStrategy: 'configured',
              options: [
                {
                  id: 'realistic',
                  label: '真实稳妥',
                  prompt: '先保证真实稳妥。',
                },
                {
                  id: 'stylized',
                  label: '更有风格',
                  prompt: '更偏风格化。',
                },
              ],
            },
          },
        ],
        summary: [],
      },
    })

    expect(resolvePromptTemplateGuidedFieldDefaultOptionId(structure.fields[0]!)).toBe('realistic')
    expect(resolvePromptTemplateGuidedFieldRecommendedOptionId(structure.fields[0]!)).toBe('stylized')
  })
})
