import type { GenerationStage } from './generation.types'

export function formatElapsed(ms: number) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return minutes ? `${minutes}m ${rest}s` : `${rest}s`
}

export function waitingHint(stage: GenerationStage, elapsedMs: number) {
  if (stage === 'queued') return '防抖保护中，避免重复提交。'
  if (stage === 'connecting') return '正在连接当前接入，请保持页面打开。'
  if (stage === 'waiting')
    return elapsedMs > 90000
      ? '模型仍在生成，大图或图生图可能需要更久。'
      : '请求已发出，等待模型返回。'
  if (stage === 'receiving') return '正在接收图片数据，请勿重复点击。'
  if (stage === 'finalizing') return '正在整理图片和作品列表。'
  if (stage === 'success') return '生成完成，结果已加入作品区。'
  if (stage === 'error') return '生成失败，请查看接口响应。'
  if (stage === 'cancelled') return '任务已取消。'
  return '准备好后点击开始生成。'
}
