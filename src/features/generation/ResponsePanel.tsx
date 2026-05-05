import { PanelRight, RefreshCcw } from 'lucide-react'

type ResponsePanelProps = {
  responseText: string
  collapsed: boolean
  summary: string
  onToggle: () => void
  onClear: () => void
}

export function ResponsePanel({ responseText, collapsed, summary, onToggle, onClear }: ResponsePanelProps) {
  const isFollowupGuide =
    responseText.includes('继续这一版') ||
    responseText.includes('当前结果：') ||
    responseText.includes('下一步：')
  const title = isFollowupGuide ? '继续改说明' : '生成说明'
  const emptyText = isFollowupGuide
    ? '这里会保留当前这一版的继续修改说明，方便你确认自己是基于哪张图继续往下改。'
    : '这里会保留一段简短说明。大多数时候你不需要看它，只有生成失败或想继续微调时再展开就够了。'

  return (
    <div className={`panel-strip response-panel ${collapsed ? 'response-panel-collapsed' : ''}`}>
      <div className="response-header">
        <button type="button" className="response-title-button" onClick={onToggle} aria-expanded={!collapsed}>
          <span className="eyebrow response-eyebrow">
            <PanelRight className="h-4 w-4" />
            {title}
          </span>
          <span className="response-summary">{summary}</span>
          <span className="response-toggle-text">{collapsed ? '展开' : '收起'}</span>
        </button>
        <button type="button" onClick={onClear} className="icon-button" aria-label="清空当前说明">
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>
      {!collapsed && <pre className="response-box">{responseText || emptyText}</pre>}
    </div>
  )
}
