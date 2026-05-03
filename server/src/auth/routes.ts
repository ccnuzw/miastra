import { z } from 'zod'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { createId, storeRepository } from '../lib/store'
import { getAuthDomainStore } from '../lib/domain-store'
import { fail, ok } from '../lib/http'
import { createDefaultQuotaProfile } from '../billing/plans'
import type { AuthRecord } from './types'
import { signAuthToken, verifyAuthToken } from './token'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nickname: z.string().trim().min(1).max(32),
})

const loginSchema = z.object({
  email: z.string().email(),
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

const isProduction = process.env.NODE_ENV === 'production'

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '注册信息不完整或格式不正确')
    }

    const store = await storeRepository.read()
    const email = parsed.data.email.trim().toLowerCase()
    const existingUser = store.users.find((item) => item.email === email)
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
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      revokedAt: null,
    }

    store.users.push(user)
    store.sessions.push(session)
    store.quotaProfiles.push(createDefaultQuotaProfile(user.id, now))
    await storeRepository.write(store)

    await setAuthCookie(reply, user.id, session.id)
    return ok(toPublicUser(user))
  })

  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '请输入正确的邮箱和密码')
    }

    const store = await storeRepository.read()
    const email = parsed.data.email.trim().toLowerCase()
    const user = store.users.find((item) => item.email === email) ?? null

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
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      revokedAt: null,
    }

    store.sessions.push(session)
    await storeRepository.write(store)

    await setAuthCookie(reply, user.id, session.id)
    return ok(toPublicUser(user))
  })

  app.post('/api/auth/logout', async (request, reply) => {
    const token = request.cookies.miastra_auth
    if (token) {
      try {
        const payload = await verifyAuthToken(token)
        const sessionId = String(payload.sessionId)
        await getAuthDomainStore().revokeSession(sessionId, new Date().toISOString())
      } catch {
      }
    }

    reply.clearCookie('miastra_auth', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
    })

    return ok({ success: true })
  })

  app.get('/api/auth/me', async (request) => {
    const user = await resolveAuthenticatedUser(request)
    if (!user) return ok(null)
    return ok(toPublicUser(user))
  })

  app.get('/api/auth/quota', async (request, reply) => {
    const context = await requireAuthenticatedContext(request, reply)
    if (!context) return

    const store = await storeRepository.read()
    const profile = store.quotaProfiles.find((item) => item.userId === context.user.id) ?? null
    if (!profile) {
      const nextProfile = createDefaultQuotaProfile(context.user.id)
      store.quotaProfiles.push(nextProfile)
      await storeRepository.write(store)
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
    const store = await storeRepository.read()
    const user = store.users.find((item) => item.id === context.user.id) ?? null
    if (!user) {
      reply.code(404)
      return fail('USER_NOT_FOUND', '用户不存在')
    }
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

    const store = await storeRepository.read()
    const user = store.users.find((item) => item.id === context.user.id) ?? null
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
    const mutableUser = store.users.find((item) => item.id === context.user.id)
    if (!mutableUser) {
      reply.code(404)
      return fail('USER_NOT_FOUND', '用户不存在')
    }
    mutableUser.passwordHash = nextPasswordHash
    mutableUser.passwordResetToken = null
    mutableUser.passwordResetExpiresAt = null
    mutableUser.updatedAt = updatedAt
    store.sessions.forEach((session) => {
      if (session.userId === mutableUser.id && session.id !== context.session.id && !session.revokedAt) {
        session.revokedAt = updatedAt
      }
    })
    await storeRepository.write(store)
    return ok({ success: true })
  })

  app.post('/api/auth/forgot-password', async (request, reply) => {
    const parsed = forgotPasswordSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '请输入正确的邮箱地址')
    }

    const email = parsed.data.email.trim().toLowerCase()
    const store = await storeRepository.read()
    const user = store.users.find((item) => item.email === email) ?? null
    if (!user) {
      return ok({ success: true })
    }

    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const updatedAt = new Date().toISOString()
    user.passwordResetToken = token
    user.passwordResetExpiresAt = expiresAt
    user.updatedAt = updatedAt
    await storeRepository.write(store)

    if (isProduction) {
      return ok({ success: true })
    }

    return ok({
      success: true,
      debugResetToken: token,
      resetTokenExpiresAt: expiresAt,
    })
  })

  app.post('/api/auth/reset-password', async (request, reply) => {
    const parsed = resetPasswordSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '重置密码参数不正确')
    }

    const email = parsed.data.email.trim().toLowerCase()
    const store = await storeRepository.read()
    const user = store.users.find((item) => item.email === email) ?? null
    if (!user || !user.passwordResetToken || !user.passwordResetExpiresAt) {
      reply.code(404)
      return fail('RESET_TOKEN_NOT_FOUND', '重置请求不存在或已失效')
    }

    const expired = new Date(user.passwordResetExpiresAt).getTime() <= Date.now()
    if (expired) {
      const updatedAt = new Date().toISOString()
      const mutableUser = store.users.find((item) => item.id === user.id)
      if (mutableUser) {
        mutableUser.passwordResetToken = null
        mutableUser.passwordResetExpiresAt = null
        mutableUser.updatedAt = updatedAt
        await storeRepository.write(store)
      }
      reply.code(410)
      return fail('RESET_TOKEN_EXPIRED', '重置令牌已过期，请重新申请')
    }

    if (user.passwordResetToken !== parsed.data.token.trim()) {
      reply.code(401)
      return fail('INVALID_RESET_TOKEN', '重置令牌不正确')
    }

    const nextPasswordHash = await bcrypt.hash(parsed.data.nextPassword, 10)
    const updatedAt = new Date().toISOString()
    const mutableUser = store.users.find((item) => item.id === user.id)
    if (!mutableUser) {
      reply.code(404)
      return fail('USER_NOT_FOUND', '用户不存在')
    }
    mutableUser.passwordHash = nextPasswordHash
    mutableUser.passwordResetToken = null
    mutableUser.passwordResetExpiresAt = null
    mutableUser.updatedAt = updatedAt
    store.sessions.forEach((session) => {
      if (session.userId === mutableUser.id && !session.revokedAt) {
        session.revokedAt = updatedAt
      }
    })
    await storeRepository.write(store)
    return ok({ success: true })
  })

  app.get('/api/auth/sessions', async (request, reply) => {
    const context = await requireAuthenticatedContext(request, reply)
    if (!context) return

    const store = await storeRepository.read()
    const sessions = store.sessions.filter((session) => session.userId === context.user.id).sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
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

    const store = await storeRepository.read()
    const targetSession = store.sessions.find((session) => session.userId === context.user.id && session.id === id.data)
    if (!targetSession) {
      reply.code(404)
      return fail('SESSION_NOT_FOUND', '会话不存在')
    }
    targetSession.revokedAt = new Date().toISOString()
    await storeRepository.write(store)
    return ok({ success: true })
  })

  app.post('/api/auth/sessions/revoke-others', async (request, reply) => {
    const context = await requireAuthenticatedContext(request, reply)
    if (!context) return

    const store = await storeRepository.read()
    let revoked = 0
    store.sessions.forEach((session) => {
      if (session.userId === context.user.id && session.id !== context.session.id && !session.revokedAt) {
        session.revokedAt = new Date().toISOString()
        revoked += 1
      }
    })
    await storeRepository.write(store)
    return ok({ success: true, revoked })
  })
}

export async function resolveAuthenticatedContext(request: FastifyRequest) {
  const token = request.cookies.miastra_auth
  if (!token) return null

  try {
    const payload = await verifyAuthToken(token)
    const sessionId = String(payload.sessionId)
    const userId = String(payload.userId)
    const store = await storeRepository.read()
    const session = store.sessions.find((item) => item.id === sessionId && item.userId === userId)
    if (!session || session.revokedAt || new Date(session.expiresAt).getTime() <= Date.now()) return null
    const user = store.users.find((item) => item.id === userId)
    if (!user) return null
    return { user, session }
  } catch {
    return null
  }
}

export async function resolveAuthenticatedUser(request: FastifyRequest) {
  const context = await resolveAuthenticatedContext(request)
  return context?.user ?? null
}

export async function requireAuthenticatedContext(request: FastifyRequest, reply: FastifyReply) {
  const context = await resolveAuthenticatedContext(request)
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
  allowedRoles: AuthRecord['role'][],
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
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60,
  })
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
