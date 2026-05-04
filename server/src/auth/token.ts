import { SignJWT, jwtVerify } from 'jose'

function readSecret(name: 'AUTH_JWT_SECRET' | 'RESET_JWT_SECRET', fallback: string) {
  const value = process.env[name]?.trim()
  if (value) return value
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`生产环境必须配置 ${name}。请先在根目录 .env 中设置强随机值。`)
  }
  return fallback
}

function getAuthSecret() {
  return new TextEncoder().encode(readSecret('AUTH_JWT_SECRET', 'miastra-dev-secret-change-me'))
}

function getResetSecret() {
  return new TextEncoder().encode(
    readSecret('RESET_JWT_SECRET', process.env.AUTH_JWT_SECRET?.trim() ?? 'miastra-dev-reset-secret-change-me'),
  )
}

export async function signAuthToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getAuthSecret())
}

export async function verifyAuthToken(token: string) {
  const verified = await jwtVerify(token, getAuthSecret())
  return verified.payload
}

export async function signResetToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(getResetSecret())
}

export async function verifyResetToken(token: string) {
  const verified = await jwtVerify(token, getResetSecret())
  return verified.payload
}
