# Miastra Studio 当前项目状态

## 项目结论

截至 2026-05-03，Miastra Studio 已进入“云端交付可用”阶段。

当前判断依据：

- 前端、Fastify API、Postgres 存储已经形成完整运行闭环
- 初始化、启动、测试、发布入口已统一到仓库文档和脚本
- 发布前自动化门禁已经明确为 `test:smoke`、`test:regression`、`release:check`

## 当前交付形态

- 前端：React + Vite
- API：Fastify
- 持久化：Postgres
- 发布边界：前端静态站点与 Fastify 分离部署

当前项目已经按云端交付标准定义和维护。

## 已交付能力

- 账号与会话
  - 注册、登录、登出、会话识别、撤销其他会话
- Provider 配置
  - API URL、Model、API Key 保存
  - 默认上游回退
  - `/sub2api` 辅助代理
- 创作与任务
  - 文生图、图生图、多参考图
  - 队列创建、状态流转、取消、重试
- 作品管理
  - 作品墙、搜索、标签、收藏、批量选择、删除
  - 参数快照和批次信息回看
- 导出
  - 单图导出
  - ZIP 导出
  - `metadata.json` 脱敏输出
- 运维与发布
  - 数据库初始化脚本
  - 健康检查与存储检查
  - smoke / regression / release 自动化门禁

## 当前交付标准

新成员只看仓库文档，应能完成以下动作：

- 按 `.env.example` 准备环境变量
- 执行 `npm run init:db`
- 启动前端和 Fastify
- 执行 `npm run test:smoke`
- 执行 `npm run test:regression`
- 执行 `npm run release:check`
- 按部署手册发布前端和 API

## 已知边界

- 仓库内 `Dockerfile` 和 `docker-compose.yml` 只负责前端静态站点，不负责 Fastify。
- 生产环境必须额外提供 `/api` 到 Fastify 的反向代理。
- 生产环境必须显式配置 `AUTH_JWT_SECRET`、`RESET_JWT_SECRET` 和 `DATABASE_URL`。
- 自动化发布门禁当前不包含 `lint`、`format:check`、`typecheck`、`typecheck:server`。

## 当前推荐阅读顺序

1. [../README.md](../README.md)
2. [deployment-runbook.md](./deployment-runbook.md)
3. [release-regression.md](./release-regression.md)
4. [architecture-overview.md](./architecture-overview.md)
5. [api-overview.md](./api-overview.md)
6. [data-model.md](./data-model.md)
7. [development-workflow.md](./development-workflow.md)
8. [testing-strategy.md](./testing-strategy.md)
9. [troubleshooting.md](./troubleshooting.md)

看完以上文档，已经足够完成初始化、启动、联调、测试和发布。
