import { describe, expect, it } from 'vitest'
import { createDuplicatedPromptTemplateTitle, createPromptTemplateTitle, normalizePromptTemplateTags } from './promptTemplate.utils'

describe('createPromptTemplateTitle', () => {
  it('uses the first non-empty line', () => {
    expect(createPromptTemplateTitle('\n\n  第一行提示词\n第二行')).toBe('第一行提示词')
  })

  it('falls back when content is blank', () => {
    expect(createPromptTemplateTitle('   \n\n')).toBe('Prompt 模板')
  })

  it('truncates long titles', () => {
    expect(createPromptTemplateTitle('abcdefghijklmnopqrstuvwxyz12345')).toBe('abcdefghijklmnopqrstuvwxyz12…')
  })

  it('builds a duplicated title with suffix', () => {
    expect(createDuplicatedPromptTemplateTitle('产品海报模板')).toBe('产品海报模板 副本')
  })

  it('deduplicates and trims tags from mixed separators', () => {
    expect(normalizePromptTemplateTags(' 产品, 营销，产品\n轻奢 ')).toEqual(['产品', '营销', '轻奢'])
  })
})
