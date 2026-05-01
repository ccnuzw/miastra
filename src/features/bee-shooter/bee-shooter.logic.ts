import { beeShooterBeeSize, beeShooterBulletRadius, beeShooterDefaults, beeShooterPlaneSize } from './bee-shooter.constants'
import type {
  BeeShooterBee,
  BeeShooterBullet,
  BeeShooterDirection,
  BeeShooterGameState,
  BeeShooterInput,
  BeeShooterSettings,
  BeeShooterStepResult,
  BeeShooterStatus,
} from './bee-shooter.types'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function nextId(state: BeeShooterGameState) {
  return `bee-${state.nextEntityId}`
}

function advanceSeed(seed: number) {
  const next = (seed * 1664525 + 1013904223) >>> 0
  return next === 0 ? 1 : next
}

function random01(state: BeeShooterGameState) {
  const rngState = advanceSeed(state.rngState)
  return {
    rngState,
    value: rngState / 0x100000000,
  }
}

function centerX(settings: BeeShooterSettings) {
  return settings.stageWidth / 2 - beeShooterPlaneSize.width / 2
}

function createPlane(settings: BeeShooterSettings) {
  return {
    x: centerX(settings),
    y: settings.stageHeight - beeShooterPlaneSize.height - 20,
    width: beeShooterPlaneSize.width,
    height: beeShooterPlaneSize.height,
    fireCooldownRemaining: 0,
    invulnerableRemaining: 0,
  }
}

function createBee(state: BeeShooterGameState, laneOffset = 0): BeeShooterBee {
  const { value, rngState } = random01(state)
  state.rngState = rngState
  const width = beeShooterBeeSize.width
  const maxX = Math.max(0, state.settings.stageWidth - width)
  const x = clamp(value * maxX + laneOffset, 0, maxX)
  const levelBoost = 1 + (state.level - 1) * 0.08
  const sway = (laneOffset % 2 === 0 ? -1 : 1) * (18 + state.level * 1.5)

  const bee: BeeShooterBee = {
    id: nextId(state),
    x,
    y: -beeShooterBeeSize.height - 4,
    width,
    height: beeShooterBeeSize.height,
    vx: sway * levelBoost,
    vy: state.settings.beeSpeed * levelBoost,
    health: state.level >= 4 ? 2 : 1,
    points: 100 + (state.level - 1) * 25,
  }

  state.nextEntityId += 1
  return bee
}

function createBullet(state: BeeShooterGameState): BeeShooterBullet {
  const plane = state.plane
  const bullet: BeeShooterBullet = {
    id: nextId(state),
    x: plane.x + plane.width / 2,
    y: plane.y - 4,
    radius: beeShooterBulletRadius,
    speed: state.settings.bulletSpeed,
  }
  state.nextEntityId += 1
  return bullet
}

function rectsOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function bulletBeeHit(bullet: BeeShooterBullet, bee: BeeShooterBee) {
  const left = bee.x
  const right = bee.x + bee.width
  const top = bee.y
  const bottom = bee.y + bee.height
  const nearestX = clamp(bullet.x, left, right)
  const nearestY = clamp(bullet.y, top, bottom)
  const dx = bullet.x - nearestX
  const dy = bullet.y - nearestY
  return dx * dx + dy * dy <= bullet.radius * bullet.radius
}

function planeBeeHit(state: BeeShooterGameState, bee: BeeShooterBee) {
  return rectsOverlap(state.plane, bee)
}

function stageBottomHit(state: BeeShooterGameState, bee: BeeShooterBee) {
  return bee.y + bee.height >= state.settings.stageHeight + 8
}

function computeSpawnBudget(state: BeeShooterGameState) {
  return Math.min(
    state.settings.maxActiveBees,
    Math.max(1, Math.floor(state.settings.beesPerLevel * (1 + (state.level - 1) * 0.35))),
  )
}

function cloneState(state: BeeShooterGameState): BeeShooterGameState {
  return {
    ...state,
    settings: { ...state.settings },
    plane: { ...state.plane },
    bullets: state.bullets.map((item) => ({ ...item })),
    bees: state.bees.map((item) => ({ ...item })),
    wave: { ...state.wave },
  }
}

