import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactNode,
} from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react'
import {
  createBeeShooterGameState,
  createBeeShooterSnapshot,
  stepBeeShooterGame,
  type BeeShooterBee,
  type BeeShooterBullet,
  type BeeShooterGameState,
  type BeeShooterInput,
} from './index'
import './bee-shooter.css'

const BOARD_WIDTH = 480
const BOARD_HEIGHT = 640
const STAR_FIELD = Array.from({ length: 28 }, (_, index) => {
  const seed = index + 1
  return {
    id: `star-${index}`,
    left: `${(seed * 17) % 100}%`,
    top: `${(seed * 29) % 100}%`,
    size: 1 + (seed % 3),
    duration: 8 + (seed % 7),
    delay: -(seed % 9),
    opacity: 0.2 + ((seed * 13) % 5) * 0.08,
  }
})

function toPercent(value: number, max: number) {
  return `${(value / max) * 100}%`
}

function BeeSprite({ bee }: { bee: BeeShooterBee }) {
  return (
    <div
      className={`bee-bee ${bee.health > 1 ? 'bee-bee-armored' : ''}`}
      style={{
        left: toPercent(bee.x, BOARD_WIDTH),
        top: toPercent(bee.y, BOARD_HEIGHT),
        width: toPercent(bee.width, BOARD_WIDTH),
        height: toPercent(bee.height, BOARD_HEIGHT),
      }}
    >
      <span className="bee-bee-wing bee-bee-wing-left" />
      <span className="bee-bee-wing bee-bee-wing-right" />
      <span className="bee-bee-shell">
        <span className="bee-bee-stripe" />
      </span>
      <span className="bee-bee-sting" />
    </div>
  )
}

function BulletSprite({ bullet, enemy = false }: { bullet: BeeShooterBullet; enemy?: boolean }) {
  return (
    <div
      className={`bee-bullet ${enemy ? 'bee-bullet-enemy' : ''}`}
      style={{
        left: toPercent(bullet.x, BOARD_WIDTH),
        top: toPercent(bullet.y, BOARD_HEIGHT),
        width: toPercent(bullet.radius * 2, BOARD_WIDTH),
        height: toPercent(bullet.radius * 2, BOARD_HEIGHT),
      }}
    />
  )
}

function PlaneSprite({ plane, invulnerable }: { plane: BeeShooterGameState['plane']; invulnerable: boolean }) {
  return (
    <div
      className={`bee-plane ${invulnerable ? 'bee-plane-flash' : ''}`}
      style={{
        left: toPercent(plane.x, BOARD_WIDTH),
        top: toPercent(plane.y, BOARD_HEIGHT),
        width: toPercent(plane.width, BOARD_WIDTH),
        height: toPercent(plane.height, BOARD_HEIGHT),
      }}
    >
      <span className="bee-plane-wing bee-plane-wing-left" />
      <span className="bee-plane-wing bee-plane-wing-right" />
      <span className="bee-plane-tail" />
      <span className="bee-plane-cockpit" />
      <span className="bee-plane-thruster" />
    </div>
  )
}

function StatChip({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-2xl border border-porcelain-50/10 bg-ink-950/50 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.28em] text-porcelain-100/45">{label}</div>
      <div className="mt-1 font-display text-2xl text-porcelain-50">{value}</div>
    </div>
  )
}

