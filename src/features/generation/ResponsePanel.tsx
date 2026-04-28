import { PanelRight, RefreshCcw } from 'lucide-react'

type ResponsePanelProps = {
  responseText: string
  collapsed: boolean
  summary: string
  onToggle: () => void
  onClear: () => void
}

export function ResponsePanel({ responseText, collapsed, summary, onToggle, onClear }: ResponsePanelProps) {
  return (
    <div className={`panel-strip response-panel ${collapsed ? 'response-panel-collapsed' : ''}`}>
      <div className="response-header">
        <button type="button" className="response-title-button" onClick={onToggle} aria-expanded={!collapsed}>
          <span className="eyebrow response-eyebrow">
            <PanelRight className="h-4 w-4" />
            接口响应
          </span>
          <span className="response-summary">{summary}</span>
          <span className="response-toggle-text">{collapsed ? '展开' : '收起'}</span>
        </button>
        <button type="button" onClick={onClear} className="icon-button" aria-label="清空响应">
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>
      {!collapsed && (
        <pre className="response-box">{responseText || '等待接口返回。这里会显示前 1800 个字符，便于排查 504、401 或模型参数错误。'}</pre>
      )}
    </div>
  )
}
