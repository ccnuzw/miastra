import { describe, expect, it } from 'vitest'
import { createPromptTemplateTitle } from './promptTemplate.utils'

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
})
