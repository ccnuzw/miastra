import { Palette } from 'lucide-react'
import { styleTokens } from './studio.constants'

type StyleTokensPanelProps = {
  selectedIds: string[]
  onToggle: (id: string) => void
}

export function StyleTokensPanel({ selectedIds, onToggle }: StyleTokensPanelProps) {
  return (
    <div className="style-inline-panel studio-balanced-card">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-signal-amber/15 text-signal-amber">
          <Palette className="h-5 w-5" />
        </span>
        <div>
          <p className="eyebrow">Style Tokens</p>
          <h3 className="font-display text-xl">常用风格参数</h3>
          <p className="mt-1 text-xs text-porcelain-100/42">点击启用/停用，会写入本次生成请求。</p>
        </div>
      </div>
      <div className="style-token-grid">
        {styleTokens.map((token) => {
          const isSelected = selectedIds.includes(token.id)
          return (
            <button key={token.id} type="button" aria-pressed={isSelected} title={token.prompt} onClick={() => onToggle(token.id)} className={`style-token ${isSelected ? 'style-token-active' : ''}`}>
              {token.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
