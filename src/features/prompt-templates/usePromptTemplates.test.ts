// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { normalizeTemplate, normalizeTemplates, sortPromptTemplates } from './usePromptTemplates'

describe('usePromptTemplates storage helpers', () => {
  it('normalizes template title and timestamps', () => {
    const normalized = normalizeTemplate({
      id: 'template-1',
      title: '  测试模板  ',
      content: 'prompt',
      category: '  海报  ',
      tags: ['  产品  ', '', '产品'],
      createdAt: 1,
    })

    expect(normalized.title).toBe('测试模板')
    expect(normalized.updatedAt).toBe(1)
    expect(normalized.category).toBe('海报')
    expect(normalized.tags).toEqual(['产品'])
  })

  it('sorts templates by updated time desc', () => {
    const normalized = normalizeTemplates([
      { id: 'a', title: 'A', content: 'a', createdAt: 1, updatedAt: 1 },
      { id: 'b', title: 'B', content: 'b', createdAt: 2, updatedAt: 3 },
    ])

    expect(normalized.map((item) => item.id)).toEqual(['b', 'a'])
  })

  it('sorts templates by recent use desc when requested', () => {
    const sorted = sortPromptTemplates([
      { id: 'a', title: 'A', content: 'a', createdAt: 1, updatedAt: 10, lastUsedAt: 20 },
      { id: 'b', title: 'B', content: 'b', createdAt: 2, updatedAt: 30, lastUsedAt: 5 },
      { id: 'c', title: 'C', content: 'c', createdAt: 3, updatedAt: 15 },
    ], 'used')

    expect(sorted.map((item) => item.id)).toEqual(['a', 'c', 'b'])
  })

})
