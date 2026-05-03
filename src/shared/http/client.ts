import { createAppErrorFromApi, createNetworkError } from '@/shared/errors/app-error'

export async function apiRequest<T>(path: string, init?: Omit<RequestInit, 'body'> & { body?: unknown }): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body !== undefined && !(init?.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'include',
      headers,
      body: init?.body === undefined ? undefined : init.body instanceof FormData ? init.body : JSON.stringify(init.body),
    })
  } catch (error) {
    throw createNetworkError('网络请求失败，请检查网络连接或稍后重试。', error)
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw createAppErrorFromApi(payload, response.status)
  }

  return (payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload) as T
}
