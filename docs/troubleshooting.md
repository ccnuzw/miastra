# 常见问题排查

这份文档只处理当前项目最常见、最容易卡住新成员的问题。

## 1. 前端能打开，但登录和业务页面都报错

现象：

- 页面能访问
- 登录失败
- `/api/*` 全部报错或 404

优先检查：

- Fastify 是否已启动
- 前端开发环境下 `VITE_API_PROXY_TARGET` 是否正确
- 生产环境下 `/api` 是否已反向代理到 Fastify

快速检查：

```bash
curl http://127.0.0.1:18081/health
```

## 2. 服务启动失败，提示认证密钥未配置

现象：

- Fastify 启动即退出
- 日志提示 `AUTH_JWT_SECRET` 或 `RESET_JWT_SECRET` 未配置

原因：

- 生产模式下这两个变量是强制要求

处理：

- 在根目录 `.env` 中补齐强随机值

## 3. 服务启动失败，提示 `DATABASE_URL` 缺失

现象：

- 启动失败
- 日志提示 `SERVER_STORE_BACKEND=postgres` 时必须提供 `DATABASE_URL`

处理：

- 检查 `.env` 是否已设置 `SERVER_STORE_BACKEND=postgres`
- 检查 `DATABASE_URL` 是否可用

## 4. 服务启动失败，提示 `connect ECONNREFUSED 127.0.0.1:5432`

现象：

- 执行 `npm --prefix server run dev` 后立刻退出
- 日志里出现 `Postgres 存储已启用` 和 `connect ECONNREFUSED 127.0.0.1:5432`

原因：

- 当前 `.env` 已要求使用本地 Postgres
- 但 `127.0.0.1:5432` 没有正在运行的数据库实例

处理：

```bash
npm run db:up
npm run init:db
npm --prefix server run dev
```

如果 `npm run db:up` 提示 Docker 未启动：

- 先启动 Docker Desktop
- 或将根目录 `.env` 的 `DATABASE_URL` 改成你本机已可访问的 Postgres

常用辅助命令：

```bash
npm run db:ps
npm run db:logs
npm run db:down
```

## 5. `/health` 正常，但 `/health/store` 失败

现象：

- `/health` 可返回
- `/health/store` 返回失败或 503

原因通常是：

- Postgres 无法连通
- schema 未初始化
- 存储读写失败

处理顺序：

1. 检查 `DATABASE_URL`
2. 确认数据库实例可访问
3. 执行 `npm run init:db`
4. 再次请求 `/health/store`

## 6. 首次登录管理员失败

现象：

- 刚初始化完数据库，管理员无法登录

先确认：

- 是否已经执行 `npm run init:db`
- 登录时使用的是账号 `admin` 或邮箱 `admin@miastra.local`
- 密码是否为 `admin123`

如果仍失败：

- 重新执行一次 `npm run init:db`
- 检查服务是否连接到了你期望的数据库实例

## 7. Provider API URL 保存失败

现象：

- 保存 Provider 配置时报 `PROVIDER_URL_INVALID`

常见原因：

- 使用了相对路径
- 漏了 `http://` 或 `https://`
- 填成了错误的基础路径

处理：

- 填完整云端基址
- 如果希望使用服务端默认上游，可以留空 `apiUrl`，并配置 `PROVIDER_UPSTREAM_ORIGIN`

## 8. 提交任务时报 Provider 未配置

现象：

- 创建任务时报 `PROVIDER_CONFIG_REQUIRED` 或相关阻断错误

处理：

1. 登录后进入 Provider 设置页
2. 保存 `mode`、`model`、`apiKey`
3. 如果是自定义 Provider，再确认 `apiUrl`
4. 重新请求 `/api/provider-config/resolve`

## 9. `release:check` 失败

排查顺序：

1. 看失败在 `test:smoke`、`test:regression`、`build` 还是 `build:server`
2. 如果是测试失败，先定位对应模块
3. 如果是构建失败，检查类型或导入路径
4. 若改动涉及接口、环境变量或发布流程，确认文档是否同步

补充说明：

- `release:check` 的服务端测试不依赖真实 Postgres
- 如果门禁失败，不需要先怀疑数据库环境

## 10. CI 通过，本地 `lint` 或 `typecheck` 失败

原因：

- 当前 CI 只跑 `release:check`
- 本地协作标准比 CI 更严格

处理：

- 按 [../CONTRIBUTING.md](../CONTRIBUTING.md) 补跑 `lint`、`format:check`、`typecheck`、`typecheck:server`

## 11. Nginx 容器启动了，但业务还是不可用

原因：

- 仓库内 `Dockerfile` 和 `docker-compose.yml` 只覆盖前端静态站点
- 它们不会启动 Fastify

处理：

- 单独构建并启动 Fastify
- 在入口层把 `/api` 代理到 Fastify

## 12. 如何快速判断问题在哪一层

建议按这个顺序看：

1. 前端页面是否可访问
2. `/health` 是否正常
3. `/health/store` 是否正常
4. `/api/auth/me` 是否返回登录态
5. `/api/provider-config/resolve` 是否返回可用 Provider
6. 创建任务是否能进入 `queued`

## 13. 最常用排查命令

```bash
curl http://127.0.0.1:18081/health
curl http://127.0.0.1:18081/ready
curl http://127.0.0.1:18081/health/store
npm run db:up
npm run db:logs
npm run test:smoke
npm run test:regression
npm run release:check
```
