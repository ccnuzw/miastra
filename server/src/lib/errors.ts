export type ServerErrorCategory = 'auth' | 'config' | 'provider' | 'service' | 'data' | 'input' | 'billing'
export type ServerErrorAction = 'login' | 'check-config' | 'retry' | 'refresh' | 'contact-support' | 'none'

export type ServerErrorPayload = {
  code: string
  message: string
  category: ServerErrorCategory
  retryable: boolean
  action: ServerErrorAction
}

type ServerErrorDefinition = Omit<ServerErrorPayload, 'code' | 'message'>

const defaultServerErrorDefinition: ServerErrorDefinition = {
  category: 'service',
  retryable: false,
  action: 'contact-support',
}

const serverErrorCatalog: Record<string, ServerErrorDefinition> = {
  BILLING_CHECKOUT_UNAVAILABLE: { category: 'billing', retryable: false, action: 'none' },
  EMAIL_ALREADY_EXISTS: { category: 'data', retryable: false, action: 'none' },
  FORBIDDEN: { category: 'auth', retryable: false, action: 'none' },
  INVALID_CREDENTIALS: { category: 'auth', retryable: false, action: 'none' },
  INVALID_INPUT: { category: 'input', retryable: false, action: 'none' },
  INVALID_OPERATION: { category: 'data', retryable: false, action: 'refresh' },
  INVALID_RESET_TOKEN: { category: 'auth', retryable: false, action: 'none' },
  PASSWORD_RESET_UNAVAILABLE: { category: 'service', retryable: false, action: 'none' },
  PLAN_NOT_FOUND: { category: 'billing', retryable: false, action: 'refresh' },
  PROVIDER_API_KEY_INVALID: { category: 'config', retryable: false, action: 'check-config' },
  PROVIDER_COMPATIBILITY_ERROR: { category: 'provider', retryable: false, action: 'check-config' },
  PROVIDER_CONFIG_REQUIRED: { category: 'config', retryable: false, action: 'check-config' },
  PROVIDER_MODEL_INVALID: { category: 'config', retryable: false, action: 'check-config' },
  PROVIDER_URL_INVALID: { category: 'config', retryable: false, action: 'check-config' },
  QUOTA_EXCEEDED: { category: 'billing', retryable: false, action: 'none' },
  QUOTA_NOT_FOUND: { category: 'billing', retryable: false, action: 'refresh' },
  RESET_TOKEN_EXPIRED: { category: 'auth', retryable: false, action: 'refresh' },
  RESET_TOKEN_NOT_FOUND: { category: 'auth', retryable: false, action: 'refresh' },
  SESSION_NOT_FOUND: { category: 'data', retryable: false, action: 'refresh' },
  TASK_NOT_CANCELLABLE: { category: 'data', retryable: false, action: 'refresh' },
  TASK_NOT_FOUND: { category: 'data', retryable: false, action: 'refresh' },
  TASK_NOT_RETRYABLE: { category: 'data', retryable: false, action: 'refresh' },
  TASK_INVALID_STATUS_TRANSITION: { category: 'data', retryable: false, action: 'refresh' },
  TEMPLATE_NOT_FOUND: { category: 'data', retryable: false, action: 'refresh' },
  UNAUTHORIZED: { category: 'auth', retryable: false, action: 'login' },
  UPSTREAM_UNAVAILABLE: { category: 'provider', retryable: true, action: 'retry' },
  USER_NOT_FOUND: { category: 'data', retryable: false, action: 'refresh' },
  WORK_NOT_FOUND: { category: 'data', retryable: false, action: 'refresh' },
}

export function buildServerError(code: string, message: string): ServerErrorPayload {
  const definition = serverErrorCatalog[code] ?? defaultServerErrorDefinition
  return {
    code,
    message,
    category: definition.category,
    retryable: definition.retryable,
    action: definition.action,
  }
}
