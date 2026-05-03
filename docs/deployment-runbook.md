# 部署运行手册

这份手册面向后续维护和交付，目标是把“怎么启动、怎么配置、怎么发布”收敛成一套可直接执行的说明。

## 交付边界

当前仓库分成两部分：

- 前端：根目录 React + Vite，构建产物输出到 `dist/`
- 后端：`server/` 下的 Fastify，构建产物输出到 `server/dist/`

当前仓库自带的部署文件只覆盖前端静态站点：

- `Dockerfile`
- `docker-compose.yml`
- `docker/nginx/default.conf.template`

这几个文件会启动一个 Nginx 容器，负责：

- 提供前端静态资源
- 代理 `/sub2api`

它们不会负责：

- 启动 Fastify
- 代理 `/api`

因此生产环境必须额外保证：

- Fastify 服务已独立启动
- `/api` 已由网关、Ingress、Nginx 或 LB 反向代理到 Fastify

如果漏掉 `/api`，登录、作品、任务、模板、Provider 配置、Billing、Admin 等功能都会失效。

## 环境变量分组

统一以根目录 `.env` 为主，示例见 [../.env.example](../.env.example)。

### 前端开发代理

只在 `npm run dev` 的 Vite 开发服务器里生效：

- `VITE_API_PROXY_TARGET`
  - 默认 `http://127.0.0.1:18081`
  - 控制 `/api` 代理到本地 Fastify
- `VITE_SUB2API_PROXY_TARGET`
  - 默认 `http://127.0.0.1:18080`
  - 控制 `/sub2api` 代理到上游 Provider

### 服务端运行

- `PORT`
  - Fastify 监听端口，默认 `18081`
- `SERVER_STORE_BACKEND`
  - `json` 或 `postgres`
  - 本地默认 `json`
- `DATABASE_URL`
  - 仅在 `SERVER_STORE_BACKEND=postgres` 时必填
- `PROVIDER_UPSTREAM_ORIGIN`
  - 当用户保存的 Provider API URL 留空时，服务端代理会回退到这里
- `GENERATION_WORKER_INTERVAL_MS`
- `GENERATION_WORKER_CONCURRENCY`
- `GENERATION_PROXY_ORIGIN`
  - 当前 generation worker 代码为轻量保留实现，通常无需调整

### 认证与 Billing

- `AUTH_JWT_SECRET`
- `RESET_JWT_SECRET`
  - 生产环境必须显式设置，且应为强随机值
- `AUTH_PASSWORD_RESET_MODE`
  - `disabled` 或 `debug`
  - 生产环境会强制关闭 `debug` 暴露
- `BILLING_MODE`
  - `disabled` / `mock` / `real`
  - 当前仓库未接入真实支付，生产建议使用 `disabled`

### 前端静态容器 / Nginx

由 `docker-compose.yml` 使用：

- `NGINX_PORT`
- `CLIENT_MAX_BODY_SIZE`
- `SUB2API_PROXY_TARGET`
- `PROXY_CONNECT_TIMEOUT`
- `PROXY_SEND_TIMEOUT`
- `PROXY_READ_TIMEOUT`
- `SEND_TIMEOUT`

注意这里的 `SUB2API_PROXY_TARGET` 是给生产 Nginx 用的，不是 Vite 开发服务器使用的 `VITE_SUB2API_PROXY_TARGET`。

### Postgres Compose

由 `docker-compose.db.yml` 使用：

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`

## 本地开发

### 默认模式：JSON 存储

```bash
npm install
npm --prefix server install
cp .env.example .env
```

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
- 服务端健康检查：`http://127.0.0.1:18081/health`
- 服务端存储检查：`http://127.0.0.1:18081/health/store`

### 可选模式：Postgres 存储

启动数据库：

```bash
docker compose -f docker-compose.db.yml up -d
```

修改 `.env`：

```env
SERVER_STORE_BACKEND=postgres
DATABASE_URL=postgresql://miastra:miastra@127.0.0.1:5432/miastra
```

初始化数据库：

```bash
npm --prefix server run db:init
```

可选导入演示数据：

```bash
npm --prefix server run db:seed
```

如果需要重新清空库结构，可再使用：

```bash
npm --prefix server run db:reset
```

## 构建与发布前检查

### 构建命令

```bash
npm run build
npm run build:server
```

### 自动化回归入口

```bash
npm run test:smoke
npm run test:regression
npm run release:check
```

建议用法：

- 日常自测：`npm run test:smoke`
- 合并前或发版前：`npm run release:check`
- 仅在定位问题时单独跑：`npm run test:regression`

`npm run release:check` 已经包含 `smoke -> regression -> build`，不需要在它前面再重复跑一遍 `test:regression`。

## 生产发布步骤

### 1. 准备依赖与环境变量

安装依赖：

```bash
npm ci
npm --prefix server ci
```

准备生产环境至少需要确认：

- `NODE_ENV=production`
- `AUTH_JWT_SECRET`、`RESET_JWT_SECRET` 已替换
- `AUTH_PASSWORD_RESET_MODE=disabled`
- `BILLING_MODE=disabled` 或显式 `mock`
- 如果使用 Postgres，`SERVER_STORE_BACKEND=postgres` 且 `DATABASE_URL` 可连通

### 2. 执行发布前门禁

```bash
npm run release:check
```

通过后再进入发布。

### 3. 构建前端静态资源

```bash
npm run build
docker compose up -d --build
```

默认会把前端站点暴露到本机 `8080` 端口。

### 4. 构建并启动 Fastify

```bash
npm run build:server
NODE_ENV=production npm --prefix server run start
```

如果线上不是前台进程，请把这一步接到你们自己的 `systemd`、`pm2`、Supervisor 或容器编排里。

### 5. 配置反向代理

生产入口至少需要满足以下路由：

- `/` -> 前端静态站点
- `/sub2api` -> 上游 Provider 代理
- `/api` -> Fastify 服务

如果沿用仓库里的前端容器：

- `/` 与 `/sub2api` 由前端 Nginx 容器承接
- `/api` 仍需额外配置到 Fastify

### 6. 发布后健康检查

```bash
curl http://127.0.0.1:18081/health
curl http://127.0.0.1:18081/health/store
```

如果是 Postgres 存储，还要确认 `/health/store` 返回的 `backend` 为 `postgres`。

## 发布后 Smoke Checklist

最少确认以下链路：

- 前端首页可访问，静态资源无 404
- 注册 / 登录 / 登出正常
- Provider 配置可保存
- 未配置 Provider 时，提交任务能收到明确阻断提示
- 作品墙可读写、筛选、收藏、删除
- ZIP 导出包含预期文件，`metadata.json` 不含敏感字段

完整 checklist 见 [release-regression.md](./release-regression.md)。
