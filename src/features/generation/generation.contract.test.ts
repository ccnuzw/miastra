import { describe, expect, it } from 'vitest'
import { getStudioFlowScene } from '@/features/prompt-templates/studioFlowSemantic'
import {
  buildGenerationContractSnapshot,
  buildGenerationSnapshotFromContract,
  resolveGenerationContractFromTask,
  resolveGenerationContractSnapshot,
  resolveGenerationSnapshotRecord,
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

  it('projects contract fields back into generation snapshot consistently', () => {
    const contract = buildGenerationContractSnapshot({
      scene: getStudioFlowScene('image-edit'),
      requestPrompt: '保留主体，背景更克制',
      workspacePrompt: '保留主体',
      mode: 'draw-image2image',
      size: '1536x1024',
      quality: 'low',
      model: 'gpt-image-1',
      providerId: 'openai',
      stream: true,
      draw: {
        count: 4,
        strategy: 'smart',
        concurrency: 2,
        delayMs: 0,
        retries: 1,
        timeoutSec: 90,
        safeMode: true,
        variationStrength: 'medium',
        dimensions: ['style'],
        batchId: 'batch-1',
        drawIndex: 1,
        variation: '保留主体',
      },
    })

    const snapshot = buildGenerationSnapshotFromContract(contract, {
      id: 'snapshot-2',
      createdAt: 2,
      apiUrl: '/api',
      requestUrl: '/v1/images/edits',
    })

    expect(snapshot.id).toBe('snapshot-2')
    expect(snapshot.mode).toBe('draw-image2image')
    expect(snapshot.requestPrompt).toBe('保留主体，背景更克制')
    expect(snapshot.workspacePrompt).toBe('保留主体')
    expect(snapshot.quality).toBe('low')
    expect(snapshot.stream).toBe(true)
    expect(snapshot.contract?.draw?.variation).toBe('保留主体')
  })

  it('normalizes snapshot top-level fields back to contract values', () => {
    const normalized = resolveGenerationSnapshotRecord(
      {
        id: 'snapshot-normalized',
        createdAt: 3,
        mode: 'text2image',
        prompt: '旧顶层请求',
        requestPrompt: '旧顶层请求',
        workspacePrompt: '旧顶层工作区',
        size: '1024x1024',
        quality: 'low',
        model: 'legacy-model',
        providerId: 'legacy-provider',
        apiUrl: '/legacy',
        requestUrl: '/legacy/request',
        stream: false,
        contract: buildGenerationContractSnapshot({
          scene: getStudioFlowScene('image-edit'),
          requestPrompt: '合同请求',
          workspacePrompt: '合同工作区',
          mode: 'image2image',
          size: '1536x1024',
          quality: 'high',
          model: 'gpt-image-1',
          providerId: 'openai',
          stream: true,
        }),
      },
      {
        requestPrompt: '兜底请求',
      },
    )

    expect(normalized.id).toBe('snapshot-normalized')
    expect(normalized.requestPrompt).toBe('合同请求')
    expect(normalized.workspacePrompt).toBe('合同工作区')
    expect(normalized.mode).toBe('image2image')
    expect(normalized.quality).toBe('high')
    expect(normalized.providerId).toBe('openai')
    expect(normalized.contract?.prompt.request).toBe('合同请求')
  })

  it('uses one prompt and parameter resolver for contract canonicalization', () => {
    const contract = resolveGenerationContractSnapshot(
      {
        id: 'snapshot-shared',
        createdAt: 5,
        mode: 'text2image',
        prompt: '旧请求',
        requestPrompt: '旧请求',
        workspacePrompt: '',
        size: '1024x1024',
        quality: 'low',
        model: 'legacy-model',
        providerId: 'legacy-provider',
        apiUrl: '',
        requestUrl: '',
        stream: false,
        contract: {
          version: 1,
          scene: getStudioFlowScene('product-shot'),
          prompt: {
            request: '合同请求',
            workspace: '合同工作区',
          },
          parameters: {
            mode: 'image2image',
            size: '1536x1024',
            quality: 'high',
            model: 'gpt-image-1',
            providerId: 'openai',
            stream: true,
          },
          guidedFlow: null,
        },
      },
      {
        requestPrompt: '兜底请求',
        workspacePrompt: '兜底工作区',
        providerId: 'fallback-provider',
      },
    )

    expect(contract.prompt).toEqual({
      request: '合同请求',
      workspace: '合同工作区',
    })
    expect(contract.parameters).toEqual({
      mode: 'image2image',
      size: '1536x1024',
      quality: 'high',
      model: 'gpt-image-1',
      providerId: 'openai',
      stream: true,
    })
  })

  it('resolves task payload and snapshot into the same contract source of truth', () => {
    const contract = resolveGenerationContractFromTask(
      {
        payload: {
          mode: 'image2image',
          title: '商品图',
          promptText: '保留主体，压暗背景',
          workspacePrompt: '保留主体',
          requestPrompt: '保留主体，压暗背景',
          size: '1536x1024',
          quality: 'medium',
          model: 'gpt-image-1',
          providerId: 'openai',
          stream: false,
          referenceImages: [
            { source: 'work', name: '上一版', src: 'https://example.com/work.png' },
          ],
        },
        result: {
          mode: 'image2image',
          promptText: '保留主体，压暗背景',
          size: '1536x1024',
          quality: 'high',
          providerModel: 'gpt-image-1',
        },
      },
      {
        snapshot: {
          id: 'snapshot-task',
          createdAt: 1,
          mode: 'image2image',
          prompt: '旧请求',
          requestPrompt: '旧请求',
          workspacePrompt: '旧工作区',
          size: '1024x1024',
          quality: 'low',
          model: 'legacy-model',
          providerId: 'legacy-provider',
          apiUrl: '',
          requestUrl: '',
          stream: true,
          contract: buildGenerationContractSnapshot({
            scene: getStudioFlowScene('image-edit'),
            requestPrompt: '合同请求',
            workspacePrompt: '合同工作区',
            mode: 'image2image',
            size: '1024x1024',
            quality: 'low',
            model: 'legacy-model',
            providerId: 'legacy-provider',
            stream: true,
          }),
        },
      },
    )

    expect(contract.scene.id).toBe('image-edit')
    expect(contract.prompt.request).toBe('合同请求')
    expect(contract.prompt.workspace).toBe('合同工作区')
    expect(contract.parameters.providerId).toBe('legacy-provider')
  })
})
