import { z } from 'zod'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import bcrypt from 'bcryptjs'
import { createId } from '../lib/store'
import { fail, ok } from '../lib/http'
import { appendAuditLog } from '../lib/audit'
import { createDefaultQuotaProfile } from '../billing/plans'
import { getAuthDomainStore } from '../lib/domain-store'
import type { AuthRecord } from './types'
import { signAuthToken, signResetToken, verifyAuthToken, verifyResetToken } from './token'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nickname: z.string().trim().min(1).max(32),
})

const loginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
})

const updateProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(32),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  nextPassword: z.string().min(6),
})

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

const resetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().trim().min(1),
  nextPassword: z.string().min(6),
})

const sessionMaxAgeSeconds = 7 * 24 * 60 * 60
const sessionDurationMs = sessionMaxAgeSeconds * 1000
const resetTokenDurationMs = 15 * 60 * 1000
const sessionRefreshThresholdMs = 24 * 60 * 60 * 1000
const authContextCacheTtlMs = 2_000

type CachedAuthContext = {
  context: { user: AuthRecord, session: { id: string, userId: string, createdAt: string, expiresAt: string, revokedAt: string | null } }
  cachedAt: number
}

const authContextCache = new Map<string, CachedAuthContext>()

function getAuthContextCacheKey(sessionId: string, userId: string) {
  return `${sessionId}:${userId}`
}

function getCachedAuthContext(sessionId: string, userId: string) {
  const cached = authContextCache.get(getAuthContextCacheKey(sessionId, userId))
  if (!cached) return null
  if (Date.now() - cached.cachedAt > authContextCacheTtlMs) {
    authContextCache.delete(getAuthContextCacheKey(sessionId, userId))
    return null
  }
  return cached.context
}

function setCachedAuthContext(sessionId: string, userId: string, context: CachedAuthContext['context']) {
  authContextCache.set(getAuthContextCacheKey(sessionId, userId), {
    context,
    cachedAt: Date.now(),
  })
}

function clearCachedAuthContext(sessionId: string, userId: string) {
  authContextCache.delete(getAuthContextCacheKey(sessionId, userId))
}

function clearCachedAuthContextsForUser(userId: string) {
  for (const [cacheKey, cached] of authContextCache.entries()) {
    if (cached.context.user.id === userId) {
      authContextCache.delete(cacheKey)
    }
  }
}

