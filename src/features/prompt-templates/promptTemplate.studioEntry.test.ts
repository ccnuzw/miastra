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
      nextAction: undefined,
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
      nextAction: undefined,
    })
  })

  it('clears both unified and legacy launch params', () => {
    const params = new URLSearchParams(
      'template=template-3&templateMode=consumer&templateEntry=task&entryMode=consumer&entryIntent=task&scene=poster-campaign&source=template&nextAction=continue-edit',
    )

    expect(clearPromptTemplateStudioLaunch(params).toString()).toBe('')
  })

  it('reads next action when provided', () => {
    const url = new URL(
      buildPromptTemplateStudioPath({
        templateId: 'template-4',
        mode: 'pro',
        intent: 'panel',
        sceneId: 'illustration-concept',
        sourceType: 'template',
        nextAction: 'branch-version',
      }),
      'https://example.com',
    )

    expect(readPromptTemplateStudioLaunch(url.searchParams)).toEqual({
      templateId: 'template-4',
      mode: 'pro',
      intent: 'panel',
      sceneId: 'illustration-concept',
      sourceType: 'template',
      nextAction: 'branch-version',
    })
  })

  it('ignores invalid scene, source and action params', () => {
    const params = new URLSearchParams(
      'template=template-5&entryMode=consumer&entryIntent=task&scene=unknown-scene&source=unknown-source&nextAction=unknown-action',
    )

    expect(readPromptTemplateStudioLaunch(params)).toEqual({
      templateId: 'template-5',
      mode: 'consumer',
      intent: 'task',
      sceneId: undefined,
      sourceType: 'template',
      nextAction: undefined,
    })
  })
})
