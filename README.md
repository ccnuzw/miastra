# Miastra Studio

Miastra Studio 是一个云端 AI 图片创作项目，交付形态为：

- 前端：React + Vite
- API：Fastify
- 持久化：Postgres

当前文档统一按云端项目交付口径编写，只保留当前可执行的初始化、启动、测试和发布说明。

## 交付边界

- 生产环境必须同时部署前端静态站点和 Fastify API。
- `/api` 必须反向代理到 Fastify，否则登录、作品、任务、模板、Provider 配置等核心能力不可用。
- 项目默认以 `SERVER_STORE_BACKEND=postgres` 运行。
- 发布前自动化门禁以 `npm run release:check` 为准。

## 运行前提

- Node.js `>= 20.19.0`
- npm `>= 10`
- 一套可访问的 Postgres 实例
- Docker Desktop 或其他可用的 Docker daemon

本地开发默认端口：

- 前端：`5173`
- API：`18081`

## 初始化新环境

安装依赖：

```bash
npm ci
npm --prefix server ci
```

复制环境变量模板：

```bash
cp .env.example .env
```

至少补齐以下变量：

- `SERVER_STORE_BACKEND=postgres`
- `DATABASE_URL`
- `AUTH_JWT_SECRET`
- `RESET_JWT_SECRET`

初始化数据库结构和首个管理员：

```bash
npm run db:up
npm run init:db
```

初始化完成后会创建默认管理员：

- 账号：`admin`
- 邮箱：`admin@miastra.local`
- 密码：`admin123`

这组账号只用于新环境首登和验收，首次登录后应立即改密。

如果需要演示数据，仅在开发或测试环境执行：

```bash
npm --prefix server run db:seed
```

## 本地启动

先启动本地 Postgres：

```bash
npm run db:up
```

然后任选一种方式启动 Fastify：

```bash
npm run dev:server
```

或者：

```bash
npm --prefix server run dev
```

终端 2，启动 Vite：

```bash
npm run dev
```

启动后检查：

- 前端：`http://127.0.0.1:5173`
- 服务健康检查：`http://127.0.0.1:18081/health`
- 存储健康检查：`http://127.0.0.1:18081/health/store`

说明：

- 根目录 `.env` 会同时提供给前端开发代理和服务端运行时使用。
- `server/.env` 只在你需要覆盖服务端变量时再创建。
- `npm run dev` 只启动前端开发服务器，不会自动带起 Fastify。
- `npm run dev:server` 会先确保仓库内的本地 Postgres 容器就绪，再启动 Fastify。
- 如果 `npm run db:up` 提示 Docker 未启动，请先拉起 Docker Desktop，或把 `.env` 中 `DATABASE_URL` 指向你自己的 Postgres。

本地数据库常用命令：

```bash
npm run db:up
npm run db:ps
npm run db:logs
npm run db:down
```

## 测试与发布门禁

当前三个标准入口：

```bash
npm run test:smoke
npm run test:regression
npm run release:check
```

命令含义：

- `npm run test:smoke`：最小高价值自动化门禁，适合日常自测和高风险修复后回归。
- `npm run test:regression`：完整前后端自动化回归，适合定位问题或合并前确认。
- `npm run release:check`：标准发版入口，顺序执行 `smoke -> regression -> build -> build:server`。

补充说明：

- 发版前直接执行 `npm run release:check` 即可，不需要手动重复跑一遍 `test:smoke` 或 `test:regression`。
- 服务端测试会强制使用 `NODE_ENV=test`、`SERVER_STORE_BACKEND=json`，因此自动化门禁不依赖外部 Postgres 或线上数据状态。

## 常用命令

开发：

```bash
npm run dev
npm --prefix server run dev
```

构建：

```bash
npm run build
npm run build:server
```

质量检查：

```bash
npm run typecheck
npm run typecheck:server
npm run lint
npm run format:check
```

## 环境变量

环境变量模板见 [.env.example](./.env.example)。当前仅保留云端项目运行和交付需要的内容。

服务端必填：

- `SERVER_STORE_BACKEND`
- `DATABASE_URL`
- `AUTH_JWT_SECRET`
- `RESET_JWT_SECRET`

服务端常用可选项：

- `PORT`
- `BILLING_MODE`
- `PROVIDER_UPSTREAM_ORIGIN`
- `GENERATION_WORKER_INTERVAL_MS`
- `GENERATION_WORKER_CONCURRENCY`
- `GENERATION_PROXY_ORIGIN`

开发代理可选项：

- `VITE_API_PROXY_TARGET`
- `VITE_SUB2API_PROXY_TARGET`

仅在使用仓库内前端 Nginx 镜像时需要：

- `NGINX_PORT`
- `CLIENT_MAX_BODY_SIZE`
- `SUB2API_PROXY_TARGET`
- `PROXY_CONNECT_TIMEOUT`
- `PROXY_SEND_TIMEOUT`
- `PROXY_READ_TIMEOUT`
- `SEND_TIMEOUT`

## 发布流程

推荐顺序：

1. 确认生产环境变量已就绪，尤其是 `DATABASE_URL`、`AUTH_JWT_SECRET`、`RESET_JWT_SECRET`。
2. 执行 `npm run release:check`。
3. 按 [docs/release-regression.md](./docs/release-regression.md) 完成手工 smoke。
4. 按 [docs/deployment-runbook.md](./docs/deployment-runbook.md) 发布前端和 Fastify。
5. 发布后检查 `/health` 与 `/health/store`。

## 部署结论

仓库内现有 `Dockerfile` 和 `docker-compose.yml` 只负责前端静态站点容器，不会启动 Fastify。

因此生产部署必须额外保证：

- Fastify 已独立构建和启动
- `/api` 已路由到 Fastify
- Postgres 可从 Fastify 所在环境正常访问

## 文档索引

- [docs/architecture-overview.md](./docs/architecture-overview.md)
- [docs/api-overview.md](./docs/api-overview.md)
- [docs/data-model.md](./docs/data-model.md)
- [docs/development-workflow.md](./docs/development-workflow.md)
- [docs/deployment-runbook.md](./docs/deployment-runbook.md)
- [docs/release-regression.md](./docs/release-regression.md)
- [docs/testing-strategy.md](./docs/testing-strategy.md)
- [docs/troubleshooting.md](./docs/troubleshooting.md)
- [docs/current-project-status.md](./docs/current-project-status.md)
- [docs/README.md](./docs/README.md)
