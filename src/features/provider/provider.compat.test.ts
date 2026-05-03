import { describe, expect, it } from 'vitest'
import { buildEditImageFormData, detectProviderCapabilities, mapGenerationJsonBody, normalizeProviderApiUrlInput } from './provider.compat'

describe('provider.compat', () => {
  it('normalizes provider api urls and strips endpoint suffixes', () => {
    expect(normalizeProviderApiUrlInput('https://api.openai.com/v1')).toBe('https://api.openai.com')
    expect(normalizeProviderApiUrlInput('https://example.com/v1/images/generations')).toBe('https://example.com')
    expect(normalizeProviderApiUrlInput('/sub2api/v1/images/edits')).toBe('/sub2api')
  })

  it('detects custom providers conservatively', () => {
    const capabilities = detectProviderCapabilities({
      providerId: 'custom',
      apiUrl: 'https://image.example.com/v1',
      model: 'flux-1-dev',
    })

    expect(capabilities.family).toBe('custom')
    expect(capabilities.supportsQuality).toBe(false)
    expect(capabilities.supportsStream).toBe(false)
    expect(capabilities.generationUrl).toBe('https://image.example.com/v1/images/generations')
  })

  it('omits unstable json params for custom non gpt-image providers', () => {
    expect(mapGenerationJsonBody({
      model: 'flux-1-dev',
      prompt: 'portrait',
      size: '1024x1024',
      quality: 'high',
      n: 1,
      stream: false,
    }, {
      providerId: 'custom',
      apiUrl: 'https://image.example.com/v1',
      model: 'flux-1-dev',
    })).toEqual({
      model: 'flux-1-dev',
      prompt: 'portrait',
      size: '1024x1024',
    })
  })

  it('omits quality from edit form data when provider capability is unknown', () => {
    const image = new File(['binary'], 'reference.png', { type: 'image/png' })
    const formData = buildEditImageFormData({
      model: 'flux-1-dev',
      prompt: 'portrait',
      images: [image],
      size: '1024x1024',
      quality: 'high',
      n: 1,
    }, {
      providerId: 'custom',
      apiUrl: 'https://image.example.com/v1',
      model: 'flux-1-dev',
    })

    expect(formData.get('quality')).toBeNull()
    expect(formData.get('n')).toBeNull()
    expect(formData.get('size')).toBe('1024x1024')
    expect(formData.getAll('image')).toHaveLength(1)
  })
})
