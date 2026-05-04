import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'

const composeArgs = ['compose', '-f', 'docker-compose.db.yml']
const composeService = 'postgres'
const containerName = 'miastra-postgres'
const defaultPort = process.env.POSTGRES_PORT?.trim() || '5432'

function printUsage() {
  console.log('用法：node scripts/local-postgres.mjs <up|down|logs|ps>')
}

function runSync(args, options = {}) {
  return spawnSync('docker', args, {
    stdio: 'inherit',
    ...options,
  })
}

function readSync(args) {
  return spawnSync('docker', args, {
    stdio: 'pipe',
    encoding: 'utf8',
  })
}

function ensureDockerCompose() {
  const result = readSync(['compose', 'version'])
  if (result.status === 0) return
  const stderr = result.stderr?.trim() || result.stdout?.trim() || '未检测到 docker compose'
  throw new Error(`无法执行 docker compose：${stderr}`)
}

function ensureDockerDaemon() {
  const result = readSync(['info'])
  if (result.status === 0) return
  const stderr = result.stderr?.trim() || result.stdout?.trim() || 'Docker daemon 未运行'
  throw new Error(`Docker 未启动：${stderr}。请先启动 Docker Desktop，或自行提供可访问的 Postgres 实例。`)
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForHealthy(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const result = readSync(['inspect', '--format', '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}', containerName])
    const status = result.status === 0 ? result.stdout.trim() : ''

    if (status === 'healthy' || status === 'running') {
      return
    }

    await sleep(1_000)
  }

  throw new Error(`本地 Postgres 在 ${timeoutMs / 1000} 秒内未就绪，请执行 "npm run db:logs" 查看容器日志。`)
}

async function up() {
  ensureDockerCompose()
  ensureDockerDaemon()
  const result = runSync([...composeArgs, 'up', '-d', composeService])
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

  process.stdout.write('等待本地 Postgres 就绪...\n')
  await waitForHealthy()
  process.stdout.write(`本地 Postgres 已就绪：127.0.0.1:${defaultPort}\n`)
}

function down() {
  ensureDockerCompose()
  ensureDockerDaemon()
  const result = runSync([...composeArgs, 'down'])
  process.exit(result.status ?? 0)
}

function logs() {
  ensureDockerCompose()
  ensureDockerDaemon()
  const child = spawn('docker', [...composeArgs, 'logs', '-f', composeService], {
    stdio: 'inherit',
  })
  child.on('exit', (code) => {
    process.exit(code ?? 0)
  })
}

function ps() {
  ensureDockerCompose()
  ensureDockerDaemon()
  const result = runSync([...composeArgs, 'ps'])
  process.exit(result.status ?? 0)
}

const command = process.argv[2]

if (!command) {
  printUsage()
  process.exit(1)
}

try {
  if (command === 'up') {
    await up()
  } else if (command === 'down') {
    down()
  } else if (command === 'logs') {
    logs()
  } else if (command === 'ps') {
    ps()
  } else {
    printUsage()
    process.exit(1)
  }
} catch (error) {
  const message = error instanceof Error ? error.message : '本地 Postgres 操作失败'
  console.error(message)
  process.exit(1)
}