export function createBeeShooterGameState(overrides: Partial<BeeShooterSettings> = {}): BeeShooterGameState {
  const settings = { ...beeShooterDefaults, ...overrides }
  const plane = createPlane(settings)

  return {
    status: 'ready',
    settings,
    plane,
    bullets: [],
    bees: [],
    score: 0,
    lives: settings.startingLives,
    level: settings.startingLevel,
    totalBeesDefeated: 0,
    spawnTimer: 0,
    elapsedMs: 0,
    wave: {
      spawnedInLevel: 0,
      cleared: false,
    },
    nextEntityId: 1,
    rngState: settings.seed >>> 0 || 1,
    message: '准备开始',
  }
}

export function restartBeeShooterGameState(state: BeeShooterGameState) {
  const next = createBeeShooterGameState(state.settings)
  next.status = 'playing'
  next.message = '新一局开始'
  return next
}

export function setBeeShooterStatus(state: BeeShooterGameState, status: BeeShooterStatus) {
  const next = cloneState(state)
  next.status = status
  next.message = status === 'paused' ? '已暂停' : status === 'gameover' ? '游戏结束' : status === 'playing' ? '战斗中' : '准备开始'
  return next
}

export function moveBeeShooterPlane(state: BeeShooterGameState, direction: BeeShooterDirection, deltaMs: number) {
  if (state.status !== 'playing') return cloneState(state)
  const next = cloneState(state)
  const distance = (next.settings.planeSpeed * Math.max(0, deltaMs)) / 1000
  next.plane.x = clamp(next.plane.x + direction * distance, 0, next.settings.stageWidth - next.plane.width)
  return next
}

export function fireBeeShooterBullet(state: BeeShooterGameState) {
  if (state.status !== 'playing') return cloneState(state)
  if (state.plane.fireCooldownRemaining > 0) return cloneState(state)
  if (state.bullets.length >= state.settings.maxBullets) return cloneState(state)

  const next = cloneState(state)
  next.bullets.push(createBullet(next))
  next.plane.fireCooldownRemaining = next.settings.fireCooldown
  next.message = '发射'
  return next
}

export function toggleBeeShooterPause(state: BeeShooterGameState) {
  const next = cloneState(state)
  if (next.status === 'gameover') return next
  next.status = next.status === 'paused' ? 'playing' : 'paused'
  next.message = next.status === 'paused' ? '已暂停' : '继续作战'
  return next
}

function maybeLevelUp(state: BeeShooterGameState) {
  if (state.totalBeesDefeated < state.level * state.settings.beesPerLevel) return
  state.level += 1
  state.wave = { spawnedInLevel: 0, cleared: false }
  state.message = `进入第 ${state.level} 关`
}

function spawnBees(state: BeeShooterGameState, elapsedMs: number) {
  state.spawnTimer += elapsedMs
  const interval = Math.max(250, state.settings.beeSpawnInterval - (state.level - 1) * 60)
  const budget = computeSpawnBudget(state)

  while (state.spawnTimer >= interval && state.bees.length < budget) {
    state.spawnTimer -= interval
    const bee = createBee(state, state.bees.length * 19)
    state.bees.push(bee)
    state.wave.spawnedInLevel += 1
  }
}

function updateBullets(state: BeeShooterGameState, deltaMs: number) {
  const travel = (state.settings.bulletSpeed * deltaMs) / 1000
  state.bullets = state.bullets
    .map((bullet) => ({ ...bullet, y: bullet.y - travel }))
    .filter((bullet) => bullet.y + bullet.radius > -8)
}

function updateBees(state: BeeShooterGameState, deltaMs: number) {
  const travel = deltaMs / 1000
  state.bees = state.bees.map((bee, index) => {
    const wobble = Math.sin((state.elapsedMs / 140) + index) * (state.level * 0.35)
    return {
      ...bee,
      x: clamp(bee.x + (bee.vx + wobble) * travel, 0, state.settings.stageWidth - bee.width),
      y: bee.y + bee.vy * travel,
    }
  })
}

