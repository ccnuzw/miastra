# 云端部署运行手册

这份手册只描述当前云端项目的交付标准：如何准备环境、初始化数据库、执行发布门禁、部署前端与 Fastify，以及发布后如何验收。

## 1. 交付边界

当前仓库由三部分组成：

- 前端：根目录 React + Vite，构建产物输出到 `dist/`
- API：`server/` 下的 Fastify，构建产物输出到 `server/dist/`
- 数据：Postgres

必须明确的部署边界：

- 仓库内 `Dockerfile` 和 `docker-compose.yml` 只负责前端静态站点容器。
- Fastify 需要单独构建和启动。
- 生产入口必须把 `/api` 路由到 Fastify。
- 如果沿用仓库内 Nginx 容器，`/sub2api` 仍由该容器转发到上游代理路径。

缺少 `/api` 反向代理时，登录、任务、作品、模板、Provider 配置、Billing、Admin 等页面都会失效。

## 2. 环境变量

统一以项目根目录 `.env` 为主，示例见 [../.env.example](../.env.example)。

### 2.1 服务端必填

- `SERVER_STORE_BACKEND=postgres`
- `DATABASE_URL`
- `AUTH_JWT_SECRET`
- `RESET_JWT_SECRET`

### 2.2 服务端常用可选项

- `PORT`
  - Fastify 监听端口，默认 `18081`
- `BILLING_MODE`
  - `disabled` / `mock` / `real`
  - 当前交付默认建议 `disabled`
- `PROVIDER_UPSTREAM_ORIGIN`
  - Provider API URL 留空时使用的默认云端上游
- `GENERATION_WORKER_INTERVAL_MS`
- `GENERATION_WORKER_CONCURRENCY`
- `GENERATION_PROXY_ORIGIN`

### 2.3 本地开发代理

仅在 `npm run dev` 的 Vite 开发服务器里生效：

- `VITE_API_PROXY_TARGET`
- `VITE_SUB2API_PROXY_TARGET`

### 2.4 前端静态容器

仅在使用仓库自带前端 Nginx 镜像时需要：

- `NGINX_PORT`
- `CLIENT_MAX_BODY_SIZE`
- `SUB2API_PROXY_TARGET`
- `PROXY_CONNECT_TIMEOUT`
- `PROXY_SEND_TIMEOUT`
- `PROXY_READ_TIMEOUT`
- `SEND_TIMEOUT`

## 3. 初始化新环境

### 3.1 安装依赖

```bash
npm ci
npm --prefix server ci
```

### 3.2 准备环境变量

```bash
cp .env.example .env
```

至少确认：

- `SERVER_STORE_BACKEND=postgres`
- `DATABASE_URL` 指向可访问的 Postgres
- `AUTH_JWT_SECRET` 和 `RESET_JWT_SECRET` 已替换为强随机值

### 3.3 初始化数据库

```bash
npm run init:db
```

该命令会完成：

- 建表和补齐核心 schema
- 初始化配额表
- 创建或刷新首个管理员账号

默认管理员：

- 账号：`admin`
- 邮箱：`admin@miastra.local`
- 密码：`admin123`

如果是开发或测试环境，需要演示数据时再执行：

```bash
npm --prefix server run db:seed
```

`db:seed` 会重建示例数据，不应用于正式生产环境。

## 4. 本地开发启动

终端 1：

```bash
npm --prefix server run dev
```

终端 2：

```bash
npm run dev
```

本地检查点：

- 前端：`http://127.0.0.1:5173`
- 健康检查：`http://127.0.0.1:18081/health`
- 存储检查：`http://127.0.0.1:18081/health/store`

## 5. 发布前自动化门禁

当前标准入口只有三条：

```bash
npm run test:smoke
npm run test:regression
npm run release:check
```

建议使用方式：

- 日常自测：`npm run test:smoke`
- 全量回归或定位问题：`npm run test:regression`
- 发版前统一门禁：`npm run release:check`

`npm run release:check` 会顺序执行：

```bash
test:smoke -> test:regression -> build -> build:server
```

服务端测试固定使用 `NODE_ENV=test`、`SERVER_STORE_BACKEND=json`，因此自动化门禁不会依赖外部数据库状态。

## 6. 云端发布步骤

### 6.1 执行门禁

```bash
npm run release:check
```

自动化通过后，再按 [release-regression.md](./release-regression.md) 完成手工 smoke。

### 6.2 构建前端

```bash
npm run build
```

如果沿用仓库内前端镜像：

```bash
docker build -t miastra-studio:latest .
```

也可以继续使用：

```bash
docker compose up -d --build
```

但要注意，这只会启动前端静态站点容器。

### 6.3 构建并启动 Fastify

```bash
npm run build:server
NODE_ENV=production npm --prefix server run start
```

线上环境可接入你们自己的 `systemd`、`pm2`、容器编排或 PaaS 进程管理。

### 6.4 配置入口路由

至少需要满足以下规则：

- `/` -> 前端静态站点
- `/api` -> Fastify
- `/sub2api` -> Provider 代理路径（如仍启用）

### 6.5 首次上线数据库初始化

新环境第一次上线前，必须在可访问目标数据库的环境执行：

```bash
npm run init:db
```

数据库已初始化过的环境，不需要在每次发布重复执行。

## 7. 发布后验收

### 7.1 健康检查

```bash
curl http://127.0.0.1:18081/health
curl http://127.0.0.1:18081/health/store
```

确认点：

- `/health` 返回 `ok`
- `/health/store` 返回的 `backend` 为 `postgres`

### 7.2 最小手工 smoke

至少确认以下链路：

- 登录、登出、会话刷新正常
- Provider 配置可保存，未配置时提交任务会被明确阻断
- 任务可进入列表，状态能正常更新
- 作品页可搜索、收藏、删除和预览
- ZIP 导出成功，`metadata.json` 不包含敏感字段

完整清单见 [release-regression.md](./release-regression.md)。
