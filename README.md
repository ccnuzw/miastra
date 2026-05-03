# Miastra Studio

Miastra Studio 是一个面向图片创作的 AI Image Studio，当前仓库包含：

- 前端：React + Vite
- 后端：Fastify
- 存储：默认 JSON，可切换到 Postgres

这份 README 只保留新成员最需要的启动、构建、测试和发布入口。更完整的部署说明见 [docs/deployment-runbook.md](./docs/deployment-runbook.md)，发布回归说明见 [docs/release-regression.md](./docs/release-regression.md)。

## 运行前提

- Node.js `>= 20.19.0`
- npm `>= 10`
- 本地默认端口：
  - 前端：`5173`
  - 服务端：`18081`
  - 可选 Postgres：`5432`

## 快速开始

默认推荐先用 JSON 存储跑通本地环境，不需要额外数据库。

```bash
npm install
npm --prefix server install
cp .env.example .env
```

启动服务端：

```bash
npm --prefix server run dev
```

另开一个终端启动前端：

```bash
npm run dev
```

启动后访问：

- 前端：`http://127.0.0.1:5173`
- 服务端健康检查：`http://127.0.0.1:18081/health`
- 服务端存储健康检查：`http://127.0.0.1:18081/health/store`

说明：

- 项目根目录 `.env` 会同时被前端和服务端读取。
- `server/.env` 仅在你需要覆盖服务端变量时再创建。
- 根目录 `npm run dev` 只启动前端，不会自动带起 Fastify。

## 可选：切换到 Postgres

先启动本地数据库：

```bash
docker compose -f docker-compose.db.yml up -d
```

然后修改根目录 `.env`：

```env
SERVER_STORE_BACKEND=postgres
DATABASE_URL=postgresql://miastra:miastra@127.0.0.1:5432/miastra
```

初始化表结构：

```bash
npm --prefix server run db:init
```

如需导入演示数据：

```bash
npm --prefix server run db:seed
```

默认演示账号：

- 管理员：`admin@miastra.local / secret123`
- 普通用户：`demo@miastra.local / secret123`

## 常用命令

### 本地开发

```bash
npm run dev
npm --prefix server run dev
```

### 构建

```bash
npm run build
npm run build:server
```

前端构建产物在 `dist/`，服务端构建产物在 `server/dist/`。

### 测试与回归

```bash
npm run test:smoke
npm run test:regression
npm run release:check
```

命令含义：

- `npm run test:smoke`：最小高价值回归，适合日常自测。
- `npm run test:regression`：完整前后端自动化回归。
- `npm run release:check`：发布前统一门禁，会顺序执行 `smoke -> regression -> 前后端构建`。

### 质量检查

```bash
npm run typecheck
npm run typecheck:server
npm run lint
npm run format:check
```

## 环境变量

环境变量以根目录 [.env.example](./.env.example) 为准，已经按用途分组：

- 前端开发代理：`VITE_API_PROXY_TARGET`、`VITE_SUB2API_PROXY_TARGET`
- 服务端运行：`PORT`、`SERVER_STORE_BACKEND`、`DATABASE_URL`
- Provider / 任务：`PROVIDER_UPSTREAM_ORIGIN`、`GENERATION_*`
- 认证 / Billing：`AUTH_JWT_SECRET`、`RESET_JWT_SECRET`、`AUTH_PASSWORD_RESET_MODE`、`BILLING_MODE`
- 前端静态容器 / Nginx：`SUB2API_PROXY_TARGET`、`NGINX_PORT`、`CLIENT_MAX_BODY_SIZE`、`PROXY_*`
- Postgres Compose：`POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_PORT`

生产环境至少需要确认：

- `NODE_ENV=production`
- `AUTH_JWT_SECRET`、`RESET_JWT_SECRET` 已替换为强随机值
- `AUTH_PASSWORD_RESET_MODE=disabled`
- `BILLING_MODE=disabled` 或显式 `mock`

## 发布与部署

推荐发版前流程：

1. 执行 `npm run release:check`
2. 按 [docs/release-regression.md](./docs/release-regression.md) 完成手工 smoke
3. 按 [docs/deployment-runbook.md](./docs/deployment-runbook.md) 发布前端与服务端

当前仓库的部署边界必须注意：

- 仓库内 `Dockerfile` 和 `docker-compose.yml` 只负责前端静态站点容器。
- Fastify 服务需要单独构建和启动。
- 生产流量必须把 `/api` 反向代理到 Fastify；否则登录、作品、任务、模板等功能都不可用。

## 文档索引

- [docs/README.md](./docs/README.md)
- [docs/deployment-runbook.md](./docs/deployment-runbook.md)
- [docs/release-regression.md](./docs/release-regression.md)