function shouldRefreshSession(expiresAt: string) {
  return new Date(expiresAt).getTime() - Date.now() <= sessionRefreshThresholdMs
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '注册信息不完整或格式不正确')
    }

    const authStore = getAuthDomainStore()
    const email = parsed.data.email.trim().toLowerCase()
    const existingUser = await authStore.findUserByEmail(email)
    if (existingUser) {
      reply.code(409)
      return fail('EMAIL_ALREADY_EXISTS', '该邮箱已注册')
    }

    const now = new Date().toISOString()
    const user: AuthRecord = {
      id: createId(),
      email,
      nickname: parsed.data.nickname.trim(),
      role: 'user',
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      createdAt: now,
      updatedAt: now,
    }
    const session = {
      id: createId(),
      userId: user.id,
      createdAt: now,
      expiresAt: buildSessionExpiresAt(),
      revokedAt: null,
    }

    await authStore.createUser(user)
    await authStore.createSession(session)
    await authStore.upsertQuotaProfile(createDefaultQuotaProfile(user.id, now))
    await appendAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'auth.registered',
      targetType: 'user',
      targetId: user.id,
      payload: { email: user.email, sessionId: session.id },
      ip: request.ip,
      requestId: request.id,
      createdAt: now,
    })

    await setAuthCookie(reply, user.id, session.id)
    return ok(toPublicUser(user))
  })

  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '请输入正确的邮箱和密码')
    }

    const authStore = getAuthDomainStore()
    const loginIdentifier = parsed.data.email.trim()
    const user = await authStore.findUserByLoginIdentifier(loginIdentifier)

    if (!user) {
      reply.code(401)
      return fail('INVALID_CREDENTIALS', '邮箱或密码错误')
    }

    const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash)
    if (!passwordMatches) {
      reply.code(401)
      return fail('INVALID_CREDENTIALS', '邮箱或密码错误')
    }

    const session = {
      id: createId(),
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: buildSessionExpiresAt(),
      revokedAt: null,
    }

    await authStore.createSession(session)
    await appendAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'auth.logged_in',
      targetType: 'session',
      targetId: session.id,
      payload: { userId: user.id },
      ip: request.ip,
      requestId: request.id,
      createdAt: session.createdAt,
    })

    await setAuthCookie(reply, user.id, session.id)
    return ok(toPublicUser(user))
  })

  app.post('/api/auth/logout', async (request, reply) => {
    const token = request.cookies.miastra_auth
    if (token) {
      try {
        const payload = await verifyAuthToken(token)
        const sessionId = String(payload.sessionId)
        const userId = String(payload.userId)
        const revokedAt = new Date().toISOString()
        const authStore = getAuthDomainStore()
        const context = await authStore.findAuthContext(sessionId, userId)
        if (context && !context.session.revokedAt) {
          await authStore.revokeSession(sessionId, revokedAt)
          clearCachedAuthContext(sessionId, userId)
          await appendAuditLog({
            actorUserId: context.user.id,
            actorRole: context.user.role,
            action: 'auth.logged_out',
            targetType: 'session',
            targetId: context.session.id,
            payload: { userId: context.user.id },
            ip: request.ip,
            requestId: request.id,
            createdAt: revokedAt,
          })
        }
      } catch {
      }
    }

    clearAuthCookie(reply)

    return ok({ success: true })
  })

  app.get('/api/auth/me', async (request, reply) => {
    const context = await resolveAuthenticatedContext(request, reply)
    if (!context) return ok(null)

    return ok(toPublicUser(context.user))
  })

  app.post('/api/auth/session/refresh', async (request, reply) => {
    const context = await requireAuthenticatedContext(request, reply)
    if (!context) return

    const refreshed = await refreshSession(reply, context.user.id, context.session.id)
    return ok({ success: true, refreshed })
  })

  app.get('/api/auth/quota', async (request, reply) => {
    const context = await requireAuthenticatedContext(request, reply)
    if (!context) return

    const authStore = getAuthDomainStore()
    const profile = await authStore.findQuotaProfileByUserId(context.user.id)
    if (!profile) {
      const nextProfile = createDefaultQuotaProfile(context.user.id)
      await authStore.upsertQuotaProfile(nextProfile)
      return ok(nextProfile)
    }
    return ok(profile)
  })

  app.post('/api/auth/profile', async (request, reply) => {
    const context = await requireAuthenticatedContext(request, reply)
    if (!context) return

    const parsed = updateProfileSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '昵称格式不正确')
    }

    const nextNickname = parsed.data.nickname.trim()
    const updatedAt = new Date().toISOString()
    const authStore = getAuthDomainStore()
    const user = await authStore.updateUserProfile(context.user.id, nextNickname, updatedAt)
    if (!user) {
      reply.code(404)
      return fail('USER_NOT_FOUND', '用户不存在')
    }
    clearCachedAuthContextsForUser(user.id)
    await appendAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'auth.profile.updated',
      targetType: 'user',
      targetId: user.id,
      payload: { nickname: nextNickname },
      ip: request.ip,
      requestId: request.id,
      createdAt: updatedAt,
    })
    return ok(toPublicUser(user))
  })

  app.post('/api/auth/password', async (request, reply) => {
    const context = await requireAuthenticatedContext(request, reply)
    if (!context) return

    const parsed = changePasswordSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '密码格式不正确')
    }

    const authStore = getAuthDomainStore()
    const user = await authStore.findUserById(context.user.id)
    if (!user) {
      reply.code(404)
      return fail('USER_NOT_FOUND', '用户不存在')
    }

    const passwordMatches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
    if (!passwordMatches) {
      reply.code(401)
      return fail('INVALID_CREDENTIALS', '当前密码不正确')
    }

    const nextPasswordHash = await bcrypt.hash(parsed.data.nextPassword, 10)
    const updatedAt = new Date().toISOString()
    await authStore.resetUserPasswordAndRevokeSessions(context.user.id, nextPasswordHash, updatedAt, { excludeSessionId: context.session.id })
    clearCachedAuthContextsForUser(user.id)
    await appendAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'auth.password.changed',
      targetType: 'user',
      targetId: user.id,
      payload: { preservedSessionId: context.session.id },
      ip: request.ip,
      requestId: request.id,
      createdAt: updatedAt,
    })
    return ok({ success: true })
  })

  app.post('/api/auth/forgot-password', async (request, reply) => {
    const parsed = forgotPasswordSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '请输入正确的邮箱地址')
    }

    const email = parsed.data.email.trim().toLowerCase()
    const authStore = getAuthDomainStore()
    const user = await authStore.findUserByEmail(email)
    if (!user) {
      return ok({ success: true })
    }

    const expiresAt = new Date(Date.now() + resetTokenDurationMs).toISOString()
    const token = await signResetToken({ userId: user.id, email: user.email })
    const updatedAt = new Date().toISOString()
    await authStore.updatePasswordResetToken(user.id, token, expiresAt, updatedAt)
    clearCachedAuthContextsForUser(user.id)
    await appendAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'auth.password-reset.requested',
      targetType: 'user',
      targetId: user.id,
      payload: { expiresAt },
      ip: request.ip,
      requestId: request.id,
      createdAt: updatedAt,
    })
    return ok({ success: true })
  })

  app.post('/api/auth/reset-password', async (request, reply) => {
    const parsed = resetPasswordSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '重置密码参数不正确')
    }

    const email = parsed.data.email.trim().toLowerCase()
    const authStore = getAuthDomainStore()
    const user = await authStore.findUserByEmail(email)
    if (!user?.passwordResetToken || !user.passwordResetExpiresAt) {
      reply.code(404)
      return fail('RESET_TOKEN_NOT_FOUND', '重置请求不存在或已失效')
    }

    const expired = new Date(user.passwordResetExpiresAt).getTime() <= Date.now()
    if (expired) {
      const updatedAt = new Date().toISOString()
      await authStore.updatePasswordResetToken(user.id, null, null, updatedAt)
      clearCachedAuthContextsForUser(user.id)
      reply.code(410)
      return fail('RESET_TOKEN_EXPIRED', '重置令牌已过期，请重新申请')
    }

    const resetToken = parsed.data.token.trim()
    if (user.passwordResetToken !== resetToken) {
      reply.code(401)
      return fail('INVALID_RESET_TOKEN', '重置令牌不正确')
    }

    try {
      const payload = await verifyResetToken(resetToken)
      if (String(payload.userId) !== user.id || String(payload.email) !== user.email) {
        reply.code(401)
        return fail('INVALID_RESET_TOKEN', '重置令牌不正确')
      }
    } catch {
      reply.code(401)
      return fail('INVALID_RESET_TOKEN', '重置令牌不正确')
    }

    const nextPasswordHash = await bcrypt.hash(parsed.data.nextPassword, 10)
    const updatedAt = new Date().toISOString()
    await authStore.resetUserPasswordAndRevokeSessions(user.id, nextPasswordHash, updatedAt)
    clearCachedAuthContextsForUser(user.id)
    await appendAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'auth.password-reset.completed',
      targetType: 'user',
      targetId: user.id,
      payload: {},
      ip: request.ip,
      requestId: request.id,
      createdAt: updatedAt,
    })
    return ok({ success: true })
  })

  app.get('/api/auth/sessions', async (request, reply) => {
    const context = await requireAuthenticatedContext(request, reply)
    if (!context) return

    const authStore = getAuthDomainStore()
    const sessions = await authStore.listSessionsByUserId(context.user.id)
    sessions.sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
    return ok(sessions.map((session) => ({
      ...session,
      current: session.id === context.session.id,
    })))
  })

  app.post('/api/auth/sessions/:id/revoke', async (request, reply) => {
    const context = await requireAuthenticatedContext(request, reply)
    if (!context) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '会话 ID 不正确')
    }
    if (id.data === context.session.id) {
      reply.code(409)
      return fail('INVALID_OPERATION', '当前会话请直接使用退出登录')
    }

    const authStore = getAuthDomainStore()
    const targetSession = await authStore.findAuthContext(id.data, context.user.id)
    if (!targetSession) {
      reply.code(404)
      return fail('SESSION_NOT_FOUND', '会话不存在')
    }
    if (!targetSession.session.revokedAt) {
      const revokedAt = new Date().toISOString()
      await authStore.revokeSession(targetSession.session.id, revokedAt)
      clearCachedAuthContext(targetSession.session.id, targetSession.session.userId)
      await appendAuditLog({
        actorUserId: context.user.id,
        actorRole: context.user.role,
        action: 'session.revoked.single',
        targetType: 'session',
        targetId: targetSession.session.id,
        payload: { userId: context.user.id },
        ip: request.ip,
        requestId: request.id,
        createdAt: revokedAt,
      })
    }
    return ok({ success: true })
  })

  app.post('/api/auth/sessions/revoke-others', async (request, reply) => {
    const context = await requireAuthenticatedContext(request, reply)
    if (!context) return

    const revokedAt = new Date().toISOString()
    const authStore = getAuthDomainStore()
    const revoked = await authStore.revokeSessionsByUserId(context.user.id, revokedAt, context.session.id)
    clearCachedAuthContextsForUser(context.user.id)
    await appendAuditLog({
      actorUserId: context.user.id,
      actorRole: context.user.role,
      action: 'session.revoked.others',
      targetType: 'user',
      targetId: context.user.id,
      payload: { revoked, preservedSessionId: context.session.id },
      ip: request.ip,
      requestId: request.id,
      createdAt: revokedAt,
    })
    return ok({ success: true, revoked })
  })
}

