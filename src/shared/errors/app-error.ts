export type AppErrorCategory = 'auth' | 'config' | 'provider' | 'service' | 'data' | 'input' | 'billing' | 'export'
export type AppErrorAction = 'login' | 'check-config' | 'retry' | 'refresh' | 'contact-support' | 'none'

export type AppErrorInit = {
  code: string
  message: string
  category: AppErrorCategory
  retryable: boolean
  action: AppErrorAction
  status?: number
  cause?: unknown
}

export type ApiErrorPayload = {
  code?: unknown
  message?: unknown
  category?: unknown
  retryable?: unknown
  action?: unknown
}

export class AppError extends Error {
  code: string
  category: AppErrorCategory
  retryable: boolean
  action: AppErrorAction
  status?: number
  cause?: unknown

  constructor(init: AppErrorInit) {
    super(init.message)
    this.name = 'AppError'
    this.code = init.code
    this.category = init.category
    this.retryable = init.retryable
    this.action = init.action
    this.status = init.status
    if (init.cause !== undefined) this.cause = init.cause
  }
}

type ErrorDefinition = Omit<AppErrorInit, 'message'>

const defaultErrorDefinition: ErrorDefinition = {
  code: 'UNKNOWN_ERROR',
  category: 'service',
  retryable: false,
  action: 'contact-support',
}

