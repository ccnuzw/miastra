import { describe, expect, it } from 'vitest'
import {
  buildProviderEditFormData,
  buildProviderJsonBody,
  normalizeProviderApiUrlInput,
  normalizeProviderConfig,
} from './provider.utils'

describe('provider.utils', () => {
  it('normalizes provider api urls and strips endpoint suffixes', () => {
    expect(normalizeProviderApiUrlInput('https://api.openai.com/v1')).toBe('https://api.openai.com')
    expect(normalizeProviderApiUrlInput('https://example.com/v1/images/generations')).toBe('https://example.com')
    expect(normalizeProviderApiUrlInput('/sub2api/v1/images/edits')).toBe('')
  })

  it('normalizes managed provider config without exposing custom fields', () => {
    expect(normalizeProviderConfig({
      mode: 'managed',
      providerId: 'openai',
      managedProviderId: 'openai',
      apiUrl: ' https://api.openai.com/v1 ',
      model: ' gpt-image-2 ',
      apiKey: ' secret ',
    })).toEqual({
      mode: 'managed',
      providerId: 'openai',
      managedProviderId: 'openai',
      apiUrl: '',
      model: 'gpt-image-2',
      apiKey: '',
    })
  })

  it('normalizes custom provider config and strips endpoint suffixes', () => {
    expect(normalizeProviderConfig({
      mode: 'custom',
      providerId: 'custom',
      managedProviderId: '',
      apiUrl: ' https://api.openai.com/v1 ',
      model: ' gpt-image-2 ',
      apiKey: ' secret ',
    })).toEqual({
      mode: 'custom',
      providerId: 'custom',
      managedProviderId: '',
      apiUrl: 'https://api.openai.com',
      model: 'gpt-image-2',
      apiKey: 'secret',
    })
  })

  it('builds a single standard generation payload', () => {
    expect(buildProviderJsonBody({
      model: 'flux-1-dev',
      prompt: 'portrait',
      size: '1024x1024',
      quality: 'high',
      n: 1,
      stream: true,
    })).toEqual({
      model: 'flux-1-dev',
      prompt: 'portrait',
      size: '1024x1024',
      quality: 'high',
      stream: true,
    })
  })

  it('builds edit form data without provider-specific filtering', () => {
    const image = new File(['binary'], 'reference.png', { type: 'image/png' })
    const formData = buildProviderEditFormData({
      model: 'flux-1-dev',
      prompt: 'portrait',
      images: [image],
      size: '1024x1024',
      quality: 'high',
      n: 2,
    })

    expect(formData.get('quality')).toBe('high')
    expect(formData.get('n')).toBe('2')
    expect(formData.get('size')).toBe('1024x1024')
    expect(formData.getAll('image')).toHaveLength(1)
  })
})