export async function resolveAuthenticatedContext(request: FastifyRequest, reply?: FastifyReply) {
  const token = request.cookies.miastra_auth
  if (!token) return null

  let payload: Awaited<ReturnType<typeof verifyAuthToken>>
  try {
    payload = await verifyAuthToken(token)
  } catch {
    clearAuthCookie(reply)
    return null
  }

  const sessionId = String(payload.sessionId)
  const userId = String(payload.userId)
  const cachedContext = getCachedAuthContext(sessionId, userId)
  if (cachedContext) return cachedContext
  const context = await getAuthDomainStore().findAuthContext(sessionId, userId)
  if (!context || context.session.revokedAt || new Date(context.session.expiresAt).getTime() <= Date.now()) {
    clearCachedAuthContext(sessionId, userId)
    clearAuthCookie(reply)
    return null
  }
  setCachedAuthContext(sessionId, userId, context)
  return context
}

export async function resolveAuthenticatedUser(request: FastifyRequest) {
  const context = await resolveAuthenticatedContext(request)
  return context?.user ?? null
}

export async function requireAuthenticatedContext(request: FastifyRequest, reply: FastifyReply) {
  const context = await resolveAuthenticatedContext(request, reply)
  if (!context) {
    reply.code(401)
    reply.send(fail('UNAUTHORIZED', '请先登录'))
    return null
  }
  return context
}