const appErrorCatalog: Record<string, ErrorDefinition> = {
  BILLING_CHECKOUT_UNAVAILABLE: { code: 'BILLING_CHECKOUT_UNAVAILABLE', category: 'billing', retryable: false, action: 'none' },
  EMAIL_ALREADY_EXISTS: { code: 'EMAIL_ALREADY_EXISTS', category: 'data', retryable: false, action: 'none' },
  EXPORT_EMPTY_BLOB: { code: 'EXPORT_EMPTY_BLOB', category: 'export', retryable: true, action: 'retry' },
  EXPORT_FETCH_FAILED: { code: 'EXPORT_FETCH_FAILED', category: 'export', retryable: true, action: 'retry' },
  EXPORT_ZIP_FAILED: { code: 'EXPORT_ZIP_FAILED', category: 'export', retryable: true, action: 'retry' },
  FORBIDDEN: { code: 'FORBIDDEN', category: 'auth', retryable: false, action: 'none' },
  GENERATION_ABORTED: { code: 'GENERATION_ABORTED', category: 'service', retryable: false, action: 'none' },
  GENERATION_INVALID_INPUT: { code: 'GENERATION_INVALID_INPUT', category: 'input', retryable: false, action: 'none' },
  GENERATION_NETWORK_ERROR: { code: 'GENERATION_NETWORK_ERROR', category: 'service', retryable: true, action: 'retry' },
  GENERATION_PROVIDER_INVALID_RESPONSE: { code: 'GENERATION_PROVIDER_INVALID_RESPONSE', category: 'provider', retryable: true, action: 'retry' },
  GENERATION_PROVIDER_UNSUPPORTED: { code: 'GENERATION_PROVIDER_UNSUPPORTED', category: 'provider', retryable: false, action: 'check-config' },
  GENERATION_TIMEOUT: { code: 'GENERATION_TIMEOUT', category: 'provider', retryable: true, action: 'retry' },
  INVALID_CREDENTIALS: { code: 'INVALID_CREDENTIALS', category: 'auth', retryable: false, action: 'none' },
  INVALID_INPUT: { code: 'INVALID_INPUT', category: 'input', retryable: false, action: 'none' },
  INVALID_OPERATION: { code: 'INVALID_OPERATION', category: 'data', retryable: false, action: 'refresh' },
  INVALID_RESET_TOKEN: { code: 'INVALID_RESET_TOKEN', category: 'auth', retryable: false, action: 'none' },
  NETWORK_ERROR: { code: 'NETWORK_ERROR', category: 'service', retryable: true, action: 'retry' },
  PASSWORD_RESET_UNAVAILABLE: { code: 'PASSWORD_RESET_UNAVAILABLE', category: 'service', retryable: false, action: 'none' },
  PLAN_NOT_FOUND: { code: 'PLAN_NOT_FOUND', category: 'billing', retryable: false, action: 'refresh' },
  PROVIDER_API_KEY_INVALID: { code: 'PROVIDER_API_KEY_INVALID', category: 'config', retryable: false, action: 'check-config' },
  PROVIDER_COMPATIBILITY_ERROR: { code: 'PROVIDER_COMPATIBILITY_ERROR', category: 'provider', retryable: false, action: 'check-config' },
  PROVIDER_API_KEY_MISSING: { code: 'PROVIDER_API_KEY_MISSING', category: 'config', retryable: false, action: 'check-config' },
  PROVIDER_CONFIG_REQUIRED: { code: 'PROVIDER_CONFIG_REQUIRED', category: 'config', retryable: false, action: 'check-config' },
  PROVIDER_MODEL_INVALID: { code: 'PROVIDER_MODEL_INVALID', category: 'config', retryable: false, action: 'check-config' },
  PROVIDER_MODEL_MISSING: { code: 'PROVIDER_MODEL_MISSING', category: 'config', retryable: false, action: 'check-config' },
  PROVIDER_RESPONSE_INVALID: { code: 'PROVIDER_RESPONSE_INVALID', category: 'provider', retryable: true, action: 'retry' },
  PROVIDER_TEST_TIMEOUT: { code: 'PROVIDER_TEST_TIMEOUT', category: 'provider', retryable: true, action: 'retry' },
  PROVIDER_UNSUPPORTED: { code: 'PROVIDER_UNSUPPORTED', category: 'provider', retryable: false, action: 'check-config' },
  PROVIDER_URL_INVALID: { code: 'PROVIDER_URL_INVALID', category: 'config', retryable: false, action: 'check-config' },
  QUOTA_EXCEEDED: { code: 'QUOTA_EXCEEDED', category: 'billing', retryable: false, action: 'none' },
  RESET_TOKEN_EXPIRED: { code: 'RESET_TOKEN_EXPIRED', category: 'auth', retryable: false, action: 'refresh' },
  RESET_TOKEN_NOT_FOUND: { code: 'RESET_TOKEN_NOT_FOUND', category: 'auth', retryable: false, action: 'refresh' },
  SESSION_NOT_FOUND: { code: 'SESSION_NOT_FOUND', category: 'data', retryable: false, action: 'refresh' },
  TASK_NOT_CANCELLABLE: { code: 'TASK_NOT_CANCELLABLE', category: 'data', retryable: false, action: 'refresh' },
  TASK_NOT_FOUND: { code: 'TASK_NOT_FOUND', category: 'data', retryable: false, action: 'refresh' },
  TEMPLATE_NOT_FOUND: { code: 'TEMPLATE_NOT_FOUND', category: 'data', retryable: false, action: 'refresh' },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', category: 'auth', retryable: false, action: 'login' },
  UNKNOWN_ERROR: { code: 'UNKNOWN_ERROR', category: 'service', retryable: false, action: 'contact-support' },
  UPSTREAM_UNAVAILABLE: { code: 'UPSTREAM_UNAVAILABLE', category: 'provider', retryable: true, action: 'retry' },
  USER_NOT_FOUND: { code: 'USER_NOT_FOUND', category: 'data', retryable: false, action: 'refresh' },
  WORK_NOT_FOUND: { code: 'WORK_NOT_FOUND', category: 'data', retryable: false, action: 'refresh' },
}

const generationCodeMap: Record<string, string> = {
  abort: 'GENERATION_ABORTED',
  'gateway-timeout': 'GENERATION_TIMEOUT',
  'http-error': 'NETWORK_ERROR',
  'interrupted': 'GENERATION_ABORTED',
  'invalid-input': 'GENERATION_INVALID_INPUT',
  'invalid-response': 'GENERATION_PROVIDER_INVALID_RESPONSE',
  network: 'GENERATION_NETWORK_ERROR',
  'provider-unsupported': 'GENERATION_PROVIDER_UNSUPPORTED',
  timeout: 'GENERATION_TIMEOUT',
  unknown: 'UNKNOWN_ERROR',
}

