# 系统架构总览

这份文档用于回答三个问题：

- 当前项目由哪些运行单元组成
- 请求和数据在系统里怎么流动
- 新功能应该落到哪个目录和哪一层

## 1. 系统组成

当前云端项目由三部分组成：

- 前端：React + Vite，负责页面、交互、上传、导出和状态展示
- API：Fastify，负责认证、业务路由、运行时检查、Provider 代理和权限控制
- 数据层：Postgres，负责用户、会话、作品、模板、任务、账单等持久化

补充运行单元：

- generation worker：随 Fastify 进程启动，轮询队列并推进任务状态
- Nginx 静态站点容器：仅负责前端静态资源和 `/sub2api` 辅助代理

## 2. 运行时拓扑

浏览器访问路径：

- `/login`、`/register`、`/forgot-password`
- `/app/studio`
- `/app/templates`
- `/app/works`
- `/app/tasks`
- `/app/account`
- `/app/providers`
- `/app/billing`
- `/app/admin`

服务端关键入口：

- `/health`
- `/ready`
- `/health/store`
- `/api/*`
- `/api/provider-proxy/*`

生产部署要求：

- `/` 指向前端静态站点
- `/api` 指向 Fastify
- Postgres 可被 Fastify 访问

## 3. 前端结构

前端主要目录：

- `src/pages/`
  - 页面级组件，直接对应路由
- `src/features/`
  - 业务模块，按能力拆分
- `src/layouts/`
  - 页面骨架和登录态外壳
- `src/routes/`
  - 路由表与权限路由
- `src/shared/`
  - HTTP、错误、工具函数、通用逻辑

当前主要 feature：

- `auth`
- `provider`
- `generation`
- `works`
- `prompt-templates`
- `draw-card`
- `admin`
- `studio`
- `references`

前端入口流程：

1. `src/main.tsx` 挂载 React
2. `src/App.tsx` 注入 `BrowserRouter`
3. `src/routes/AppRouter.tsx` 定义登录页、应用页和管理员页路由
4. 各页面从 `features` 调用 API 并管理交互

## 4. 服务端结构

服务端主要目录：

- `server/src/server.ts`
  - Fastify 入口、全局中间件、健康检查、路由注册
- `server/src/auth/`
  - 登录、注册、密码、会话、鉴权
- `server/src/provider-config/`
  - Provider 配置、默认上游解析、公共 Provider 管理
- `server/src/provider-proxy/`
  - 代理图片生成和图生图请求到上游 Provider
- `server/src/generation-tasks/`
  - 任务创建、更新、取消、重试、worker
- `server/src/works/`
  - 作品管理
- `server/src/prompt-templates/`
  - 模板管理
- `server/src/draw-batches/`
  - 批次重跑和批次摘要
- `server/src/billing/`
  - 套餐、额度、账单
- `server/src/admin/`
  - 管理台接口、角色与策略
- `server/src/lib/`
  - store、domain-store、HTTP 包装、审计日志、仓储实现

## 5. 关键数据流

### 5.1 登录态

1. 前端调用 `/api/auth/login`
2. Fastify 校验账号或邮箱与密码
3. 服务端创建 session，并通过 cookie 写入认证令牌
4. 前端后续通过 `/api/auth/me` 恢复登录态

### 5.2 生成任务

1. 前端整理 prompt、尺寸、模型、参考图
2. 调用 `/api/generation-tasks`
3. 服务端先校验登录态与 Provider 配置，再写入 `queued` 任务
4. worker 轮询任务并通过 `/api/provider-proxy/*` 请求上游
5. 成功后写回任务结果，并同步作品与批次状态

### 5.3 作品管理

1. 前端通过 `/api/works` 拉取用户作品
2. 修改收藏、标签、删除等行为都走 `/api/works/*`
3. 服务端按 `userId` 隔离内容数据

### 5.4 发布检查

1. 自动化门禁调用 `test:smoke`
2. 再执行 `test:regression`
3. 最后执行前后端构建

## 6. 存储层设计

运行时默认存储：

- 生产与标准交付：Postgres
- 自动化测试：JSON store

存储抽象位置：

- `server/src/lib/store.ts`
- `server/src/lib/store.repository.ts`

设计目标：

- 业务代码尽量通过 domain-store 读写
- 存储后端可切换，但 API 和业务语义保持一致
- 测试运行不依赖外部数据库

## 7. 健康检查与启动保护

启动前：

- `assertRuntimeReady()` 会检查存储后端、数据库连接、认证密钥等关键项

运行中：

- `/health`：运行时配置健康度
- `/ready`：服务可读写就绪态
- `/health/store`：存储后端和核心数据计数

## 8. 代码落点建议

新增功能时优先按下面的边界放置：

- 新页面：`src/pages/`
- 页面下的业务逻辑：`src/features/`
- 通用前端能力：`src/shared/`
- 新 API 路由：`server/src/<module>/routes.ts`
- 跨路由的服务或规则：`server/src/<module>/` 或 `server/src/lib/`
- 新数据结构：先定义服务端存储形态，再决定前端映射

## 9. 当前已知边界

- 仓库内前端容器不会启动 Fastify
- `/sub2api` 是辅助代理路径，不是主业务 API
- 管理台依赖服务端角色校验，前端只做补充拦截
- `release:check` 是当前唯一自动化发布阻断门禁
