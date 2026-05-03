import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { registerAdminRoutes } from './admin/routes'
import { registerAuthRoutes } from './auth/routes'
import { storeRepository } from './lib/store'

const emptyStore = {
  users: [],
  sessions: [],
  promptTemplates: [],
  works: [],
  providerConfigs: [],
  drawBatches: [],
  generationTasks: [],
  auditLogs: [],
  quotaProfiles: [],
  billingInvoices: [],
}

const originalNodeEnv = process.env.NODE_ENV
const originalPasswordResetMode = process.env.AUTH_PASSWORD_RESET_MODE

beforeEach(async () => {
  await storeRepository.write(structuredClone(emptyStore))
  delete process.env.AUTH_PASSWORD_RESET_MODE
  process.env.NODE_ENV = 'test'
})

afterEach(async () => {
  await storeRepository.write(structuredClone(emptyStore))

  if (originalNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = originalNodeEnv

  if (originalPasswordResetMode === undefined) delete process.env.AUTH_PASSWORD_RESET_MODE
  else process.env.AUTH_PASSWORD_RESET_MODE = originalPasswordResetMode
})

describe('admin permissions and audit logs', () => {
  it('limits operator role management to regular users', async () => {
    const app = await createAdminAuditTestServer()

    const operator = await registerUser(app, 'operator@example.com', 'operator-user')
    const peerOperator = await registerUser(app, 'peer-operator@example.com', 'peer-operator')
    const regularUser = await registerUser(app, 'user@example.com', 'regular-user')

    await setUserRole(operator.user.id, 'operator')
    await setUserRole(peerOperator.user.id, 'operator')

    const usersResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      cookies: { miastra_auth: operator.cookie },
    })

    expect(usersResponse.statusCode).toBe(200)
    const users = usersResponse.json().data.items as Array<{
      id: string
      management: {
        canChangeRole: boolean
        canRevokeSessions: boolean
        assignableRoles: string[]
        reason?: string
      }
    }>
    const peerRecord = users.find((item) => item.id === peerOperator.user.id)
    const regularRecord = users.find((item) => item.id === regularUser.user.id)

    expect(peerRecord).toMatchObject({
      management: {
        canChangeRole: false,
        canRevokeSessions: false,
        assignableRoles: [],
      },
    })
    expect(peerRecord?.management.reason).toContain('普通用户')
    expect(regularRecord).toMatchObject({
      management: {
        canChangeRole: true,
        canRevokeSessions: true,
        assignableRoles: ['user', 'operator'],
      },
    })

    const forbiddenResponse = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${peerOperator.user.id}/role`,
      cookies: { miastra_auth: operator.cookie },
      payload: { role: 'user' },
    })
    expect(forbiddenResponse.statusCode).toBe(403)

    const allowedResponse = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${regularUser.user.id}/role`,
      cookies: { miastra_auth: operator.cookie },
      payload: { role: 'operator' },
    })
    expect(allowedResponse.statusCode).toBe(200)

    const store = await storeRepository.read()
    expect(store.users.find((item) => item.id === regularUser.user.id)?.role).toBe('operator')
    expect(store.auditLogs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: 'user.role.updated',
        actorUserId: operator.user.id,
        targetId: regularUser.user.id,
        payload: {
          fromRole: 'user',
          toRole: 'operator',
        },
      }),
    ]))

    await app.close()
  })

  it('prevents removing current admin access and preserves the current session on self revoke', async () => {
    const app = await createAdminAuditTestServer()

    const admin = await registerUser(app, 'admin@example.com', 'admin-user')
    await setUserRole(admin.user.id, 'admin')
    await loginUser(app, 'admin@example.com')

    const demoteResponse = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${admin.user.id}/role`,
      cookies: { miastra_auth: admin.cookie },
      payload: { role: 'operator' },
    })

    expect(demoteResponse.statusCode).toBe(409)
    expect(demoteResponse.json()).toMatchObject({
      error: {
        code: 'INVALID_OPERATION',
      },
    })

    const revokeResponse = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${admin.user.id}/revoke-sessions`,
      cookies: { miastra_auth: admin.cookie },
    })

    expect(revokeResponse.statusCode).toBe(200)
    expect(revokeResponse.json()).toMatchObject({
      data: {
        success: true,
        revoked: 1,
      },
    })

    const sessionsResponse = await app.inject({
      method: 'GET',
      url: '/api/auth/sessions',
      cookies: { miastra_auth: admin.cookie },
    })

    expect(sessionsResponse.statusCode).toBe(200)
    const sessions = sessionsResponse.json().data as Array<{ current: boolean; revokedAt: string | null }>
    expect(sessions.filter((item) => item.current && !item.revokedAt)).toHaveLength(1)
    expect(sessions.filter((item) => !item.current && item.revokedAt)).toHaveLength(1)

    const store = await storeRepository.read()
    expect(store.auditLogs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: 'session.revoked.bulk',
        actorUserId: admin.user.id,
        targetId: admin.user.id,
        payload: expect.objectContaining({
          revoked: 1,
          scope: 'other-sessions',
        }),
      }),
    ]))

    await app.close()
  })

  it('writes audit logs for session revocation and password reset flow', async () => {
    process.env.AUTH_PASSWORD_RESET_MODE = 'debug'
    const app = await createAdminAuditTestServer()

    const user = await registerUser(app, 'audit@example.com', 'audit-user')
    await loginUser(app, 'audit@example.com')

    const revokeOthersResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/sessions/revoke-others',
      cookies: { miastra_auth: user.cookie },
    })

    expect(revokeOthersResponse.statusCode).toBe(200)
    expect(revokeOthersResponse.json()).toMatchObject({
      data: {
        success: true,
        revoked: 1,
      },
    })

    const forgotResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'audit@example.com' },
    })

    expect(forgotResponse.statusCode).toBe(200)
    const resetToken = forgotResponse.json().data.debugResetToken as string

    const resetResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: {
        email: 'audit@example.com',
        token: resetToken,
        nextPassword: 'secret456',
      },
    })

    expect(resetResponse.statusCode).toBe(200)

    const store = await storeRepository.read()
    expect(store.auditLogs.map((item) => item.action)).toEqual(expect.arrayContaining([
      'session.revoked.others',
      'auth.password-reset.requested',
      'auth.password-reset.completed',
    ]))
    expect(store.sessions.filter((item) => item.userId === user.user.id && !item.revokedAt)).toHaveLength(0)

    await app.close()
  })
})

