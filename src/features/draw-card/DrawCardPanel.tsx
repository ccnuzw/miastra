import type { GalleryImage } from '@/features/works/works.types'
import type { DrawStrategy, VariationStrength, DrawTaskStatus } from './drawCard.types'
import { drawStrategyOptions, variationDimensions, variationStrengthOptions } from './drawCard.constants'
import { clampDrawCount } from './drawCard.utils'

type DrawQueueState = {
  paused: boolean
  isGenerating: boolean
  tasks: GalleryImage[]
  stats: Partial<Record<DrawTaskStatus, number>>
}

type DrawQueueActions = {
  pause: () => void
  resume: () => void
  cancelTask: (taskId: string) => void
  retryTask: (taskId: string) => void
  cancelAll: () => void
}

type DrawCardPanelProps = {
  studioMode: 'create' | 'draw'
  drawStrategy: DrawStrategy
  effectiveDrawConcurrency: number
  drawStats: Partial<Record<DrawTaskStatus, number>>
  drawCount: number
  drawTimeoutSec: number
  drawDelayMs: number
  drawRetries: number
  variationStrength: VariationStrength
  enabledVariationDimensions: string[]
  drawSafeMode: boolean
  drawQueuePaused: boolean
  isGenerating: boolean
  taskSlots: GalleryImage[]
  drawQueueState?: DrawQueueState
  drawQueueActions?: DrawQueueActions
  onModeChange: (mode: 'create' | 'draw') => void
  onApplyStrategy: (value: DrawStrategy) => void
  onConcurrencyChange: (value: number) => void
  onDrawCountChange: (value: number) => void
  onTimeoutChange: (value: number) => void
  onDelayChange: (value: number) => void
  onRetriesChange: (value: number) => void
  onVariationStrengthChange: (value: VariationStrength) => void
  onToggleDimension: (id: string) => void
  onSafeModeChange: (checked: boolean) => void
  onShortcut: (preset: 'safe3' | 'balanced5' | 'fast8' | 'turbo10') => void
  onPauseQueue: () => void
  onResumeQueue: () => void
  onCancelTask: (taskId: string) => void
  onRetryTask: (taskId: string) => void
  onCancelAllQueue: () => void
}