function isCategory(value: unknown): value is AppErrorCategory {
  return typeof value === 'string' && ['auth', 'config', 'provider', 'service', 'data', 'input', 'billing', 'export'].includes(value)
}

function isAction(value: unknown): value is AppErrorAction {
  return typeof value === 'string' && ['login', 'check-config', 'retry', 'refresh', 'contact-support', 'none'].includes(value)
}

function getCatalogDefinition(code: string) {
  return appErrorCatalog[code] ?? defaultErrorDefinition
}

function createCatalogError(code: string, message: string, overrides: Partial<Omit<AppErrorInit, 'code' | 'message'>> = {}) {
  const definition = getCatalogDefinition(code)
  return new AppError({
    code,
    message,
    category: overrides.category ?? definition.category,
    retryable: overrides.retryable ?? definition.retryable,
    action: overrides.action ?? definition.action,
    status: overrides.status,
    cause: overrides.cause,
  })
}

function mapStatusToCode(status: number) {
  if (status === 401) return 'UNAUTHORIZED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 408 || status === 425 || status === 429 || status >= 500) return 'NETWORK_ERROR'
  return 'UNKNOWN_ERROR'
}

function inferCodeFromMessage(message: string) {
  if (/请先登录|重新登录/.test(message)) return 'UNAUTHORIZED'
  if (/权限/.test(message)) return 'FORBIDDEN'
  if (/API Key|密钥/.test(message) && /无效|错误|未被接受|权限/.test(message)) return 'PROVIDER_API_KEY_INVALID'
  if (/Model|模型/.test(message) && /不存在|不可用|无效|未找到|不支持/.test(message)) return 'PROVIDER_MODEL_INVALID'
  if (/兼容|unsupported|unknown parameter|invalid parameter|标准 \/v1\/images/i.test(message)) return 'PROVIDER_COMPATIBILITY_ERROR'
  if (/Provider|API Key|Model|API URL|配置/.test(message) && /请检查|请先|补全|保存/.test(message)) return 'PROVIDER_CONFIG_REQUIRED'
  if (/超时|timeout/i.test(message)) return 'PROVIDER_TEST_TIMEOUT'
  if (/网络|CORS|Failed to fetch|无法访问/i.test(message)) return 'NETWORK_ERROR'
  if (/未解析到图片数据|响应格式/.test(message)) return 'PROVIDER_RESPONSE_INVALID'
  if (/不支持标准 \/v1\/images\/edits|不兼容/.test(message)) return 'PROVIDER_UNSUPPORTED'
  if (/额度不足|QUOTA_EXCEEDED/.test(message)) return 'QUOTA_EXCEEDED'
  if (/参考图|上传参考图|请先上传|请先选择/.test(message)) return 'INVALID_INPUT'
  if (/不能为空|必填|未填写|请输入|请填写|请选择/.test(message)) return 'INVALID_INPUT'
  return null
}

function fallbackMessageByStatus(status: number) {
  if (status === 401) return '登录状态已失效，请重新登录后继续。'
  if (status === 403) return '当前账号没有执行该操作的权限。'
  if (status === 404) return '请求的资源不存在或已被删除。'
  if (status === 408 || status === 425 || status === 429) return '请求暂时不可用，请稍后重试。'
  if (status >= 500) return '服务暂时不可用，请稍后重试。'
  return `请求失败（HTTP ${status}）。`
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export function createAppError(init: AppErrorInit) {
  return new AppError(init)
}

export function parseApiErrorPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null
  if (!('error' in payload)) return null
  const error = (payload as { error?: ApiErrorPayload }).error
  if (!error || typeof error !== 'object') return null
  return error
}

