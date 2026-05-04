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
type ServerErrorDisplayDefinition = {
  message: string
}

const defaultServerErrorDefinition: ServerErrorDefinition = {
  category: 'service',
  retryable: false,
  action: 'contact-support',
}

const serverErrorCatalog: Record<string, ServerErrorDefinition> = {
  BILLING_CHECKOUT_UNAVAILABLE: { category: 'billing', retryable: false, action: 'none' },
  BATCH_NOT_FOUND: { category: 'data', retryable: false, action: 'refresh' },
  BATCH_TASKS_NOT_FOUND: { category: 'data', retryable: false, action: 'refresh' },
  EMAIL_ALREADY_EXISTS: { category: 'data', retryable: false, action: 'none' },
  FORBIDDEN: { category: 'auth', retryable: false, action: 'none' },
  INVALID_CREDENTIALS: { category: 'auth', retryable: false, action: 'none' },
  INVALID_INPUT: { category: 'input', retryable: false, action: 'none' },
  INVALID_OPERATION: { category: 'data', retryable: false, action: 'refresh' },
  INVALID_RESET_TOKEN: { category: 'auth', retryable: false, action: 'none' },
  PASSWORD_RESET_UNAVAILABLE: { category: 'service', retryable: false, action: 'none' },
  PLAN_NOT_FOUND: { category: 'billing', retryable: false, action: 'refresh' },
  PROVIDER_API_KEY_INVALID: { category: 'config', retryable: false, action: 'check-config' },
  PROVIDER_API_KEY_MISSING: { category: 'config', retryable: false, action: 'check-config' },
  PROVIDER_CONFIG_REQUIRED: { category: 'config', retryable: false, action: 'check-config' },
  PROVIDER_MODEL_INVALID: { category: 'config', retryable: false, action: 'check-config' },
  PROVIDER_MODEL_MISSING: { category: 'config', retryable: false, action: 'check-config' },
  PROVIDER_RESPONSE_INVALID: { category: 'provider', retryable: true, action: 'retry' },
  PROVIDER_TEST_TIMEOUT: { category: 'provider', retryable: true, action: 'retry' },
  PROVIDER_UNSUPPORTED: { category: 'provider', retryable: false, action: 'check-config' },
  PROVIDER_URL_INVALID: { category: 'config', retryable: false, action: 'check-config' },
  QUOTA_EXCEEDED: { category: 'billing', retryable: false, action: 'none' },
  QUOTA_NOT_FOUND: { category: 'billing', retryable: false, action: 'refresh' },
  RESET_TOKEN_EXPIRED: { category: 'auth', retryable: false, action: 'refresh' },
  RESET_TOKEN_NOT_FOUND: { category: 'auth', retryable: false, action: 'refresh' },
  SESSION_NOT_FOUND: { category: 'data', retryable: false, action: 'refresh' },
  TASK_INVALID_STATUS_TRANSITION: { category: 'data', retryable: false, action: 'refresh' },
  TASK_NOT_CANCELLABLE: { category: 'data', retryable: false, action: 'refresh' },
  TASK_NOT_FOUND: { category: 'data', retryable: false, action: 'refresh' },
  TASK_NOT_RETRYABLE: { category: 'data', retryable: false, action: 'refresh' },
  TEMPLATE_NOT_FOUND: { category: 'data', retryable: false, action: 'refresh' },
  UNAUTHORIZED: { category: 'auth', retryable: false, action: 'login' },
  UPSTREAM_UNAVAILABLE: { category: 'provider', retryable: true, action: 'retry' },
  USER_DISABLED: { category: 'auth', retryable: false, action: 'none' },
  USER_FROZEN: { category: 'auth', retryable: false, action: 'none' },
  USER_NOT_FOUND: { category: 'data', retryable: false, action: 'refresh' },
  WORK_NOT_FOUND: { category: 'data', retryable: false, action: 'refresh' },
}