export function DrawCardPanel(props: DrawCardPanelProps) {
  const drawQueueState = props.drawQueueState ?? {
    paused: props.drawQueuePaused,
    isGenerating: props.isGenerating,
    tasks: props.taskSlots,
    stats: props.drawStats,
  }
  const drawQueueActions = props.drawQueueActions ?? {
    pause: props.onPauseQueue,
    resume: props.onResumeQueue,
    cancelTask: props.onCancelTask,
    retryTask: props.onRetryTask,
    cancelAll: props.onCancelAllQueue,
  }
  const queueTasks = Array.isArray(drawQueueState.tasks) ? drawQueueState.tasks : []
  const actionableTasks = queueTasks.filter((task) => task.taskStatus && task.taskStatus !== 'success')
  const activeTaskCount = actionableTasks.filter((task) => task.taskStatus === 'pending' || task.taskStatus === 'running' || task.taskStatus === 'receiving' || task.taskStatus === 'retrying').length
  const failedTasks = actionableTasks.filter((task) => task.taskStatus === 'failed')

  return (
    <div className="mode-panel">
      <div className="mode-tabs" role="tablist" aria-label="生成模式">
        <button type="button" onClick={() => props.onModeChange('create')} className={`mode-tab ${props.studioMode === 'create' ? 'mode-tab-active' : ''}`}>创作模式</button>
        <button type="button" onClick={() => props.onModeChange('draw')} className={`mode-tab ${props.studioMode === 'draw' ? 'mode-tab-active' : ''}`}>图片抽卡</button>
      </div>
      {props.studioMode === 'draw' && (
        <div className="draw-panel">
          <div className="draw-summary-card">
            <strong>固定参数抽卡</strong>
            <span>基于当前 Prompt、负面提示词、画幅、质量和细节强度，批量生成相近但有轻微风格差异的图片。</span>
            <span>当前策略：{drawStrategyOptions.find((item) => item.value === props.drawStrategy)?.label} · 有效并发 {props.effectiveDrawConcurrency} · 完成 {drawQueueState.stats.success ?? 0} / 失败 {drawQueueState.stats.failed ?? 0}</span>
          </div>
          <div className="draw-strategy-section">
            <div className="flex items-center justify-between gap-3">
              <span className="field-label">队列控制</span>
              <span className="param-value">{drawQueueState.paused ? '已暂停' : drawQueueState.isGenerating ? '运行中' : '待命'} · 活跃 {activeTaskCount}</span>
            </div>
            <div className="draw-shortcuts">
              <button type="button" onClick={drawQueueActions.pause} disabled={!drawQueueState.isGenerating || drawQueueState.paused} className="shortcut-chip">暂停队列</button>
              <button type="button" onClick={drawQueueActions.resume} disabled={!drawQueueState.paused} className="shortcut-chip">继续队列</button>
              <button type="button" onClick={drawQueueActions.cancelAll} disabled={!drawQueueState.isGenerating && activeTaskCount === 0} className="shortcut-chip">取消全部</button>
            </div>
            {actionableTasks.length > 0 && (
              <div className="mt-3 space-y-2">
                {actionableTasks.slice(0, 8).map((task) => (
                  <div key={task.id} className="draw-summary-card">
                    <span className="flex items-center justify-between gap-3">
                      <strong>{task.title}</strong>
                      <small>{task.taskStatus}{task.retryCount ? ` · 重试 ${task.retryCount}` : ''}{task.taskStatus === 'failed' ? task.retryable === false ? ' · 不可重试' : ' · 可重试' : ''}</small>
                    </span>
                    <span>{task.meta}</span>
                    {task.error && <span>失败原因：{task.error}</span>}
                    <span className="draw-shortcuts">
                      {(task.taskStatus === 'pending' || task.taskStatus === 'running' || task.taskStatus === 'receiving' || task.taskStatus === 'retrying') && (
                        <button type="button" onClick={() => drawQueueActions.cancelTask(task.id)} className="shortcut-chip">取消该任务</button>
                      )}
                      {task.taskStatus === 'failed' && (
                        <button type="button" onClick={() => drawQueueActions.retryTask(task.id)} disabled={drawQueueState.isGenerating || task.retryable === false} className="shortcut-chip">{task.retryable === false ? '不可重试' : '重试失败项'}</button>
                      )}
                    </span>
                  </div>
                ))}
                {failedTasks.length > 8 && <small className="text-porcelain-100/[0.5]">还有 {failedTasks.length - 8} 个失败任务可在作品区筛选后查看。</small>}
              </div>
            )}
          </div>
          <div className="draw-strategy-section">
            <div className="flex items-center justify-between gap-3">
              <span className="field-label">抽卡策略</span>
              <span className="param-value">并发 {props.effectiveDrawConcurrency}</span>
            </div>
            <div className="draw-strategy-grid">
              {drawStrategyOptions.map((item) => (
                <button key={item.value} type="button" onClick={() => props.onApplyStrategy(item.value)} className={`draw-strategy-chip ${props.drawStrategy === item.value ? 'draw-strategy-chip-active' : ''}`}>
                  <span>{item.label}</span>
                  <small>{item.hint}</small>
                </button>
              ))}
            </div>
            <div className="concurrency-row">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((value) => (
                <button key={value} type="button" onClick={() => props.onConcurrencyChange(value)} className={`concurrency-chip ${props.effectiveDrawConcurrency === value ? 'concurrency-chip-active' : ''}`}>
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="draw-controls-grid">
            <label className="draw-input-card">
              <span className="field-label">抽卡数量</span>
              <input type="number" min="1" max="20" value={props.drawCount} onChange={(event) => props.onDrawCountChange(clampDrawCount(Number(event.target.value)))} />
              <small>最多 20 张，按任务队列生成</small>
            </label>
            <label className="draw-input-card">
              <span className="field-label">单张超时</span>
              <input type="number" min="20" max="300" value={props.drawTimeoutSec} onChange={(event) => props.onTimeoutChange(Math.min(300, Math.max(20, Number(event.target.value) || 90)))} />
              <small>超时会中断当前张</small>
            </label>
            <label className="draw-input-card">
              <span className="field-label">间隔毫秒</span>
              <input type="number" min="0" step="100" value={props.drawDelayMs} onChange={(event) => props.onDelayChange(Math.min(8000, Math.max(0, Number(event.target.value) || 0)))} />
              <small>降低网关压力</small>
            </label>
            <label className="draw-input-card">
              <span className="field-label">失败重试</span>
              <input type="number" min="0" max="3" value={props.drawRetries} onChange={(event) => props.onRetriesChange(Math.min(3, Math.max(0, Number(event.target.value) || 0)))} />
              <small>每张最多 3 次</small>
            </label>
          </div>
          <div className="variation-section">
            <div className="flex items-center justify-between gap-3">
              <span className="field-label">变化强度</span>
              <span className="param-value">{variationStrengthOptions.find((item) => item.value === props.variationStrength)?.label}</span>
            </div>
            <div className="variation-strength-grid">
              {variationStrengthOptions.map((item) => (
                <button key={item.value} type="button" onClick={() => props.onVariationStrengthChange(item.value)} className={`variation-chip ${props.variationStrength === item.value ? 'variation-chip-active' : ''}`}>
                  <span>{item.label}</span>
                  <small>{item.hint}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="variation-section">
            <span className="field-label">变化维度</span>
            <div className="variation-dimension-grid">
              {variationDimensions.map((item) => (
                <button key={item.id} type="button" onClick={() => props.onToggleDimension(item.id)} className={`dimension-chip ${props.enabledVariationDimensions.includes(item.id) ? 'dimension-chip-active' : ''}`}>
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          <div className="draw-shortcuts">
            <label className="stability-toggle">
              <input type="checkbox" checked={props.drawSafeMode} onChange={(event) => props.onSafeModeChange(event.target.checked)} />
              <span>稳定优先</span>
            </label>
            <button type="button" onClick={() => props.onShortcut('safe3')} className="shortcut-chip">稳妥三连</button>
            <button type="button" onClick={() => props.onShortcut('balanced5')} className="shortcut-chip">均衡五连</button>
            <button type="button" onClick={() => props.onShortcut('fast8')} className="shortcut-chip">高速八连</button>
            <button type="button" onClick={() => props.onShortcut('turbo10')} className="shortcut-chip">极速十连</button>
          </div>
        </div>
      )}
    </div>
  )
}
