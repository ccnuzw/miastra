import type { ReactNode } from 'react'

type StudioShellCalloutProps = {
  eyebrow: string
  title: string
  description: string
  tone?: 'default' | 'accent'
  children?: ReactNode
}

export function StudioShellCallout({
  eyebrow,
  title,
  description,
  tone = 'default',
  children,
}: StudioShellCalloutProps) {
  const accent = tone === 'accent'

  return (
    <article
      className={`rounded-[28px] border p-5 ${
        accent
          ? 'border-signal-cyan/20 bg-signal-cyan/[0.08]'
          : 'border-porcelain-50/10 bg-ink-950/[0.34]'
      }`}
    >
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-porcelain-50">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-porcelain-100/68">{description}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </article>
  )
}