async function createAdminAuditTestServer() {
  const app = Fastify()
  await app.register(cookie)
  await registerAuthRoutes(app)
  await registerAdminRoutes(app)
  return app
}

async function registerUser(app: Awaited<ReturnType<typeof createAdminAuditTestServer>>, email: string, nickname: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email,
      password: 'secret123',
      nickname,
    },
  })

  expect(response.statusCode).toBe(200)
  const cookie = response.cookies.find((item) => item.name === 'miastra_auth')?.value
  expect(cookie).toBeTruthy()

  return {
    cookie: cookie ?? '',
    user: response.json().data as {
      id: string
      email: string
      nickname: string
      role: 'user' | 'operator' | 'admin'
    },
  }
}

async function loginUser(app: Awaited<ReturnType<typeof createAdminAuditTestServer>>, email: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      email,
      password: 'secret123',
    },
  })

  expect(response.statusCode).toBe(200)
  return response.cookies.find((item) => item.name === 'miastra_auth')?.value ?? ''
}

async function setUserRole(userId: string, role: 'user' | 'operator' | 'admin') {
  const store = await storeRepository.read()
  const user = store.users.find((item) => item.id === userId)
  if (!user) {
    throw new Error('user not found')
  }

  user.role = role
  user.updatedAt = new Date().toISOString()
  await storeRepository.write(store)
}
