import cookie from '@fastify/cookie'
import Fastify from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { registerAdminRoutes } from './admin/routes'
import { registerAuthRoutes } from './auth/routes'
import { storeRepository } from './lib/store'

const emptyStore = {
  users: [],
  sessions: [],
  promptTemplates: [],
  works: [],
  providerConfigs: [],
  managedProviders: [],
  drawBatches: [],
  generationTasks: [],
  auditLogs: [],
  quotaProfiles: [],
  billingInvoices: [],
}

const originalNodeEnv = process.env.NODE_ENV

beforeEach(async () => {
  await storeRepository.write(structuredClone(emptyStore))
  process.env.NODE_ENV = 'test'
})

afterEach(async () => {
  await storeRepository.write(structuredClone(emptyStore))

  if (originalNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = originalNodeEnv
})

describe('admin permissions and audit logs', () => {
  it('limits operator role management to regular users', async () => {
    const app = await createAdminAuditTestServer()

    const operator = await registerUser(app, 'operator@example.com', 'operator-user')
    const peerOperator = await registerUser(app, 'peer-operator@example.com', 'peer-operator')
    const regularUser = await registerUser(app, 'user@example.com', 'regular-user')

    await setUserRole(operator.user.email, 'operator')
    await setUserRole(peerOperator.user.email, 'operator')

    const usersResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: { cookie: operator.cookie },
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
      headers: { cookie: operator.cookie },
      payload: { role: 'user' },
    })
    expect(forbiddenResponse.statusCode).toBe(403)

    const allowedResponse = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${regularUser.user.id}/role`,
      headers: { cookie: operator.cookie },
      payload: { role: 'operator' },
    })
    expect(allowedResponse.statusCode).toBe(200)

    const store = await storeRepository.read()
    expect(store.users.find((item) => item.id === regularUser.user.id)?.role).toBe('operator')
    expect(store.auditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'user.role.updated',
          actorUserId: operator.user.id,
          targetId: regularUser.user.id,
          payload: {
            fromRole: 'user',
            toRole: 'operator',
          },
        }),
      ]),
    )

    await app.close()
  })

  it('prevents removing current admin access and preserves the current session on self revoke', async () => {
    const app = await createAdminAuditTestServer()

    const admin = await registerUser(app, 'admin@example.com', 'admin-user')
    await setUserRole(admin.user.email, 'admin')
    await loginUser(app, 'admin@example.com')

    const demoteResponse = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${admin.user.id}/role`,
      headers: { cookie: admin.cookie },
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
      headers: { cookie: admin.cookie },
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
      headers: { cookie: admin.cookie },
    })

    expect(sessionsResponse.statusCode).toBe(200)
    const sessions = sessionsResponse.json().data as Array<{
      current: boolean
      revokedAt: string | null
    }>
    expect(sessions.filter((item) => item.current && !item.revokedAt)).toHaveLength(1)
    expect(sessions.filter((item) => !item.current && item.revokedAt)).toHaveLength(1)

    const store = await storeRepository.read()
    expect(store.auditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'admin.user.role.update_denied',
          actorUserId: admin.user.id,
          targetId: admin.user.id,
          payload: expect.objectContaining({
            currentRole: 'admin',
            requestedRole: 'operator',
            isSelf: true,
          }),
        }),
        expect.objectContaining({
          action: 'session.revoked.bulk',
          actorUserId: admin.user.id,
          targetId: admin.user.id,
          payload: expect.objectContaining({
            revoked: 1,
            scope: 'other-sessions',
          }),
        }),
      ]),
    )

    await app.close()
  })

  it('writes audit logs for denied operator management of backend accounts', async () => {
    const app = await createAdminAuditTestServer()

    const operator = await registerUser(app, 'operator2@example.com', 'operator-two')
    const peerOperator = await registerUser(app, 'peer2@example.com', 'peer-two')

    await setUserRole(operator.user.email, 'operator')
    await setUserRole(peerOperator.user.email, 'operator')

    const changeRoleResponse = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${peerOperator.user.id}/role`,
      headers: { cookie: operator.cookie },
      payload: { role: 'user' },
    })
    expect(changeRoleResponse.statusCode).toBe(403)

    const revokeResponse = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${peerOperator.user.id}/revoke-sessions`,
      headers: { cookie: operator.cookie },
    })
    expect(revokeResponse.statusCode).toBe(403)

    const store = await storeRepository.read()
    expect(store.auditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'admin.user.role.update_denied',
          actorUserId: operator.user.id,
          targetId: peerOperator.user.id,
          payload: expect.objectContaining({
            currentRole: 'operator',
            requestedRole: 'user',
            isSelf: false,
          }),
        }),
        expect.objectContaining({
          action: 'admin.user.sessions.revoke_denied',
          actorUserId: operator.user.id,
          targetId: peerOperator.user.id,
          payload: expect.objectContaining({
            isSelf: false,
          }),
        }),
      ]),
    )

    await app.close()
  })

  it('writes audit logs for session revocation and password reset flow', async () => {
    const app = await createAdminAuditTestServer()

    const user = await registerUser(app, 'audit@example.com', 'audit-user')
    await loginUser(app, 'audit@example.com')

    const revokeOthersResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/sessions/revoke-others',
      headers: { cookie: user.cookie },
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
    const resetToken = (await storeRepository.read()).users.find(
      (item) => item.email === 'audit@example.com',
    )?.passwordResetToken
    expect(resetToken).toEqual(expect.any(String))

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
    expect(store.auditLogs.map((item) => item.action)).toEqual(
      expect.arrayContaining([
        'session.revoked.others',
        'auth.password-reset.requested',
        'auth.password-reset.completed',
      ]),
    )
    expect(
      store.sessions.filter((item) => item.userId === user.user.id && !item.revokedAt),
    ).toHaveLength(0)

    await app.close()
  })

  it('updates user status, revokes sessions, and blocks further login', async () => {
    const app = await createAdminAuditTestServer()

    const admin = await registerUser(app, 'status-admin@example.com', 'status-admin')
    const target = await registerUser(app, 'status-user@example.com', 'status-user')
    await setUserRole(admin.user.email, 'admin')
    await loginUser(app, 'status-user@example.com')

    const freezeResponse = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${target.user.id}/status`,
      headers: { cookie: admin.cookie },
      payload: {
        status: 'frozen',
        reason: '人工冻结测试账号',
      },
    })

    expect(freezeResponse.statusCode).toBe(200)
    expect(freezeResponse.json()).toMatchObject({
      data: {
        id: target.user.id,
        status: 'frozen',
        statusReason: '人工冻结测试账号',
      },
    })

    const filteredUsersResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/users?status=frozen',
      headers: { cookie: admin.cookie },
    })
    expect(filteredUsersResponse.statusCode).toBe(200)
    expect(filteredUsersResponse.json().data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: target.user.id, status: 'frozen' })]),
    )

    const blockedLoginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'status-user@example.com',
        password: 'secret123',
      },
    })
    expect(blockedLoginResponse.statusCode).toBe(403)
    expect(blockedLoginResponse.json()).toMatchObject({
      error: {
        code: 'USER_FROZEN',
      },
    })

    const store = await storeRepository.read()
    expect(
      store.sessions.filter((item) => item.userId === target.user.id && !item.revokedAt),
    ).toHaveLength(0)
    expect(store.auditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'user.status.updated',
          actorUserId: admin.user.id,
          targetId: target.user.id,
          payload: expect.objectContaining({
            fromStatus: 'active',
            toStatus: 'frozen',
            revokedSessions: 2,
          }),
        }),
      ]),
    )

    await app.close()
  })

  it('adjusts user quota and exposes user-scoped task and audit views', async () => {
    const app = await createAdminAuditTestServer()

    const admin = await registerUser(app, 'quota-admin@example.com', 'quota-admin')
    const target = await registerUser(app, 'quota-user@example.com', 'quota-user')
    await setUserRole(admin.user.email, 'admin')

    const store = await storeRepository.read()
    store.generationTasks.push({
      id: 'task-user-scope',
      userId: target.user.id,
      status: 'failed',
      progress: 100,
      errorMessage: 'provider timeout',
      payload: {
        mode: 'text2image',
        title: '范围测试任务',
        meta: 'scope-test',
        promptText: 'scope prompt',
        workspacePrompt: 'scope prompt',
        requestPrompt: 'scope prompt',
        size: '1024x1024',
        quality: 'high',
        model: 'gpt-image-1',
        providerId: 'openai',
        stream: false,
      },
      createdAt: '2026-05-04T01:00:00.000Z',
      updatedAt: '2026-05-04T01:05:00.000Z',
    })
    await storeRepository.write(store)

    const quotaResponse = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${target.user.id}/quota-adjustments`,
      headers: { cookie: admin.cookie },
      payload: {
        delta: 25,
        reason: '补偿失败任务',
      },
    })
    expect(quotaResponse.statusCode).toBe(200)
    expect(quotaResponse.json()).toMatchObject({
      data: {
        id: target.user.id,
        quotaProfile: expect.objectContaining({
          quotaRemaining: 125,
          quotaTotal: 125,
          quotaUsed: 0,
        }),
        recentTasks: expect.arrayContaining([
          expect.objectContaining({
            id: 'task-user-scope',
            status: 'failed',
          }),
        ]),
        recentAuditLogs: expect.arrayContaining([
          expect.objectContaining({
            action: 'user.quota.adjusted',
          }),
        ]),
      },
    })

    const tasksResponse = await app.inject({
      method: 'GET',
      url: `/api/admin/tasks?userId=${target.user.id}`,
      headers: { cookie: admin.cookie },
    })
    expect(tasksResponse.statusCode).toBe(200)
    expect(tasksResponse.json().data.items).toEqual([
      expect.objectContaining({
        id: 'task-user-scope',
        userId: target.user.id,
      }),
    ])

    const auditResponse = await app.inject({
      method: 'GET',
      url: `/api/admin/audit?targetType=user&targetId=${target.user.id}`,
      headers: { cookie: admin.cookie },
    })
    expect(auditResponse.statusCode).toBe(200)
    expect(auditResponse.json().data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'user.quota.adjusted',
          targetId: target.user.id,
        }),
      ]),
    )

    await app.close()
  })

  it('supports bulk user status updates and writes batch audit logs', async () => {
    const app = await createAdminAuditTestServer()

    const admin = await registerUser(app, 'bulk-admin@example.com', 'bulk-admin')
    const targetA = await registerUser(app, 'bulk-a@example.com', 'bulk-a')
    const targetB = await registerUser(app, 'bulk-b@example.com', 'bulk-b')
    await setUserRole(admin.user.email, 'admin')
    await loginUser(app, 'bulk-a@example.com')
    await loginUser(app, 'bulk-b@example.com')

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/users/status-bulk',
      headers: { cookie: admin.cookie },
      payload: {
        userIds: [targetA.user.id, targetB.user.id],
        status: 'disabled',
        reason: '批量停用测试',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      data: {
        success: true,
        updatedCount: 2,
        succeeded: expect.arrayContaining([
          expect.objectContaining({ id: targetA.user.id, status: 'disabled' }),
          expect.objectContaining({ id: targetB.user.id, status: 'disabled' }),
        ]),
      },
    })

    const store = await storeRepository.read()
    expect(store.users.find((item) => item.id === targetA.user.id)?.status).toBe('disabled')
    expect(store.users.find((item) => item.id === targetB.user.id)?.status).toBe('disabled')
    expect(
      store.auditLogs.filter((item) => item.action === 'user.status.updated.batch'),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ targetId: targetA.user.id }),
        expect.objectContaining({ targetId: targetB.user.id }),
      ]),
    )

    await app.close()
  })

  it('supports provider policy updates, notes, and admin-generated password resets', async () => {
    const app = await createAdminAuditTestServer()

    const admin = await registerUser(app, 'policy-admin@example.com', 'policy-admin')
    const target = await registerUser(app, 'policy-target@example.com', 'policy-target')
    await setUserRole(admin.user.email, 'admin')

    const store = await storeRepository.read()
    store.managedProviders.push({
      id: 'openai-main',
      name: 'OpenAI Main',
      description: '公共 OpenAI',
      apiUrl: 'https://api.openai.com',
      apiKey: 'managed-secret',
      models: ['gpt-image-2'],
      defaultModel: 'gpt-image-2',
      enabled: true,
      updatedAt: new Date().toISOString(),
    })
    await storeRepository.write(store)

    const policyResponse = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${target.user.id}/provider-policy`,
      headers: { cookie: admin.cookie },
      payload: {
        allowManagedProviders: true,
        allowCustomProvider: false,
        allowedManagedProviderIds: ['openai-main'],
        allowedModels: ['gpt-image-2'],
      },
    })

    expect(policyResponse.statusCode).toBe(200)
    expect(policyResponse.json()).toMatchObject({
      data: {
        id: target.user.id,
        providerPolicy: {
          allowManagedProviders: true,
          allowCustomProvider: false,
          allowedManagedProviderIds: ['openai-main'],
          allowedModels: ['gpt-image-2'],
        },
      },
    })

    const noteResponse = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${target.user.id}/notes`,
      headers: { cookie: admin.cookie },
      payload: {
        content: '需要继续观察该用户的模型使用范围',
      },
    })

    expect(noteResponse.statusCode).toBe(200)
    expect(noteResponse.json()).toMatchObject({
      data: {
        id: target.user.id,
        recentNotes: expect.arrayContaining([
          expect.objectContaining({
            action: 'user.note.added',
          }),
        ]),
      },
    })

    const resetResponse = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${target.user.id}/password-reset`,
      headers: { cookie: admin.cookie },
    })

    expect(resetResponse.statusCode).toBe(200)
    expect(resetResponse.json()).toMatchObject({
      data: {
        success: true,
        token: expect.any(String),
        resetPath: expect.stringContaining('/forgot-password?'),
      },
    })

    const latestStore = await storeRepository.read()
    const latestUser = latestStore.users.find((item) => item.id === target.user.id)
    expect(latestUser).toBeTruthy()
    expect(latestUser?.allowCustomProvider).toBe(false)
    expect(latestUser?.allowedManagedProviderIds).toEqual(['openai-main'])
    expect(latestUser?.allowedModels).toEqual(['gpt-image-2'])
    expect(latestUser?.passwordResetToken).toEqual(expect.any(String))
    expect(latestStore.auditLogs.map((item) => item.action)).toEqual(
      expect.arrayContaining([
        'user.provider-policy.updated',
        'user.note.added',
        'admin.user.password-reset.created',
      ]),
    )

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

async function registerUser(
  app: Awaited<ReturnType<typeof createAdminAuditTestServer>>,
  email: string,
  nickname: string,
) {
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
  const store = await storeRepository.read()
  const user = store.users.find((item) => item.email === email)
  expect(user).toBeTruthy()
  if (!user) {
    throw new Error('user not found after register')
  }

  return {
    cookie: cookie ? `miastra_auth=${cookie}` : '',
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
    } as {
      id: string
      email: string
      nickname: string
      role: 'user' | 'operator' | 'admin'
    },
  }
}

async function loginUser(
  app: Awaited<ReturnType<typeof createAdminAuditTestServer>>,
  email: string,
) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      email,
      password: 'secret123',
    },
  })

  expect(response.statusCode).toBe(200)
  const cookie = response.cookies.find((item) => item.name === 'miastra_auth')?.value ?? ''
  return cookie ? `miastra_auth=${cookie}` : ''
}

async function setUserRole(userIdentifier: string, role: 'user' | 'operator' | 'admin') {
  const store = await storeRepository.read()
  const user = store.users.find(
    (item) => item.id === userIdentifier || item.email === userIdentifier,
  )
  if (!user) {
    throw new Error('user not found')
  }

  user.role = role
  user.updatedAt = new Date().toISOString()
  await storeRepository.write(store)
}
