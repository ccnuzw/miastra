import type { DataStore } from './auth/types'
import { getBillingConfig, getBillingMode } from './runtime-config'
import { getStoreRuntimeInfo, readStore } from './lib/store'
import { getPostgresRepositories } from './lib/store'

export type RuntimeCheckStatus = 'ok' | 'degraded' | 'fail'

export type RuntimeCheckItem = {
  id: string
  label: string
  status: RuntimeCheckStatus
  message: string
  details?: Record<string, unknown>
}

export type RuntimeCheckReport = {
  status: RuntimeCheckStatus
  runtimeMode: 'production' | 'development' | 'test'
  store: ReturnType<typeof getStoreRuntimeInfo>
  snapshot: DataStore | null
  checks: RuntimeCheckItem[]
}

function isProduction() {
  return process.env.NODE_ENV === 'production'
}

function isTest() {
  return process.env.NODE_ENV === 'test'
}

function buildCheckMessage(items: RuntimeCheckItem[]) {
  return items
    .filter((item) => item.status !== 'ok')
    .map((item) => item.message)
    .join('；')
}

function buildRuntimeFailureMessage(report: RuntimeCheckReport) {
  const summary = buildCheckMessage(report.checks) || '运行时检查失败'
  const databaseCheck = report.checks.find((item) => item.id === 'database')

  if (
    report.runtimeMode === 'development'
    && report.store.isPostgres
    && databaseCheck?.status === 'fail'
  ) {
    return `${summary}；请先执行 "npm run db:up" 启动本地 Postgres；首次初始化环境后再执行 "npm run init:db"`
  }

  return summary
}

export async function probeRuntimeChecks(): Promise<RuntimeCheckReport> {
  const storeInfo = getStoreRuntimeInfo()
  const checks: RuntimeCheckItem[] = []

  const authSecret = process.env.AUTH_JWT_SECRET?.trim() ?? ''
  const resetSecret = process.env.RESET_JWT_SECRET?.trim() ?? ''
  const billing = getBillingConfig()
  const providerUpstream = process.env.PROVIDER_UPSTREAM_ORIGIN?.trim() ?? ''
  const hasAuthSecrets = Boolean(authSecret && resetSecret)

  checks.push({
    id: 'store-backend',
    label: '存储后端',
    status: !storeInfo.valid ? 'fail' : (storeInfo.isPostgres && !process.env.DATABASE_URL?.trim() ? 'fail' : 'ok'),
    message: !storeInfo.valid
      ? storeInfo.error ?? '存储后端配置无效'
      : (storeInfo.isPostgres ? 'Postgres 存储已启用' : 'JSON 存储已启用'),
    details: {
      backend: storeInfo.backend,
      rawBackend: storeInfo.rawBackend,
    },
  })

  checks.push({
    id: 'database',
    label: '数据库连通性',
    status: storeInfo.isPostgres ? 'degraded' : 'ok',
    message: storeInfo.isPostgres ? 'Postgres 连接待探测' : '当前未使用数据库',
  })

  checks.push({
    id: 'auth-secret',
    label: '认证密钥',
    status: hasAuthSecrets ? 'ok' : (isProduction() ? 'fail' : 'degraded'),
    message: hasAuthSecrets
      ? '认证密钥已配置'
      : (isProduction()
          ? 'AUTH_JWT_SECRET 或 RESET_JWT_SECRET 未配置'
          : '开发环境将使用默认认证密钥，生产环境必须配置 AUTH_JWT_SECRET 和 RESET_JWT_SECRET'),
  })

  checks.push({
    id: 'billing-mode',
    label: '计费模式',
    status: billing.mode === 'real' && isProduction() ? 'degraded' : 'ok',
    message: `Billing 模式：${getBillingMode()}`,
  })

  checks.push({
    id: 'provider-upstream',
    label: '默认上游',
    status: providerUpstream || !isProduction() ? 'ok' : 'degraded',
    message: providerUpstream ? '默认上游已配置' : '未配置 PROVIDER_UPSTREAM_ORIGIN',
  })

  if (storeInfo.isPostgres && process.env.DATABASE_URL?.trim()) {
    try {
      const { pool } = getPostgresRepositories()
      await pool.query('SELECT 1')
      checks[0].status = 'ok'
      checks[1].status = 'ok'
      checks[1].message = 'Postgres 连接正常'
    } catch (error) {
      checks[0].status = 'fail'
      checks[1].status = 'fail'
      checks[1].message = error instanceof Error ? error.message : 'Postgres 连接失败'
    }
  }

  const fatal = checks.some((item) => item.status === 'fail')
  const degraded = checks.some((item) => item.status === 'degraded')

  return {
    status: fatal ? 'fail' : (degraded ? 'degraded' : 'ok'),
    runtimeMode: isProduction() ? 'production' : (isTest() ? 'test' : 'development'),
    store: storeInfo,
    snapshot: null,
    checks,
  }
}

export async function assertRuntimeReady() {
  const report = await probeRuntimeChecks()
  if (report.status === 'fail') {
    throw new Error(buildRuntimeFailureMessage(report))
  }
  return report
}

export async function checkStoreReadiness() {
  const report = await probeRuntimeChecks()
  const storeCheck = report.checks.find((item) => item.id === 'store-backend')

  let snapshot: DataStore | null = null
  try {
    snapshot = await readStore()
  } catch (error) {
    return {
      ...report,
      status: 'fail' as const,
      snapshot: null,
      checks: report.checks.map((item) => item.id === 'database'
        ? {
            ...item,
            status: 'fail' as const,
            message: error instanceof Error ? error.message : '读取存储失败',
          }
        : item),
    }
  }

  return {
    ...report,
    snapshot,
    checks: report.checks.map((item) => {
      if (item.id !== 'database') return item
      if (!report.store.isPostgres) {
        return {
          ...item,
          status: 'ok',
          message: '当前未使用数据库',
        }
      }
      return item.status === 'degraded'
        ? {
            ...item,
            status: 'ok',
            message: 'Postgres 连接正常',
          }
        : item
    }),
    status: report.status === 'degraded' && storeCheck?.status === 'ok' ? 'ok' : report.status,
  }
}