export async function requireAuthenticatedUser(request: FastifyRequest, reply: FastifyReply) {
  const context = await requireAuthenticatedContext(request, reply)
  return context?.user ?? null
}

export async function requireRole(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles: readonly AuthRecord['role'][],
) {
  const user = await requireAuthenticatedUser(request, reply)
  if (!user) return null
  if (allowedRoles.includes(user.role)) return user

  reply.code(403)
  reply.send(fail('FORBIDDEN', '当前账号没有访问该资源的权限'))
  return null
}

async function setAuthCookie(reply: FastifyReply, userId: string, sessionId: string) {
  const token = await signAuthToken({ userId, sessionId })
  reply.setCookie('miastra_auth', token, {
    ...getAuthCookieOptions(),
    maxAge: sessionMaxAgeSeconds,
  })
}

async function refreshSession(reply: FastifyReply, userId: string, sessionId: string) {
  const authStore = getAuthDomainStore()
  const current = await authStore.findAuthContext(sessionId, userId)
  if (!current || current.session.revokedAt || !shouldRefreshSession(current.session.expiresAt)) {
    return false
  }
  const expiresAt = buildSessionExpiresAt()
  const updated = await authStore.updateSessionExpiresAt(sessionId, userId, expiresAt)
  if (updated) {
    await setAuthCookie(reply, userId, sessionId)
  }
  return updated
}

function clearAuthCookie(reply?: FastifyReply) {
  if (!reply) return
  reply.setCookie('miastra_auth', '', {
    ...getAuthCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  })
}

function getAuthCookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  }
}

function buildSessionExpiresAt() {
  return new Date(Date.now() + sessionDurationMs).toISOString()
}

function toPublicUser(user: AuthRecord) {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
