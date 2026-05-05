import { describe, expect, it } from 'vitest'
import { buildPromptTemplateStructure, getPromptTemplateStructureFieldDigest } from './promptTemplate.schema'

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
})
