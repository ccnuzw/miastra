export type BeeShooterStatus = 'ready' | 'playing' | 'paused' | 'gameover'

export type BeeShooterDirection = -1 | 0 | 1

export type BeeShooterSettings = {
  stageWidth: number
  stageHeight: number
  planeSpeed: number
  bulletSpeed: number
  beeSpeed: number
  beeSpawnInterval: number
  fireCooldown: number
  invulnerableMs: number
  startingLives: number
  startingLevel: number
  beesPerLevel: number
  maxActiveBees: number
  maxBullets: number
  seed: number
}

export type BeeShooterPlane = {
  x: number
  y: number
  width: number
  height: number
  fireCooldownRemaining: number
  invulnerableRemaining: number
}

export type BeeShooterBullet = {
  id: string
  x: number
  y: number
  radius: number
  speed: number
}

export type BeeShooterBee = {
  id: string
  x: number
  y: number
  width: number
  height: number
  vx: number
  vy: number
  health: number
  points: number
}

export type BeeShooterWave = {
  spawnedInLevel: number
  cleared: boolean
}

export type BeeShooterGameState = {
  status: BeeShooterStatus
  settings: BeeShooterSettings
  plane: BeeShooterPlane
  bullets: BeeShooterBullet[]
  bees: BeeShooterBee[]
  score: number
  lives: number
  level: number
  totalBeesDefeated: number
  spawnTimer: number
  elapsedMs: number
  wave: BeeShooterWave
  nextEntityId: number
  rngState: number
  message: string
}

export type BeeShooterInput = {
  direction?: BeeShooterDirection
  fire?: boolean
  pause?: boolean
  restart?: boolean
}

export type BeeShooterStepResult = {
  state: BeeShooterGameState
  events: string[]
}
