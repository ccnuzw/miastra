export type PasswordResetMode = 'disabled' | 'debug'
export type BillingRuntimeMode = 'disabled' | 'mock' | 'real'

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production'
}

function normalizeEnumValue<T extends string>(value: string | undefined, allowedValues: readonly T[], fallback: T) {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return fallback
  return allowedValues.includes(normalized as T) ? (normalized as T) : fallback
}

export function getPasswordResetMode(): PasswordResetMode {
  if (isProductionRuntime()) return 'disabled'

  return normalizeEnumValue(
    process.env.AUTH_PASSWORD_RESET_MODE,
    ['disabled', 'debug'] as const,
    'debug',
  )
}

export function getPasswordResetConfig() {
  const mode = getPasswordResetMode()

  if (mode === 'debug') {
    return {
      mode,
      requestAvailable: true,
      debugTokenAvailable: true,
      notice: '当前环境处于开发调试模式。提交邮箱后会返回调试令牌，仅供本地开发使用。',
    }
  }

  return {
    mode,
    requestAvailable: false,
    debugTokenAvailable: false,
    notice: '当前环境未启用找回密码邮件发送，无法发起重置请求。',
  }
}

export function getBillingMode(): BillingRuntimeMode {
  return normalizeEnumValue(
    process.env.BILLING_MODE,
    ['disabled', 'mock', 'real'] as const,
    isProductionRuntime() ? 'disabled' : 'mock',
  )
}

export function getBillingConfig() {
  const mode = getBillingMode()

  if (mode === 'mock') {
    return {
      mode,
      checkoutEnabled: true,
      isDemo: true,
      notice: '当前环境为 Billing 演示模式。升级和续费只会写入模拟账单并调整额度，不会发起真实扣款。',
    }
  }

  if (mode === 'real') {
    return {
      mode,
      checkoutEnabled: false,
      isDemo: false,
      notice: '当前环境声明为真实支付模式，但服务端尚未接入真实支付网关，已禁止下单。',
    }
  }

  return {
    mode,
    checkoutEnabled: false,
    isDemo: false,
    notice: '当前环境未启用在线支付，Billing 页面仅用于查看额度和历史账单。',
  }
}

export function getQuotaExceededMessage() {
  const billing = getBillingConfig()

  if (billing.mode === 'mock') {
    return '额度不足，请前往 Billing 演示模式手动补充测试额度。'
  }

  if (billing.mode === 'real') {
    return '额度不足，当前环境尚未接入真实支付通道，请联系管理员处理。'
  }

  return '额度不足，当前环境未启用在线支付，请联系管理员处理。'
}