function resolveCollisions(state: BeeShooterGameState) {
  const removedBullets = new Set<string>()
  const removedBees = new Set<string>()

  for (const bullet of state.bullets) {
    for (const bee of state.bees) {
      if (removedBullets.has(bullet.id) || removedBees.has(bee.id)) continue
      if (!bulletBeeHit(bullet, bee)) continue
      removedBullets.add(bullet.id)
      bee.health -= 1
      if (bee.health <= 0) {
        state.score += bee.points
        state.totalBeesDefeated += 1
        removedBees.add(bee.id)
      }
      break
    }
  }

  state.bullets = state.bullets.filter((bullet) => !removedBullets.has(bullet.id))
  state.bees = state.bees.filter((bee) => !removedBees.has(bee.id))

  if (state.plane.invulnerableRemaining <= 0) {
    for (const bee of state.bees) {
      if (!planeBeeHit(state, bee)) continue
      removedBees.add(bee.id)
      state.bees = state.bees.filter((item) => item.id !== bee.id)
      state.lives -= 1
      state.plane.invulnerableRemaining = state.settings.invulnerableMs
      state.message = '被撞击'
      break
    }
  }

  for (const bee of state.bees) {
    if (!stageBottomHit(state, bee)) continue
    removedBees.add(bee.id)
    state.lives -= 1
    state.message = '漏网蜜蜂突破防线'
  }

  state.bees = state.bees.filter((bee) => !removedBees.has(bee.id))
}

function refreshWaveState(state: BeeShooterGameState) {
  if (state.bees.length > 0 || state.status === 'gameover') return
  if (state.wave.spawnedInLevel === 0) return
  state.wave.cleared = true
  maybeLevelUp(state)
}

function tickCooldowns(state: BeeShooterGameState, deltaMs: number) {
  state.plane.fireCooldownRemaining = Math.max(0, state.plane.fireCooldownRemaining - deltaMs)
  state.plane.invulnerableRemaining = Math.max(0, state.plane.invulnerableRemaining - deltaMs)
}

export function stepBeeShooterGame(
  state: BeeShooterGameState,
  input: BeeShooterInput = {},
  deltaMs = 16,
): BeeShooterStepResult {
  const events: string[] = []

  if (input.restart) {
    return {
      state: restartBeeShooterGameState(state),
      events: ['restart'],
    }
  }

  if (input.pause) {
    const toggled = toggleBeeShooterPause(state)
    return {
      state: toggled,
      events: [toggled.status === 'paused' ? 'pause' : 'resume'],
    }
  }

  if (state.status !== 'playing') {
    return { state: cloneState(state), events }
  }

  let next = cloneState(state)
  next.elapsedMs += Math.max(0, deltaMs)

  if (typeof input.direction === 'number') {
    next = moveBeeShooterPlane(next, input.direction, deltaMs)
  }

  if (input.fire) {
    const bulletCountBefore = next.bullets.length
    const fired = fireBeeShooterBullet(next)
    if (fired.bullets.length > bulletCountBefore) {
      next = fired
      events.push('fire')
    } else {
      next = fired
    }
  }

  tickCooldowns(next, deltaMs)
  spawnBees(next, deltaMs)
  updateBullets(next, deltaMs)
  updateBees(next, deltaMs)
  resolveCollisions(next)
  refreshWaveState(next)

  if (next.lives <= 0) {
    next.status = 'gameover'
    next.message = '游戏结束'
    next.lives = 0
  } else if (next.status === 'playing' && next.wave.cleared) {
    next.message = `第 ${next.level} 关已清空`
  }

  return { state: next, events }
}

export function createBeeShooterSnapshot(state: BeeShooterGameState) {
  return {
    status: state.status,
    score: state.score,
    lives: state.lives,
    level: state.level,
    bees: state.bees.length,
    bullets: state.bullets.length,
    message: state.message,
  }
}
