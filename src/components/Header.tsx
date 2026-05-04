import { Wand2 } from 'lucide-react'

export function Header() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-porcelain-50/10 bg-ink-950/[0.70] backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-screen-xl items-center px-4 py-4 md:px-8">
        <a href="#top" className="group flex items-center gap-3" aria-label="Image Atelier 首页">
          <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-signal-cyan/30 bg-signal-cyan/10 shadow-glow">
            <Wand2 className="h-5 w-5 text-signal-cyan transition-transform duration-500 group-hover:rotate-12" />
            <span className="absolute inset-x-2 bottom-1 h-px bg-signal-cyan/50" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl tracking-tight text-porcelain-50">Miastra Studio</span>
            <span className="mt-1 text-[0.62rem] uppercase tracking-[0.34em] text-porcelain-100/50">Cloud Image Studio</span>
          </span>
        </a>
      </div>
    </header>
  )
}
