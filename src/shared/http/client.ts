export async function apiRequest<T>(path: string, init?: Omit<RequestInit, 'body'> & { body?: unknown }): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body !== undefined && !(init?.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers,
    body: init?.body === undefined ? undefined : init.body instanceof FormData ? init.body : JSON.stringify(init.body),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `HTTP ${response.status}`)
  }

  return (payload?.data ?? payload) as T
}