function ControlButton({
  children,
  onPointerDown,
  onPointerUp,
  onClick,
  active = false,
  className = '',
}: {
  children: ReactNode
  onPointerDown?: PointerEventHandler<HTMLButtonElement>
  onPointerUp?: PointerEventHandler<HTMLButtonElement>
  onClick?: MouseEventHandler<HTMLButtonElement>
  active?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      className={`bee-control ${active ? 'bee-control-active' : ''} ${className}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function BeeShooterGame() {
  const [gameState, setGameState] = useState<BeeShooterGameState>(() => createBeeShooterGameState())
  const gameStateRef = useRef(gameState)
  const fireQueuedRef = useRef(false)
  const lastFrameRef = useRef(0)
  const inputRef = useRef({ left: false, right: false })
  const controlsRef = useRef({
    startOrRestart: () => {},
    togglePause: () => {},
    queueFire: () => {},
    pressLeft: (_pressed: boolean) => {},
    pressRight: (_pressed: boolean) => {},
  })
  const summary = createBeeShooterSnapshot(gameState)

  const commitState = useCallback((next: BeeShooterGameState) => {
    gameStateRef.current = next
    setGameState(next)
  }, [])

  const startOrRestart = () => {
    fireQueuedRef.current = false
    inputRef.current.left = false
    inputRef.current.right = false
    lastFrameRef.current = performance.now()
    commitState(stepBeeShooterGame(gameStateRef.current, { restart: true }, 0).state)
  }

  const togglePause = () => {
    if (gameStateRef.current.status === 'ready') {
      return
    }

    fireQueuedRef.current = false
    lastFrameRef.current = performance.now()
    commitState(stepBeeShooterGame(gameStateRef.current, { pause: true }, 0).state)
  }

  const queueFire = () => {
    if (gameStateRef.current.status !== 'playing') {
      startOrRestart()
      return
    }

    fireQueuedRef.current = true
  }

  const pressLeft = (pressed: boolean) => {
    inputRef.current.left = pressed
  }

  const pressRight = (pressed: boolean) => {
    inputRef.current.right = pressed
  }

  controlsRef.current = {
    startOrRestart,
    togglePause,
    queueFire,
    pressLeft,
    pressRight,
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(event.key)) {
        event.preventDefault()
        controlsRef.current.pressLeft(true)
      }

      if (['ArrowRight', 'd', 'D'].includes(event.key)) {
        event.preventDefault()
        controlsRef.current.pressRight(true)
      }

      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        controlsRef.current.queueFire()
      }

      if (event.key === 'p' || event.key === 'P') {
        event.preventDefault()
        controlsRef.current.togglePause()
      }

      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        controlsRef.current.startOrRestart()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(event.key)) {
        event.preventDefault()
        controlsRef.current.pressLeft(false)
      }

      if (['ArrowRight', 'd', 'D'].includes(event.key)) {
        event.preventDefault()
        controlsRef.current.pressRight(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown, { passive: false })
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useEffect(() => {
    let rafId = 0

    const frame = (now: number) => {
      if (!lastFrameRef.current) {
        lastFrameRef.current = now
      }

      const deltaMs = Math.min(40, now - lastFrameRef.current)
      lastFrameRef.current = now

      if (gameStateRef.current.status === 'playing' || fireQueuedRef.current) {
        const input: BeeShooterInput = {
          direction: inputRef.current.left === inputRef.current.right ? 0 : inputRef.current.left ? -1 : 1,
          fire: fireQueuedRef.current,
        }

        fireQueuedRef.current = false
        commitState(stepBeeShooterGame(gameStateRef.current, input, deltaMs).state)
      }

      rafId = window.requestAnimationFrame(frame)
    }

    rafId = window.requestAnimationFrame(frame)

    return () => {
      window.cancelAnimationFrame(rafId)
    }
  }, [commitState])

  const overlayTitle =
    gameState.status === 'gameover'
      ? 'Hive Overrun'
      : gameState.status === 'paused'
        ? 'Paused'
        : gameState.status === 'ready'
          ? 'Press Start'
          : summary.message

  const overlayCopy =
    gameState.status === 'gameover'
      ? '蜜蜂突破了防线，按 R 重新开战。'
      : gameState.status === 'paused'
        ? '按 P 继续。'
        : gameState.status === 'ready'
          ? '按空格或点开始按钮，飞机就会出击。'
          : `当前第 ${gameState.level} 关，继续清空蜂群。`

  return (
    <main className="min-h-screen overflow-hidden bg-ink-950 text-porcelain-50">
      <div className="relative isolate min-h-screen bg-aurora-radial px-4 py-4">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-signal-cyan/10 to-transparent" />
        <div className="absolute left-10 top-16 h-40 w-40 rounded-full bg-signal-amber/10 blur-3xl" />
        <div className="absolute bottom-10 right-6 h-52 w-52 rounded-full bg-signal-coral/10 blur-3xl" />

        <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col justify-center gap-4 xl:flex-row xl:items-stretch">
          <section className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3 rounded-[2rem] border border-porcelain-50/10 bg-ink-900/60 px-5 py-4 shadow-card backdrop-blur-xl">
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.42em] text-signal-cyan">
                  <Sparkles className="h-3.5 w-3.5" />
                  Retro Mission
                </div>
                <h1 className="mt-2 font-display text-3xl text-porcelain-50 md:text-4xl">小蜜蜂出击</h1>
                <p className="mt-1 text-sm text-porcelain-100/55">A/D 或方向键移动，空格开火，P 暂停，R 重开。</p>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" className="bee-mini-button" onClick={controlsRef.current.togglePause}>
                  {gameState.status === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {gameState.status === 'paused' ? '继续' : '暂停'}
                </button>
                <button type="button" className="bee-mini-button" onClick={controlsRef.current.startOrRestart}>
                  <RotateCcw className="h-4 w-4" />
                  重开
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <StatChip label="Score" value={gameState.score} />
              <StatChip label="Lives" value={gameState.lives} />
              <StatChip label="Level" value={gameState.level} />
              <StatChip label="Swarm" value={summary.bees} />
            </div>

            <div className="relative mx-auto w-full max-w-[920px]">
              <div className="bee-stage aspect-[3/2] rounded-[2.25rem] border border-porcelain-50/10 shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
                {STAR_FIELD.map((star) => (
                  <span
                    key={star.id}
                    className="bee-star"
                    style={{
                      left: star.left,
                      top: star.top,
                      width: `${star.size}px`,
                      height: `${star.size}px`,
                      opacity: star.opacity,
                      animationDuration: `${star.duration}s`,
                      animationDelay: `${star.delay}s`,
                    }}
                  />
                ))}

                <div className="absolute inset-x-6 top-4 z-20 flex items-center justify-between text-xs uppercase tracking-[0.32em] text-porcelain-100/45">
                  <span>蜂巢巡航</span>
                  <span>{summary.message}</span>
                </div>

                {gameState.bees.map((bee) => (
                  <BeeSprite key={bee.id} bee={bee} />
                ))}

                {gameState.bullets.map((bullet) => (
                  <BulletSprite key={bullet.id} bullet={bullet} />
                ))}

                <PlaneSprite plane={gameState.plane} invulnerable={gameState.plane.invulnerableRemaining > 0} />

                <div className="absolute inset-x-0 bottom-0 z-20 h-20 bg-gradient-to-t from-ink-950/80 to-transparent" />

                <div
                  className={`bee-overlay ${gameState.status === 'playing' ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
                  aria-hidden={gameState.status === 'playing'}
                >
                  <div className="bee-overlay-card">
                    <div className="text-[10px] uppercase tracking-[0.42em] text-signal-cyan">{overlayTitle}</div>
                    <div className="mt-3 font-display text-3xl text-porcelain-50">{overlayTitle}</div>
                    <p className="mt-3 max-w-md text-sm leading-7 text-porcelain-100/65">{overlayCopy}</p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      <button type="button" className="bee-action-button" onClick={controlsRef.current.startOrRestart}>
                        <Zap className="h-4 w-4" />
                        {gameState.status === 'gameover' ? '再来一局' : '开始'}
                      </button>
                      <button type="button" className="bee-action-button bee-action-button-ghost" onClick={controlsRef.current.togglePause}>
                        <Pause className="h-4 w-4" />
                        P 暂停
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="flex w-full flex-col gap-4 xl:max-w-sm">
            <div className="rounded-[2rem] border border-porcelain-50/10 bg-ink-900/60 p-5 shadow-card backdrop-blur-xl">
              <div className="text-[10px] uppercase tracking-[0.42em] text-signal-cyan">Control Deck</div>
              <h2 className="mt-2 font-display text-2xl text-porcelain-50">指令舱</h2>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-porcelain-50/10 bg-ink-950/40 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-porcelain-50">
                    <ArrowLeft className="h-4 w-4 text-signal-cyan" />
                    <ArrowRight className="h-4 w-4 text-signal-cyan" />
                    横向机动
                  </div>
                  <p className="mt-2 text-sm leading-6 text-porcelain-100/55">按住左右键，飞机会沿底部滑行。</p>
                </div>

                <div className="rounded-2xl border border-porcelain-50/10 bg-ink-950/40 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-porcelain-50">
                    <Zap className="h-4 w-4 text-signal-amber" />
                    连续火力
                  </div>
                  <p className="mt-2 text-sm leading-6 text-porcelain-100/55">空格或火力按钮会自动补射，但要卡住节奏。</p>
                </div>

                <div className="rounded-2xl border border-porcelain-50/10 bg-ink-950/40 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-porcelain-50">
                    <Sparkles className="h-4 w-4 text-signal-coral" />
                    任务摘要
                  </div>
                  <p className="mt-2 text-sm leading-6 text-porcelain-100/55">
                    当前已击落 <span className="text-porcelain-50">{gameState.totalBeesDefeated}</span> 只蜜蜂，屏幕上还有{' '}
                    <span className="text-porcelain-50">{summary.bullets}</span> 发子弹在飞。
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-porcelain-50/10 bg-ink-900/60 p-5 shadow-card backdrop-blur-xl">
              <div className="text-[10px] uppercase tracking-[0.42em] text-signal-cyan">Touch Controls</div>
              <h2 className="mt-2 font-display text-2xl text-porcelain-50">移动端按钮</h2>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <ControlButton
                  active={inputRef.current.left}
                  onPointerDown={() => controlsRef.current.pressLeft(true)}
                  onPointerUp={() => controlsRef.current.pressLeft(false)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </ControlButton>
                <ControlButton
                  className="bee-control-fire"
                  onPointerDown={() => controlsRef.current.queueFire()}
                >
                  <Zap className="h-5 w-5" />
                </ControlButton>
                <ControlButton
                  active={inputRef.current.right}
                  onPointerDown={() => controlsRef.current.pressRight(true)}
                  onPointerUp={() => controlsRef.current.pressRight(false)}
                >
                  <ArrowRight className="h-5 w-5" />
                </ControlButton>
              </div>

              <div className="mt-4 flex gap-2">
                <button type="button" className="bee-mini-button flex-1" onClick={controlsRef.current.togglePause}>
                  {gameState.status === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {gameState.status === 'paused' ? '继续' : '暂停'}
                </button>
                <button type="button" className="bee-mini-button flex-1" onClick={controlsRef.current.startOrRestart}>
                  <RotateCcw className="h-4 w-4" />
                  重开
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
