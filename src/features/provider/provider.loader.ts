import { isAppError } from '@/shared/errors/app-error'

const defaultRetryDelaysMs = [120, 320]

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function shouldRetryProviderConfigLoad(error: unknown) {
  if (!isAppError(error)) return true
  if (error.retryable) return true
  if (error.status === 401 || error.status === 403 || error.status === 408 || error.status === 429) return true
  return (error.status ?? 0) >= 500
}

export async function loadWithRetry<T>(
  load: () => Promise<T>,
  retryDelaysMs: number[] = defaultRetryDelaysMs,
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    try {
      return await load()
    } catch (error) {
      lastError = error
      if (attempt >= retryDelaysMs.length || !shouldRetryProviderConfigLoad(error)) {
        throw error
      }
      const delay = retryDelaysMs[attempt] ?? 0
      if (delay > 0) await wait(delay)
    }
  }

  throw lastError
}
