import { describe, expect, it } from 'vitest'
import type { ConsumerGuidedFlowSnapshot } from '@/features/studio-consumer/consumerGuidedFlow'
import type { GalleryImage } from './works.types'
import { getStudioFlowScene } from '@/features/prompt-templates/studioFlowSemantic'
import {
  buildTaskReplayWork,
  getTaskVersionSourceSummary,
  getWorkReplayReferenceSummary,
  getWorkVersionSourceSummary,
} from './workReplay'

describe('workReplay version summaries', () => {
  it('builds layered work version summaries for multi-round branches', () => {
    const workSummary = getWorkVersionSourceSummary({
      mode: 'image2image',
      variation: '保留主体，压暗背景',
      promptText: '保留人物主体，背景更干净，偏杂志风',
      promptSnippet: '保留人物主体，背景更干净',
      size: '1536x1024',
      quality: 'high',
      providerModel: 'gpt-image-1',
      generationSnapshot: {
        id: 'snapshot-1',
        createdAt: Date.now(),
        mode: 'image2image',
        prompt: '请求 Prompt',
        requestPrompt: '保留人物主体，背景更干净，偏杂志风',
        workspacePrompt: '人物主体保留，背景更干净',
        size: '1536x1024',
        quality: 'high',
        model: 'gpt-image-1',
        providerId: 'openai',
        apiUrl: '',
        requestUrl: '',
        stream: true,
        guidedFlow: {
          version: 1,
          guideId: 'portrait-refine',
          sceneId: 'image-edit',
          scene: getStudioFlowScene('image-edit'),
          guideTitle: '人像细化',
          guideDescription: '补充主体与背景要求',
          basePrompt: '人像',
          promptText: '人像精修',
          summary: '主体更稳定，背景更克制',
          questionOrder: ['subject', 'background'],
          totalQuestionCount: 2,
          completedQuestionCount: 2,
          steps: [],
          updatedAt: Date.now(),
        },
        references: {
          count: 2,
          note: '任务快照已保存全部参考图。父节点：父节点来自上一版作品。',
          sources: [
            { source: 'work' as const, name: '上一版', src: 'https://example.com/work.png' },
            { source: 'upload' as const, name: '补充背景', src: 'https://example.com/upload.png' },
          ],
        },
      },
    })

    expect(workSummary.originLabel).toBe('来自上一版 + 上传图继续改')
    expect(workSummary.sourceKind).toBe('mixed-chain')
    expect(workSummary.sourceKindLabel).toBe('混合参考派生')
    expect(workSummary.sourceDecisionLabel).toContain('历史作品和上传参考图')
    expect(workSummary.sceneLabel).toBe('图片继续修改')
    expect(workSummary.structureLabel).toContain('人像细化')
    expect(workSummary.nodePathLabel).toContain('节点链：')
    expect(workSummary.deltaHeadline).toContain('这一版主要变化')
    expect(workSummary.parentDeltaLabel).toContain('和父节点比')
    expect(workSummary.sourceDeltaLabel).toContain('和来源版比')
    expect(workSummary.quickDeltaLabels.length).toBeGreaterThan(0)
    expect(workSummary.deltaItems.some((item) => item.id === 'guided')).toBe(true)
    expect(workSummary.deltaItems.some((item) => item.id === 'parameters')).toBe(true)
    expect(workSummary.currentLabel).toContain('当前版追问')
    expect(workSummary.parentLabel).toContain('父节点：')
    expect(workSummary.ancestorLabel).toContain('更早来源：')
    expect(workSummary.guidedFlowLabel).toContain('追问：')
    expect(workSummary.guidedFlowLabel).toContain('主体更稳定')
    expect(workSummary.parameterLabel).toContain('参数：图生图')
    expect(workSummary.referenceLabel).toContain('参考：恢复 2/2')
    expect(workSummary.promptLabel).toContain('请求：')
  })

  it('builds task summaries that keep retry lineage readable', () => {
    const replayWork: Pick<
      GalleryImage,
      | 'mode'
      | 'drawIndex'
      | 'variation'
      | 'promptText'
      | 'promptSnippet'
      | 'size'
      | 'quality'
      | 'providerModel'
      | 'generationSnapshot'
    > = {
      mode: 'draw-image2image' as const,
      drawIndex: 1,
      variation: '保留人物，强化霓虹',
      promptText: '人物不变，霓虹更明显',
      promptSnippet: '人物不变，霓虹更明显',
      size: '1024x1536',
      quality: 'medium',
      providerModel: 'gpt-image-1',
      generationSnapshot: {
        id: 'snapshot-2',
        createdAt: Date.now(),
        mode: 'draw-image2image' as const,
        prompt: '请求 Prompt',
        requestPrompt: '人物不变，霓虹更明显',
        workspacePrompt: '人物不变，霓虹更明显',
        size: '1024x1536',
        quality: 'medium',
        model: 'gpt-image-1',
        providerId: 'openai',
        apiUrl: '',
        requestUrl: '',
        stream: false,
        references: {
          count: 1,
          note: '任务快照已保存全部参考图。父节点：任务 abcdef12 的同一版结果。',
          sources: [
            {
              source: 'work' as const,
              name: '上一轮结果',
              src: 'https://example.com/work-2.png',
            },
          ],
        },
      },
    }

    const taskSummary = getTaskVersionSourceSummary(
      {
        id: 'task-2',
        parentTaskId: 'abcdef123456',
        retryAttempt: 2,
        rootTaskId: 'root-task-1',
        drawIndex: 1,
        variation: '保留人物，强化霓虹',
        payload: {
          mode: 'draw-image2image',
          title: '夜景海报',
          meta: '电影感',
          promptText: '人物不变，霓虹更明显',
          workspacePrompt: '人物不变，霓虹更明显',
          requestPrompt: '人物不变，霓虹更明显',
          size: '1024x1536',
          quality: 'medium',
          model: 'gpt-image-1',
          providerId: 'openai',
          stream: false,
          referenceImages: [{ source: 'work' as const, name: '上一轮结果', src: 'https://example.com/work-2.png' }],
          draw: {
            count: 4,
            strategy: 'smart',
            concurrency: 2,
            delayMs: 0,
            retries: 2,
            timeoutSec: 120,
            safeMode: true,
            variationStrength: 'medium',
            dimensions: ['style'],
            batchId: 'batch-1',
            drawIndex: 1,
            variation: '保留人物，强化霓虹',
          },
        },
      },
      replayWork,
    )

    expect(taskSummary.originLabel).toBe('来自上一轮结果的同版重试')
    expect(taskSummary.sourceKind).toBe('task-retry')
    expect(taskSummary.sourceKindLabel).toBe('同版重试')
    expect(taskSummary.sourceDecisionLabel).toContain('同一版本的重试链')
    expect(taskSummary.sceneLabel).toBe('图片继续修改')
    expect(taskSummary.structureLabel).toContain('未挂接追问')
    expect(taskSummary.nodePathLabel).toContain('同版重试')
    expect(taskSummary.deltaHeadline).toContain('同版尝试')
    expect(taskSummary.parentDeltaLabel).toContain('保留同一版目标')
    expect(taskSummary.sourceDeltaLabel).toContain('同一来源快照')
    expect(taskSummary.quickDeltaLabels).toContain('重试链重试')
    expect(taskSummary.deltaItems[0]?.id).toBe('retry')
    expect(taskSummary.currentLabel).toContain('第 3 次同版尝试')
    expect(taskSummary.parentLabel).toContain('父节点：任务 abcdef12')
    expect(taskSummary.ancestorLabel).toContain('根任务')
    expect(taskSummary.parameterLabel).toContain('参数：图生图')
    expect(taskSummary.referenceLabel).toContain('参考：恢复 1/1')
  })

  it('extends replay reference summary with current and ancestor context', () => {
    const summary = getWorkReplayReferenceSummary({
      mode: 'text2image',
      promptText: '白底产品图',
      promptSnippet: '白底产品图',
      size: '1024x1024',
      quality: 'auto',
      providerModel: 'gpt-image-1',
      generationSnapshot: {
        id: 'snapshot-3',
        createdAt: Date.now(),
        mode: 'text2image',
        prompt: '白底产品图',
        requestPrompt: '白底产品图',
        workspacePrompt: '白底产品图',
        size: '1024x1024',
        quality: 'auto',
        model: 'gpt-image-1',
        providerId: 'openai',
        apiUrl: '',
        requestUrl: '',
        stream: false,
      },
    })

    expect(summary.currentSummary).toContain('当前版描述')
    expect(summary.guidedSummary).toContain('当前没有挂接正式追问结果')
    expect(summary.parameterSummary).toContain('参数：文生图')
    expect(summary.ancestorSummary).toContain('更早来源：当前仍在这个主题的首版主线上继续推进')
  })

  it('marks replayed guided flow as returning to the same skill loop', () => {
    const replayGuidedFlow: ConsumerGuidedFlowSnapshot = {
      version: 1,
      guideId: 'template:tpl-product',
      sceneId: 'product-shot',
      scene: getStudioFlowScene('product-shot'),
      guideTitle: '商品模板 · 模板追问',
      guideDescription: '商品追问',
      basePrompt: '商品图',
      promptText: '商品图',
      summary: '用途场景：电商主图 / 背景方向：白底',
      questionOrder: ['usageScenario', 'backgroundStyle'],
      totalQuestionCount: 2,
      completedQuestionCount: 2,
      steps: [],
      sourceType: 'template',
      templateId: 'tpl-product',
      templateTitle: '商品模板',
      followUpMode: 'template-guided',
      followUpLabel: '模板追问 2/2 步',
      actionPriority: ['continue-edit', 'guided-refine', 'retry-version'],
      defaultActionId: 'continue-edit',
      updatedAt: Date.now(),
    }

    const replayWork = {
      promptText: '做一张更干净的商品主图',
      promptSnippet: '做一张更干净的商品主图',
      mode: 'image2image' as const,
      providerModel: 'gpt-image-1',
      size: '1024x1024',
      quality: 'high',
      generationSnapshot: {
        id: 'snapshot-replay',
        createdAt: Date.now(),
        mode: 'image2image' as const,
        prompt: '请求 Prompt',
        requestPrompt: '做一张更干净的商品主图',
        workspacePrompt: '做一张更干净的商品主图',
        size: '1024x1024',
        quality: 'high',
        model: 'gpt-image-1',
        providerId: 'openai',
        apiUrl: '',
        requestUrl: '',
        stream: false,
        guidedFlow: replayGuidedFlow,
      },
    } satisfies Pick<
      GalleryImage,
      | 'mode'
      | 'drawIndex'
      | 'variation'
      | 'promptText'
      | 'promptSnippet'
      | 'size'
      | 'quality'
      | 'providerModel'
      | 'generationSnapshot'
    >

    const task = {
      id: 'task-replay-1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      payload: {
        mode: 'image2image' as const,
        title: '商品主图',
        meta: '电商',
        promptText: '做一张更干净的商品主图',
        workspacePrompt: '做一张更干净的商品主图',
        requestPrompt: '做一张更干净的商品主图',
        size: '1024x1024',
        quality: 'high',
        model: 'gpt-image-1',
        providerId: 'openai',
        stream: false,
        referenceImages: [],
      },
    }

    const built = getTaskVersionSourceSummary(task as never, replayWork)

    expect(built.guidedFlowLabel).toContain('追问：当前版本已回到 Skill')
    expect(built.structureLabel).toContain('版本回流')
  })

  it('builds replay work snapshots from task contract fields consistently', () => {
    const replayed = buildTaskReplayWork({
      id: 'task-replay-contract',
      userId: 'user-1',
      status: 'failed',
      retryAttempt: 0,
      rootTaskId: 'task-replay-contract',
      retryable: true,
      createdAt: new Date(10).toISOString(),
      updatedAt: new Date(20).toISOString(),
      payload: {
        mode: 'draw-image2image',
        title: '夜景商品图',
        meta: '抽卡',
        promptText: '保留主体，背景更克制',
        workspacePrompt: '保留主体',
        requestPrompt: '保留主体，背景更克制',
        snapshotId: 'snapshot-contract',
        size: '1536x1024',
        quality: 'low',
        model: 'gpt-image-1',
        providerId: 'openai',
        stream: true,
        referenceImages: [
          {
            source: 'work',
            name: '上一版',
            src: 'https://example.com/work.png',
          },
        ],
        draw: {
          count: 4,
          strategy: 'smart',
          concurrency: 2,
          delayMs: 0,
          retries: 2,
          timeoutSec: 90,
          safeMode: true,
          variationStrength: 'medium',
          dimensions: ['style'],
          batchId: 'batch-contract',
          drawIndex: 1,
          variation: '保留主体',
        },
      },
    })

    expect(replayed.mode).toBe('draw-image2image')
    expect(replayed.quality).toBe('low')
    expect(replayed.generationSnapshot?.requestPrompt).toBe('保留主体，背景更克制')
    expect(replayed.generationSnapshot?.workspacePrompt).toBe('保留主体')
    expect(replayed.generationSnapshot?.stream).toBe(true)
    expect(replayed.generationSnapshot?.draw?.variation).toBe('保留主体')
    expect(replayed.generationSnapshot?.contract?.references?.count).toBe(1)
  })
})