const serverErrorDisplayCatalog: Record<string, ServerErrorDisplayDefinition> = {
  BILLING_CHECKOUT_UNAVAILABLE: { message: '当前环境未启用支付能力，请切换到可用模式后再试。' },
  BATCH_NOT_FOUND: { message: '该批次不存在或已被删除。' },
  BATCH_TASKS_NOT_FOUND: { message: '该批次没有可复跑的任务记录。' },
  EMAIL_ALREADY_EXISTS: { message: '该邮箱已被注册，请使用其他邮箱或直接登录。' },
  FORBIDDEN: { message: '当前账号没有执行该操作的权限。' },
  INVALID_CREDENTIALS: { message: '邮箱或密码不正确，请重新输入后再试。' },
  INVALID_INPUT: { message: '请检查输入内容后重试。' },
  INVALID_OPERATION: { message: '当前操作无法继续，请刷新后重试。' },
  INVALID_RESET_TOKEN: { message: '重置令牌不正确，请重新申请。' },
  PASSWORD_RESET_UNAVAILABLE: { message: '当前环境未启用密码重置能力。' },
  PLAN_NOT_FOUND: { message: '请求的套餐不存在，请刷新后重试。' },
  PROVIDER_API_KEY_INVALID: { message: '当前 API Key 无效、已过期或没有访问该 Provider 的权限。' },
  PROVIDER_API_KEY_MISSING: { message: '请先补全 Provider API Key 后再继续。' },
  PROVIDER_CONFIG_REQUIRED: { message: '请检查账号、Provider、模型、API URL 或密钥配置。' },
  PROVIDER_MODEL_INVALID: { message: '当前模型不存在、未开通，或不属于这个 Provider。' },
  PROVIDER_MODEL_MISSING: { message: '请先填写 Model 再继续。' },
  PROVIDER_RESPONSE_INVALID: { message: 'Provider 返回了无法解析的响应，请稍后重试。' },
  PROVIDER_TEST_TIMEOUT: { message: '测试连接超过预期时长，请稍后重试。' },
  PROVIDER_UNSUPPORTED: { message: '当前上游未开放该图片接口，或请求参数不被接受。' },
  PROVIDER_URL_INVALID: { message: '当前 API URL 不可用，请填写完整云端基址。' },
  QUOTA_EXCEEDED: { message: '当前额度或计费状态不可用，请检查套餐后重试。' },
  QUOTA_NOT_FOUND: { message: '额度档案不存在，请刷新后重试。' },
  RESET_TOKEN_EXPIRED: { message: '重置令牌已过期，请重新申请。' },
  RESET_TOKEN_NOT_FOUND: { message: '重置请求不存在或已失效，请重新申请。' },
  SESSION_NOT_FOUND: { message: '会话不存在或已失效，请刷新后重试。' },
  TASK_INVALID_STATUS_TRANSITION: { message: '当前任务状态不允许这样变更，请刷新后重试。' },
  TASK_NOT_CANCELLABLE: { message: '任务已结束，无法取消。' },
  TASK_NOT_FOUND: { message: '任务不存在或已被删除，请刷新后重试。' },
  TASK_NOT_RETRYABLE: { message: '当前任务状态不支持重试，请刷新后重试。' },
  TEMPLATE_NOT_FOUND: { message: '模板不存在或已被删除，请刷新后重试。' },
  UNAUTHORIZED: { message: '登录状态已失效，请重新登录后继续。' },
  UPSTREAM_UNAVAILABLE: { message: '上游服务暂时不可用，请稍后重试。' },
  USER_NOT_FOUND: { message: '用户不存在或已被删除，请刷新后重试。' },
  WORK_NOT_FOUND: { message: '作品不存在或已被删除，请刷新后重试。' },
}

function getDefinition(code: string) {
  return serverErrorCatalog[code] ?? defaultServerErrorDefinition
}

function getDisplayMessage(code: string, message?: string) {
  return serverErrorDisplayCatalog[code]?.message ?? (message?.trim() || getDisplayMessageFallback(code))
}

function getDisplayMessageFallback(code: string) {
  const definition = getDefinition(code)
  if (definition.action === 'login') return '请重新登录后再继续当前操作。'
  if (definition.action === 'check-config') return '请检查账号、Provider、模型、API URL 或密钥配置。'
  if (definition.action === 'retry') return '当前问题通常是临时性的，可以稍后再次尝试。'
  if (definition.action === 'refresh') return '请刷新当前页面或重新获取最新数据后再试。'
  if (definition.action === 'contact-support') return '如果问题持续出现，请进一步排查服务日志或联系维护人员。'
  if (definition.retryable) return '该问题支持重试。'
  return '操作失败，请稍后重试。'
}

export function buildServerError(code: string, message?: string): ServerErrorPayload {
  const definition = getDefinition(code)
  return {
    code,
    message: getDisplayMessage(code, message),
    category: definition.category,
    retryable: definition.retryable,
    action: definition.action,
  }
}
