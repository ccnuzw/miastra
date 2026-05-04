import type { ReactNode } from 'react'

type AdminPageHeaderProps = {
  eyebrow?: string
  title: string
  description: string
  meta?: ReactNode
  actions?: ReactNode
}

export function AdminPageHeader({
  eyebrow = 'Admin',
  title,
  description,
  meta,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-porcelain-50">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-porcelain-100/60">{description}</p>
        {meta ? <div className="mt-3">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  )
}
