# 贡献指南

## 目标

这份文档定义当前仓库的本地协作标准。它比 CI 更严格，目的是在进入 `release:check` 之前尽量把问题挡在本地。

## 开发前

- 复制 `.env.example` 为根目录 `.env`
- 确认 `SERVER_STORE_BACKEND=postgres`
- 确认 `DATABASE_URL`、`AUTH_JWT_SECRET`、`RESET_JWT_SECRET` 已配置
- 首次运行前执行 `npm run init:db`

## 常用命令

- 前端开发：`npm run dev`
- 服务端开发：`npm --prefix server run dev`
- 最小回归：`npm run test:smoke`
- 全量自动化：`npm run test:regression`
- 发布门禁：`npm run release:check`

## 提交前最小要求

- 跑与改动直接相关的测试
- 运行 `npm run test:smoke`
- 如果改动跨多个模块或涉及服务端主链路，再运行 `npm run test:regression`
- 如果改动影响发版路径，运行 `npm run release:check`

## 提交前推荐全量检查

- 运行 `npm run lint`
- 运行 `npm run format:check`
- 运行 `npm run typecheck`
- 运行 `npm run typecheck:server`
- 运行 `npm test`
- 运行 `npm run build`
- 运行 `npm run build:server`

## 代码风格

- 优先沿用现有 feature 分层。
- 只做必要改动，不做无关重构。
- 新增逻辑优先补测试。
- 新增路由、环境变量、发布步骤或门禁时，同步更新文档。

## 文档要求

以下改动默认必须同步文档：

- 环境变量变化
- API 路由变化
- 测试命令变化
- 发布门禁变化
- 部署边界变化

## 安全要求

- 不要把长期密钥写进前端代码或本地持久化。
- 涉及认证、会话、存储和下载逻辑时，优先检查输入与输出边界。
- 生产环境必须显式配置 `AUTH_JWT_SECRET` 和 `RESET_JWT_SECRET`。
