import { describe, expect, it } from 'vitest'
import { getStudioFlowScene } from '@/features/prompt-templates/studioFlowSemantic'
import {
  buildGenerationContractSnapshot,
  resolveGenerationContractSnapshot,
} from './generation.contract'

describe('generation.contract', () => {
  it('builds a stable contract snapshot from request context', () => {
    const contract = buildGenerationContractSnapshot({
      scene: getStudioFlowScene('product-shot'),
      requestPrompt: '商品主图请求',
      workspacePrompt: '商品主图工作区',
      mode: 'image2image',
      size: '1024x1024',
      quality: 'high',
      model: 'gpt-image-1',
      providerId: 'openai',
      stream: true,
      references: {
        count: 1,
        sources: [{ source: 'work', name: '上一版', src: 'https://example.com/work.png' }],
        note: '任务快照已保存全部参考图。',
      },
    })

    expect(contract.scene.id).toBe('product-shot')
    expect(contract.prompt.request).toBe('商品主图请求')
    expect(contract.prompt.workspace).toBe('商品主图工作区')
    expect(contract.parameters.mode).toBe('image2image')
    expect(contract.references?.count).toBe(1)
  })

  it('resolves legacy snapshots into the same contract shape', () => {
    const contract = resolveGenerationContractSnapshot(
      {
        id: 'snapshot-1',
        createdAt: 1,
        mode: 'text2image',
        prompt: '旧请求 Prompt',
        requestPrompt: '旧请求 Prompt',
        workspacePrompt: '旧工作区 Prompt',
        size: '1536x1024',
        quality: 'medium',
        model: 'gpt-image-1',
        providerId: 'openai',
        apiUrl: '',
        requestUrl: '',
        stream: false,
        guidedFlow: {
          version: 1,
          guideId: 'legacy-guide',
          sceneId: 'poster-campaign',
          scene: getStudioFlowScene('poster-campaign'),
          guideTitle: '海报补充',
          guideDescription: '补主题信息',
          basePrompt: '海报',
          promptText: '海报补充',
          summary: '主题更清楚',
          questionOrder: ['headline'],
          totalQuestionCount: 1,
          completedQuestionCount: 1,
          steps: [],
          updatedAt: 1,
        },
      },
      {
        providerId: 'fallback-provider',
      },
    )

    expect(contract.scene.id).toBe('poster-campaign')
    expect(contract.prompt.request).toBe('旧请求 Prompt')
    expect(contract.prompt.workspace).toBe('旧工作区 Prompt')
    expect(contract.parameters.providerId).toBe('openai')
    expect(contract.guidedFlow?.summary).toBe('主题更清楚')
  })
})
