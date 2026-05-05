import { describe, expect, it } from 'vitest'
import { getStudioFlowScene } from '@/features/prompt-templates/studioFlowSemantic'
import {
  rebaseConsumerGuidedFlowSnapshot,
  type ConsumerGuidedFlowSnapshot,
} from './consumerGuidedFlow'

describe('consumerGuidedFlow', () => {
  it('rebases runtime source, action and loop state consistently', () => {
    const snapshot: ConsumerGuidedFlowSnapshot = {
      version: 1,
      guideId: 'template:poster',
      sceneId: 'poster-campaign',
      scene: getStudioFlowScene('poster-campaign'),
      guideTitle: '海报模板 · 模板追问',
      guideDescription: '模板追问',
      basePrompt: '做一张活动海报。',
      promptText: '做一张活动海报。',
      summary: '已带入传播目标',
      questionOrder: [],
      totalQuestionCount: 0,
      completedQuestionCount: 0,
      steps: [],
      sourceType: 'template',
      templateId: 'template-poster',
      templateTitle: '海报模板',
      entryMode: 'consumer',
      entryIntent: 'task',
      followUpMode: 'template-guided',
      followUpLabel: '模板追问',
      defaultActionId: 'continue-edit',
      actionPriority: ['continue-edit', 'branch-version'],
      runtimeDecision: {
        entries: {
          consumer: {
            mode: 'consumer',
            intent: 'task',
            available: true,
            recommended: true,
            locked: false,
            reason: '当前模板推荐从这个入口进入。',
            summary: '普通版入口',
          },
          pro: {
            mode: 'pro',
            intent: 'panel',
            available: true,
            recommended: false,
            locked: false,
            reason: '当前模板允许从这个入口进入。',
            summary: '专业版入口',
          },
        },
        availableEntryModes: ['consumer', 'pro'],
        recommendedEntry: {
          mode: 'consumer',
          intent: 'task',
          available: true,
          recommended: true,
          locked: false,
          reason: '当前模板推荐从这个入口进入。',
          summary: '普通版入口',
        },
        activeEntry: {
          mode: 'consumer',
          intent: 'task',
          available: true,
          recommended: true,
          locked: false,
          reason: '当前模板推荐从这个入口进入。',
          summary: '普通版入口',
        },
        followUp: {
          mode: 'template-guided',
          summary: '已带入传播目标',
          guidedQuestionCount: 0,
          guidedFieldLabels: [],
        },
        result: {
          defaultActionId: 'continue-edit',
          actionPriority: ['continue-edit', 'branch-version'],
          summary: '默认先走继续修改。',
        },
        contract: {
          sourceType: 'template',
          summary: 'contract 已记录模板入口。',
        },
        version: {
          summary: '版本链保持同一上下文。',
        },
      },
      updatedAt: 1,
    }

    const next = rebaseConsumerGuidedFlowSnapshot(snapshot, {
      sourceType: 'result-action',
      stage: 'result-action',
      actionId: 'branch-version',
      followUpMode: 'scene-guided',
      promptAppendix: '请换个风格。',
      promptText: '做一张活动海报。\n请换个风格。',
    })

    expect(next.sourceType).toBe('result-action')
    expect(next.actionId).toBe('branch-version')
    expect(next.followUpMode).toBe('scene-guided')
    expect(next.promptAppendix).toBe('请换个风格。')
    expect(next.promptText).toContain('请换个风格。')
    expect(next.runtimeDecision?.contract.sourceType).toBe('result-action')
    expect(next.runtimeDecision?.result.defaultActionId).toBe('continue-edit')
    expect(next.loopState?.stage).toBe('result-action')
    expect(next.loopState?.lastActionId).toBe('branch-version')
    expect(next.loopState?.runLabel).toContain('Skill')
  })
})