export function createAppErrorFromApi(payload: unknown, status: number) {
  const error = parseApiErrorPayload(payload)
  const code = typeof error?.code === 'string' ? error.code : mapStatusToCode(status)
  const definition = getCatalogDefinition(code)
  const message = typeof error?.message === 'string' && error.message.trim()
    ? error.message.trim()
    : fallbackMessageByStatus(status)

  return new AppError({
    code,
    message,
    category: isCategory(error?.category) ? error.category : definition.category,
    retryable: typeof error?.retryable === 'boolean' ? error.retryable : definition.retryable,
    action: isAction(error?.action) ? error.action : definition.action,
    status,
  })
}

export function createNetworkError(message = '网络请求失败，请检查当前网络或稍后重试。', cause?: unknown) {
  return createCatalogError('NETWORK_ERROR', message, { cause })
}

export function createProviderConfigError(code: 'PROVIDER_MODEL_MISSING' | 'PROVIDER_API_KEY_MISSING' | 'PROVIDER_URL_INVALID', message: string) {
  return createCatalogError(code, message)
}

export function createProviderError(
  code:
    | 'UPSTREAM_UNAVAILABLE'
    | 'PROVIDER_TEST_TIMEOUT'
    | 'PROVIDER_RESPONSE_INVALID'
    | 'PROVIDER_UNSUPPORTED'
    | 'PROVIDER_COMPATIBILITY_ERROR'
    | 'PROVIDER_API_KEY_INVALID'
    | 'PROVIDER_MODEL_INVALID'
    | 'PROVIDER_URL_INVALID'
    | 'NETWORK_ERROR',
  message: string,
  overrides: Partial<Omit<AppErrorInit, 'code' | 'message'>> = {},
) {
  return createCatalogError(code, message, overrides)
}

export function createExportError(code: 'EXPORT_FETCH_FAILED' | 'EXPORT_EMPTY_BLOB' | 'EXPORT_ZIP_FAILED', message: string, cause?: unknown) {
  return createCatalogError(code, message, { cause })
}

export function toAppError(error: unknown, fallbackMessage = '操作失败，请稍后重试。'): AppError {
  if (isAppError(error)) return error

  if (error instanceof DOMException && error.name === 'AbortError') {
    return createCatalogError('GENERATION_ABORTED', '当前请求已取消。', { cause: error })
  }

  if (error && typeof error === 'object' && 'code' in error && 'message' in error && 'retryable' in error) {
    const rawCode = typeof (error as { code?: unknown }).code === 'string' ? (error as { code: string }).code : 'UNKNOWN_ERROR'
    const code = generationCodeMap[rawCode] ?? rawCode.toUpperCase().replace(/-/g, '_')
    const message = typeof (error as { message?: unknown }).message === 'string' ? (error as { message: string }).message : fallbackMessage
    const retryable = typeof (error as { retryable?: unknown }).retryable === 'boolean'
      ? (error as { retryable: boolean }).retryable
      : getCatalogDefinition(code).retryable
    return createCatalogError(code, message, { retryable, cause: error })
  }

  if (error instanceof TypeError) {
    return createNetworkError('网络请求失败，请检查网络连接、跨域代理或稍后重试。', error)
  }

  if (error instanceof Error) {
    const statusValue = (error as Error & { status?: unknown }).status
    const status = typeof statusValue === 'number' ? statusValue : undefined
    const inferredCode = error.message ? inferCodeFromMessage(error.message) : null
    return createCatalogError(inferredCode ?? (status ? mapStatusToCode(status) : 'UNKNOWN_ERROR'), error.message || fallbackMessage, { status, cause: error })
  }

  if (typeof error === 'string' && error.trim()) {
    const message = error.trim()
    return createCatalogError(inferCodeFromMessage(message) ?? 'UNKNOWN_ERROR', message)
  }

  return createCatalogError('UNKNOWN_ERROR', fallbackMessage, { cause: error })
}

