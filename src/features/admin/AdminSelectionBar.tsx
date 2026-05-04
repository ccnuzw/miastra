import type { ReactNode } from 'react'

type AdminSelectionBarProps = {
  count: number
  label: string
  actions: ReactNode
}

export function AdminSelectionBar({ count, label, actions }: AdminSelectionBarProps) {
  if (!count) return null

  return (
    <div className="sticky top-[5.75rem] z-30 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-signal-cyan/20 bg-ink-950/95 px-4 py-3 shadow-card backdrop-blur-xl">
      <p className="text-sm font-semibold text-porcelain-50">
        已选 {count} 项<span className="ml-2 text-porcelain-100/55">{label}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  )
}
