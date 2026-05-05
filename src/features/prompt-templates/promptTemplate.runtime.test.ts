import { describe, expect, it } from 'vitest'
import {
  buildPromptTemplateGuidedFlowSnapshot,
  buildPromptTemplateRuntimeConsumption,
  buildPromptTemplateRuntimeContext,
  resolvePromptTemplateRuntimeMode,
} from './promptTemplate.runtime'

describe('promptTemplate runtime', () => {
  it('builds template guided flow snapshot with default action priority', () => {
    const snapshot = buildPromptTemplateGuidedFlowSnapshot({
      id: 'template-product',
      title: '商品展示模板',
      content: '做一张适合商品展示的图片。',
      category: '电商',
      tags: ['商品', '白底'],
      createdAt: 1,
    })

    expect(snapshot).not.toBeNull()
    expect(snapshot?.sourceType).toBe('template')
    expect(snapshot?.templateId).toBe('template-product')
    expect(snapshot?.followUpMode).toBe('template-guided')
    expect(snapshot?.completedQuestionCount).toBe(3)
    expect(snapshot?.defaultActionId).toBe('continue-edit')
    expect(snapshot?.actionPriority).toEqual(['continue-edit', 'guided-refine', 'retry-version'])
    expect(snapshot?.promptText).toContain('优先满足电商主图使用')
    expect(snapshot?.summary).toContain('已按模板默认追问路径带入')
    expect(snapshot?.loopState?.stage).toBe('template-entry')
    expect(snapshot?.loopState?.nextActionId).toBe('continue-edit')
    expect(snapshot?.loopState?.runLabel).toContain('已进入运行态')
    expect(snapshot?.runtimeDecision?.activeEntry.mode).toBe('consumer')
    expect(snapshot?.runtimeDecision?.recommendedEntry.mode).toBe('consumer')
    expect(snapshot?.runtimeDecision?.contract.summary).toContain('运行时 contract')
    expect(snapshot?.runtimeDecision?.result.summary).toContain('默认先走')
  })

  it('returns null when template does not expose guided fields', () => {
    const snapshot = buildPromptTemplateGuidedFlowSnapshot({
      id: 'template-illustration',
      title: '插画概念模板',
      content: '生成一张未来旅人的概念插画。',
      category: '插画',
      tags: ['概念图'],
      createdAt: 1,
      structure: {
        status: 'structured',
        familyId: 'illustration',
        scenarioId: 'illustration-concept',
        scenarioLabel: '插画概念',
        sceneDescription: '适合概念图、叙事插画和风格实验。',
        scene: {
          id: 'illustration-concept',
          label: '插画概念',
          description: '适合概念图、叙事插画和风格实验。',
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
        fields: [
          {
            id: 'story-subject',
            label: '故事主体',
            description: '说明故事主体。',
            group: 'subject',
            input: 'textarea',
            required: true,
          },
        ],
        summary: [],
      },
    })

    expect(snapshot).toBeNull()
  })

  it('falls back to template-allowed entry mode when preferred mode is unavailable', () => {
    const template = {
      id: 'template-generic',
      title: '长文模板',
      content: '生成一张未来旅人的概念插画，强调世界观、服装层次、远景建筑、叙事感和电影级光影。',
      createdAt: 1,
      structure: {
        status: 'structured' as const,
        familyId: 'generic' as const,
        scenarioId: 'generic-starter' as const,
        scenarioLabel: '通用起稿',
        sceneDescription: '适合先起稿，再逐步补主体、风格和用途。',
        scene: {
          id: 'generic-create' as const,
          label: '通用创作',
          description: '适合先起稿，再逐步补主体、风格和用途。',
          recommendedMode: 'consumer' as const,
          recommendedIntent: 'task' as const,
        },
        recommendedMode: 'consumer' as const,
        recommendedIntent: 'task' as const,
        entryModes: ['pro' as const],
        defaults: {
          aspectLabel: '3:4',
          resolutionTier: '1k' as const,
          quality: 'medium' as const,
        },
        fields: [
          {
            id: 'generic-subject',
            label: '主体方向',
            description: '说明主体是什么。',
            group: 'subject' as const,
            input: 'textarea' as const,
            guided: {
              questionTitle: '主体更偏什么？',
              options: [
                {
                  id: 'traveler',
                  label: '旅行者',
                  prompt: '主体以未来旅行者为主，轮廓明确。',
                },
              ],
            },
          },
        ],
        summary: [],
      },
    }

    expect(resolvePromptTemplateRuntimeMode(template, 'consumer')).toBe('pro')
    const snapshot = buildPromptTemplateGuidedFlowSnapshot(template, 'consumer')
    expect(snapshot?.entryMode).toBe('pro')
    expect(snapshot?.entryIntent).toBe('panel')
    expect(snapshot?.runtimeDecision?.activeEntry.mode).toBe('pro')
    expect(snapshot?.runtimeDecision?.entries.consumer.available).toBe(false)
  })

  it('builds normalized runtime context from template decision', () => {
    const context = buildPromptTemplateRuntimeContext(
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
      'consumer',
    )

    expect(context.mode).toBe('pro')
    expect(context.intent).toBe('panel')
    expect(context.sceneId).toBe('portrait-avatar')
    expect(context.sourceType).toBe('template')
    expect(context.nextActionId).toBe('guided-refine')
  })

  it('keeps template runtime context and guided flow aligned when overrides are present', () => {
    const template = {
      id: 'template-poster',
      title: '海报模板',
      content: '做一张活动海报。',
      category: '海报',
      tags: ['海报'],
      createdAt: 1,
    }

    const runtime = buildPromptTemplateRuntimeConsumption(template, 'consumer', {
      sceneId: 'image-edit',
      sourceType: 'template',
      nextActionId: 'retry-version',
    })

    expect(runtime.context.sceneId).toBe('image-edit')
    expect(runtime.context.nextActionId).toBe('retry-version')
    expect(runtime.guidedFlow?.sceneId).toBe('image-edit')
    expect(runtime.guidedFlow?.sourceType).toBe('template')
    expect(runtime.guidedFlow?.defaultActionId).toBe('retry-version')
    expect(runtime.guidedFlow?.runtimeDecision?.result.defaultActionId).toBe('retry-version')
    expect(runtime.promptText).toBe(runtime.guidedFlow?.promptText)
  })

  it('keeps overridden next action as the runtime mainline action boundary', () => {
    const runtime = buildPromptTemplateRuntimeConsumption(
      {
        id: 'template-runtime-boundary',
        title: '商品模板',
        content: '做一张商品图。',
        category: '商品',
        tags: ['商品'],
        createdAt: 1,
      },
      'consumer',
      {
        nextActionId: 'retry-version',
      },
    )

    expect(runtime.context.nextActionId).toBe('retry-version')
    expect(runtime.guidedFlow?.defaultActionId).toBe('retry-version')
    expect(runtime.guidedFlow?.actionPriority?.[0]).toBe('retry-version')
    expect(runtime.guidedFlow?.loopState?.nextActionId).toBe('retry-version')
  })
})
