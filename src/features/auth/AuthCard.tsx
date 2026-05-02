import type { ReactNode } from 'react'

export function AuthCard(props: { title: string; subtitle?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <div className="w-full max-w-xl rounded-[2rem] border border-porcelain-50/10 bg-ink-950/[0.7] p-8 shadow-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">{props.title}</h1>
      {props.subtitle ? <p className="mt-2 text-sm text-porcelain-100/60">{props.subtitle}</p> : null}
      <div className="mt-8">{props.children}</div>
      {props.footer ? <div className="mt-6 text-sm text-porcelain-100/60">{props.footer}</div> : null}
    </div>
  )
}
