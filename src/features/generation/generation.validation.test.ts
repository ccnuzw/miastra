import { describe, expect, it } from 'vitest'
import { validateGenerationInputState } from './generation.validation'

describe('generation.validation', () => {
  it('allows managed provider generation without custom api url and api key', () => {
    expect(validateGenerationInputState({
      mode: 'managed',
      providerId: 'openai-main',
      managedProviderId: 'openai-main',
      apiUrl: '',
      model: 'gpt-image-2',
      apiKey: '',
    }, '一只猫')).toEqual({ ok: true })
  })

  it('requires a managed provider selection in managed mode', () => {
    expect(validateGenerationInputState({
      mode: 'managed',
      providerId: '',
      managedProviderId: '',
      apiUrl: '',
      model: 'gpt-image-2',
      apiKey: '',
    }, '一只猫')).toEqual({
      ok: false,
      message: '请先在右上角设置里选择公共 Provider',
      openSettings: true,
    })
  })

  it('requires api key in custom mode', () => {
    expect(validateGenerationInputState({
      mode: 'custom',
      providerId: 'custom',
      managedProviderId: '',
      apiUrl: '',
      model: 'gpt-image-2',
      apiKey: '',
    }, '一只猫')).toEqual({
      ok: false,
      message: '请先在右上角设置里填写 Provider API Key',
      openSettings: true,
    })
  })

  it('treats prompt as a separate validation error', () => {
    expect(validateGenerationInputState({
      mode: 'managed',
      providerId: 'openai-main',
      managedProviderId: 'openai-main',
      apiUrl: '',
      model: 'gpt-image-2',
      apiKey: '',
    }, '   ')).toEqual({
      ok: false,
      message: '请先填写提示词',
      openSettings: false,
    })
  })
})
