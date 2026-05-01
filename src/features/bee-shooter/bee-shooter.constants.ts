import type { BeeShooterSettings } from './bee-shooter.types'

export const beeShooterDefaults: BeeShooterSettings = {
  stageWidth: 480,
  stageHeight: 640,
  planeSpeed: 320,
  bulletSpeed: 560,
  beeSpeed: 120,
  beeSpawnInterval: 850,
  fireCooldown: 170,
  invulnerableMs: 1000,
  startingLives: 3,
  startingLevel: 1,
  beesPerLevel: 10,
  maxActiveBees: 10,
  maxBullets: 4,
  seed: 20260501,
}

export const beeShooterPlaneSize = {
  width: 42,
  height: 42,
}

export const beeShooterBulletRadius = 4

export const beeShooterBeeSize = {
  width: 34,
  height: 28,
}
