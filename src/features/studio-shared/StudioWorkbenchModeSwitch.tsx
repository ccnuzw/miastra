import { type StudioWorkbenchMode, studioWorkbenchModeOptions } from './studioShell.adapters'

type StudioWorkbenchModeSwitchProps = {
  mode: StudioWorkbenchMode
  hint: string
  onChange: (mode: StudioWorkbenchMode) => void
}

export function StudioWorkbenchModeSwitch({
  mode,
  hint,
  onChange,
}: StudioWorkbenchModeSwitchProps) {
  return (
    <section className="rounded-[28px] border border-porcelain-50/10 bg-ink-950/[0.42] p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div>
          <p className="eyebrow">模式切换</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-porcelain-50">
            同一路由下切换简洁模式和进阶模式
          </h2>
          <p className="mt-2 text-sm text-porcelain-100/65">{hint}</p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {studioWorkbenchModeOptions.map((option) => {
            const active = option.value === mode
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`rounded-[24px] border px-4 py-4 text-left transition ${
                  active
                    ? 'border-signal-cyan/50 bg-signal-cyan/[0.12] text-porcelain-50 shadow-[0_0_0_1px_rgba(70,229,255,0.12)]'
                    : 'border-porcelain-50/10 bg-ink-950/[0.38] text-porcelain-100/72 hover:border-porcelain-50/20 hover:bg-ink-950/[0.55]'
                }`}
                aria-pressed={active}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-semibold">{option.label}</span>
                  <span className="status-pill">{active ? '当前模式' : '切换到此模式'}</span>
                </div>
                <p
                  className={`mt-2 text-sm leading-6 ${active ? 'text-porcelain-50/85' : 'text-porcelain-100/72'}`}
                >
                  {option.description}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
