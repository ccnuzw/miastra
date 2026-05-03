import { buildServerError } from './errors'

export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return { data, meta }
}

export function fail(code: string, message: string) {
  return {
    error: buildServerError(code, message),
  }
}
