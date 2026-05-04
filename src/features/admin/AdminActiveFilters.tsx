import { X } from 'lucide-react'

export type AdminActiveFilterItem = {
  key: string
  label: string
  onRemove?: () => void
}

type AdminActiveFiltersProps = {
  items: AdminActiveFilterItem[]
  onClearAll?: () => void
}

export function AdminActiveFilters({ items, onClearAll }: AdminActiveFiltersProps) {
  if (!items.length) return null

  return (
    <div className="admin-summary-strip">
      <span className="admin-summary-strong">当前条件</span>
      {items.map((item) => (
        <span key={item.key} className="admin-active-filter">
          <span>{item.label}</span>
          {item.onRemove ? (
            <button type="button" className="text-porcelain-100/45 transition hover:text-signal-coral" onClick={item.onRemove} aria-label={`移除${item.label}`}>
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </span>
      ))}
      {onClearAll ? (
        <button
          type="button"
          className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.72] px-3 py-2 text-xs font-semibold text-porcelain-50 transition hover:border-signal-coral/35 hover:text-signal-coral"
          onClick={onClearAll}
        >
          清空全部
        </button>
      ) : null}
    </div>
  )
}
