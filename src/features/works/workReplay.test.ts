import { describe, expect, it } from 'vitest'
import { getStudioFlowScene } from '@/features/prompt-templates/studioFlowSemantic'
import {
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
    expect(workSummary.currentLabel).toContain('当前版追问')
    expect(workSummary.parentLabel).toContain('父节点：')
    expect(workSummary.ancestorLabel).toContain('更早来源：')
    expect(workSummary.guidedFlowLabel).toContain('追问：主体更稳定')
    expect(workSummary.parameterLabel).toContain('参数：图生图')
    expect(workSummary.referenceLabel).toContain('参考：恢复 2/2')
    expect(workSummary.promptLabel).toContain('请求：')
  })

  it('builds task summaries that keep retry lineage readable', () => {
    const replayWork = {
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
    expect(taskSummary.currentLabel).toContain('第 3 次同版尝试')
    expect(taskSummary.parentLabel).toContain('父节点：任务 abcdef12')
    expect(taskSummary.ancestorLabel).toContain('根任务')
    expect(taskSummary.parameterLabel).toContain('4 次抽卡')
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
})
