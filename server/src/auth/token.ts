import { SignJWT, jwtVerify } from 'jose'

function readSecret(name: 'AUTH_JWT_SECRET' | 'RESET_JWT_SECRET', fallback: string) {
  const value = process.env[name]?.trim()
  if (value) return value
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`)
  }
  return fallback
}

const authSecret = new TextEncoder().encode(readSecret('AUTH_JWT_SECRET', 'miastra-dev-secret-change-me'))
const resetSecret = new TextEncoder().encode(
  readSecret('RESET_JWT_SECRET', process.env.AUTH_JWT_SECRET?.trim() ?? 'miastra-dev-reset-secret-change-me'),
)

export async function signAuthToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(authSecret)
}

export async function verifyAuthToken(token: string) {
  const verified = await jwtVerify(token, authSecret)
  return verified.payload
}

export async function signResetToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(resetSecret)
}

export async function verifyResetToken(token: string) {
  const verified = await jwtVerify(token, resetSecret)
  return verified.payload
}
