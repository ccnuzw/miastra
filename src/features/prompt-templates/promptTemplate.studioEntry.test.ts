import { describe, expect, it } from 'vitest'
import {
  buildPromptTemplateStudioPath,
  clearPromptTemplateStudioLaunch,
  readPromptTemplateStudioLaunch,
} from './promptTemplate.studioEntry'

describe('promptTemplate.studioEntry', () => {
  it('reads unified studio launch params', () => {
    const url = new URL(
      buildPromptTemplateStudioPath({
        templateId: 'template-1',
        mode: 'consumer',
        intent: 'task',
        sceneId: 'product-shot',
        sourceType: 'template',
      }),
      'https://example.com',
    )

    expect(readPromptTemplateStudioLaunch(url.searchParams)).toEqual({
      templateId: 'template-1',
      mode: 'consumer',
      intent: 'task',
      sceneId: 'product-shot',
      sourceType: 'template',
    })
  })

  it('keeps backward compatibility for legacy launch params', () => {
    const params = new URLSearchParams('template=template-2&templateMode=pro&templateEntry=panel')

    expect(readPromptTemplateStudioLaunch(params)).toEqual({
      templateId: 'template-2',
      mode: 'pro',
      intent: 'panel',
      sceneId: undefined,
      sourceType: 'template',
    })
  })

  it('clears both unified and legacy launch params', () => {
    const params = new URLSearchParams(
      'template=template-3&templateMode=consumer&templateEntry=task&entryMode=consumer&entryIntent=task&scene=poster-campaign&source=template',
    )

    expect(clearPromptTemplateStudioLaunch(params).toString()).toBe('')
  })
})
