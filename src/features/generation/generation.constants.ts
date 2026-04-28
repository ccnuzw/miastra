import type { GenerationStage } from './generation.types'

export const singleGenerationTimeoutSec = 300
export const generationEndpoint = '/v1/images/generations'
export const editEndpoint = '/v1/images/edits'

export const stageLabels: Record<GenerationStage, string> = {
  idle: '待命',
  queued: '排队中',
  connecting: '连接服务',
  waiting: '等待模型',
  receiving: '接收图片',
  finalizing: '整理结果',
  success: '已完成',
  error: '失败',
  cancelled: '已取消',
}

export const stageProgress: Record<GenerationStage, number> = {
  idle: 0,
  queued: 8,
  connecting: 18,
  waiting: 42,
  receiving: 78,
  finalizing: 92,
  success: 100,
  error: 100,
  cancelled: 100,
}
