import { describe, expect, it } from 'vitest'
import {
  buildPromptTemplateStudioLaunch,
  buildPromptTemplateStudioPath,
  clearPromptTemplateStudioLaunch,
  readPromptTemplateStudioLaunch,
  resolvePromptTemplateStudioLaunch,
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

  it('infers intent when low-frequency launch only keeps mode', () => {
    const params = new URLSearchParams('template=template-5&entryMode=pro')

    expect(readPromptTemplateStudioLaunch(params)).toEqual({
      templateId: 'template-5',
      mode: 'pro',
      intent: 'panel',
      sceneId: undefined,
      sourceType: 'template',
      nextAction: undefined,
    })
  })

  it('infers mode when low-frequency launch only keeps intent', () => {
    const params = new URLSearchParams('template=template-5&entryIntent=task')

    expect(readPromptTemplateStudioLaunch(params)).toEqual({
      templateId: 'template-5',
      mode: 'consumer',
      intent: 'task',
      sceneId: undefined,
      sourceType: 'template',
      nextAction: undefined,
    })
  })

  it('builds a normalized launch object before serializing path', () => {
    const launch = buildPromptTemplateStudioLaunch({
      templateId: 'template-6',
      mode: 'consumer',
      intent: 'task',
      sceneId: 'poster-campaign',
      nextAction: 'continue-edit',
    })

    expect(launch).toEqual({
      templateId: 'template-6',
      mode: 'consumer',
      intent: 'task',
      sceneId: 'poster-campaign',
      sourceType: 'template',
      nextAction: 'continue-edit',
    })
  })

  it('resolves launch by template runtime decision', () => {
    const launch = resolvePromptTemplateStudioLaunch(
      {
        id: 'template-character',
        title: '角色模板',
        content: '做一张角色设定图。',
        category: '角色',
        tags: ['角色'],
        createdAt: 1,
        structure: {
          status: 'structured',
          familyId: 'character',
          scenarioId: 'portrait-look',
          scenarioLabel: '角色设定',
          sceneDescription: '适合角色设定与人物形象探索。',
          scene: {
            id: 'portrait-avatar',
            label: '人物形象',
            description: '适合头像、人像和角色形象图。',
            recommendedMode: 'pro',
            recommendedIntent: 'panel',
          },
          recommendedMode: 'pro',
          recommendedIntent: 'panel',
          entryModes: ['pro'],
          defaults: {
            aspectLabel: '3:4',
            resolutionTier: '2k',
            quality: 'high',
          },
          fields: [],
          summary: [],
        },
      },
      {
        templateId: 'template-character',
        mode: 'consumer',
        intent: 'task',
        sourceType: 'template',
      },
    )

    expect(launch).toEqual({
      templateId: 'template-character',
      mode: 'pro',
      intent: 'panel',
      sceneId: 'portrait-avatar',
      sourceType: 'template',
      nextAction: 'guided-refine',
    })
  })

  it('keeps resolved launch next action aligned with runtime boundary overrides', () => {
    const launch = resolvePromptTemplateStudioLaunch(
      {
        id: 'template-product',
        title: '商品模板',
        content: '做一张商品图。',
        category: '商品',
        tags: ['商品'],
        createdAt: 1,
      },
      {
        templateId: 'template-product',
        mode: 'consumer',
        intent: 'task',
        sourceType: 'template',
        nextAction: 'retry-version',
      },
    )

    expect(launch.nextAction).toBe('retry-version')
    expect(launch.sourceType).toBe('template')
  })
})