export function getErrorDisplay(error: unknown) {
  const normalized = toAppError(error)
  const title = normalized.code === 'INVALID_CREDENTIALS'
    ? '登录信息有误'
    : normalized.code === 'PROVIDER_URL_INVALID'
      ? 'Provider 地址不可用'
      : normalized.code === 'PROVIDER_API_KEY_INVALID'
        ? 'Provider 密钥无效'
        : normalized.code === 'PROVIDER_MODEL_INVALID'
          ? 'Provider 模型不可用'
          : normalized.code === 'PROVIDER_COMPATIBILITY_ERROR'
            ? 'Provider 接口不兼容'
    : normalized.action === 'login'
      ? '需要重新登录'
      : normalized.action === 'check-config'
        ? '需要检查配置'
        : normalized.category === 'billing'
          ? '额度或计费限制'
          : normalized.category === 'export'
            ? '导出失败'
            : normalized.category === 'provider'
              ? 'Provider 异常'
              : normalized.category === 'data'
                ? '数据状态异常'
                : normalized.category === 'input'
                  ? '输入内容有误'
                  : normalized.category === 'auth'
                    ? '认证状态异常'
                    : normalized.action === 'retry'
                      ? '可稍后重试'
                      : '服务处理失败'

  const message = normalized.code === 'INVALID_CREDENTIALS'
    ? '邮箱或密码不正确，请重新输入后再试。'
    : normalized.code === 'UNAUTHORIZED'
      ? '登录状态已失效，请重新登录后继续。'
      : normalized.code === 'PROVIDER_URL_INVALID'
        ? '当前 API URL、代理路径或 `/v1` 前缀不可用，请检查地址填写是否正确。'
        : normalized.code === 'PROVIDER_API_KEY_INVALID'
          ? '当前 API Key 无效、已过期，或没有访问该 Provider 的权限。'
          : normalized.code === 'PROVIDER_MODEL_INVALID'
            ? '当前模型不存在、未开通，或不属于这个 Provider。'
            : normalized.code === 'PROVIDER_COMPATIBILITY_ERROR'
              ? '当前 Provider 与标准 OpenAI Images 接口或参数不兼容，请调整代理或服务商配置。'
      : normalized.action === 'check-config'
        ? '请检查账号、Provider、模型、API URL 或密钥配置。'
        : normalized.category === 'billing'
          ? '当前额度或计费状态不可用，请检查套餐后重试。'
          : normalized.category === 'export'
            ? '导出未完成，请稍后重试。'
            : normalized.category === 'provider'
              ? 'Provider 响应异常或暂时不可用，请稍后重试。'
              : normalized.action === 'retry'
                ? '当前问题通常是临时性的，可以稍后再次尝试。'
                : normalized.action === 'refresh'
                  ? '请刷新当前页面或重新获取最新数据后再试。'
                  : normalized.category === 'input'
                    ? '请检查输入内容后重试。'
                    : normalized.category === 'data'
                      ? '数据状态已变化，请刷新后重试。'
                      : normalized.retryable
                        ? '该问题支持重试。'
                        : '如果问题持续出现，请进一步排查服务日志或联系维护人员。'

  const hint = normalized.action === 'login'
    ? '请重新登录后再继续当前操作。'
    : normalized.action === 'check-config'
      ? '请检查账号、Provider、模型、API URL 或密钥配置。'
      : normalized.action === 'retry'
        ? '当前问题通常是临时性的，可以稍后再次尝试。'
        : normalized.action === 'refresh'
          ? '请刷新当前页面或重新获取最新数据后再试。'
          : normalized.action === 'contact-support'
            ? '如果问题持续出现，请进一步排查服务日志或联系维护人员。'
            : normalized.retryable
              ? '该问题支持重试。'
              : ''

  const badges = [
    normalized.action === 'login' || normalized.code === 'INVALID_CREDENTIALS' ? '需登录' : '',
    normalized.action === 'check-config' ? '需检查配置' : '',
    normalized.action === 'retry' || normalized.retryable ? '可重试' : '',
    normalized.category === 'billing' ? '额度/计费' : '',
    normalized.category === 'provider' ? 'Provider' : '',
    normalized.category === 'export' ? '导出' : '',
    normalized.category === 'data' ? '数据状态' : '',
    normalized.category === 'input' ? '输入错误' : '',
  ].filter(Boolean)

  return {
    code: normalized.code,
    message,
    title,
    hint,
    retryable: normalized.retryable,
    status: normalized.status,
    badges,
  }
}
