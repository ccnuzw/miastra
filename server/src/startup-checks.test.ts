// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { assertRuntimeReady } from './runtime-checks'

const originalBackend = process.env.SERVER_STORE_BACKEND
const originalAuthSecret = process.env.AUTH_JWT_SECRET
const originalResetSecret = process.env.RESET_JWT_SECRET

beforeEach(() => {
  process.env.NODE_ENV = 'production'
  process.env.SERVER_STORE_BACKEND = 'invalid-backend'
  process.env.AUTH_JWT_SECRET = 'startup-auth-secret'
  process.env.RESET_JWT_SECRET = 'startup-reset-secret'
})

afterEach(() => {
  if (originalBackend === undefined) delete process.env.SERVER_STORE_BACKEND
  else process.env.SERVER_STORE_BACKEND = originalBackend

  if (originalAuthSecret === undefined) delete process.env.AUTH_JWT_SECRET
  else process.env.AUTH_JWT_SECRET = originalAuthSecret

  if (originalResetSecret === undefined) delete process.env.RESET_JWT_SECRET
  else process.env.RESET_JWT_SECRET = originalResetSecret
})

describe('startup checks', () => {
  it('rejects invalid runtime configuration before server start', async () => {
    await expect(assertRuntimeReady()).rejects.toThrow('SERVER_STORE_BACKEND')
  })
})
