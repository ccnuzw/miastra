# 发布回归与门禁说明

这份文档定义当前云端项目的发布门禁、自动化回归范围和手工 smoke 标准。目标只有一个：让新成员拿到仓库后，能明确知道发布前必须跑什么、自动化覆盖了什么、剩下哪些项需要人工确认。

## 1. 标准命令

当前发布相关命令只有三条：

```bash
npm run test:smoke
npm run test:regression
npm run release:check
```

命令职责：

- `npm run test:smoke`
  - 最小高价值门禁
  - 适合日常自测、修复高风险问题后的快速回归
- `npm run test:regression`
  - 完整前后端自动化回归
  - 适合定位问题或在合并前做全量确认
- `npm run release:check`
  - 标准发版入口
  - 顺序执行 `smoke -> regression -> build -> build:server`

发版前直接执行 `npm run release:check` 即可，不需要再手动重复跑一遍 `test:smoke` 或 `test:regression`。

## 2. 当前门禁定义

### 2.1 Smoke Gate

`npm run test:smoke` 由以下两部分组成：

- 客户端高价值 smoke 用例
- 服务端 `src/server.test.ts` 与 `src/release.regression.test.ts`

它的目标不是覆盖所有细节，而是优先拦截以下高频回归：

- 认证与会话
- 作品读写与作品墙筛选
- ZIP 导出与 `metadata.json`
- 任务创建、状态流转和终态限制

### 2.2 Regression Gate

`npm run test:regression` 执行完整前后端自动化测试：

- `npm run test:client`
- `npm run test:server`

这条命令适合在以下场景使用：

- 大范围改动后做全量确认
- smoke 失败后定位更深层问题
- 合并前补一次完整自动化验证

### 2.3 Release Gate

`npm run release:check` 是当前唯一的自动化发布阻断门禁，执行顺序固定为：

```bash
npm run test:smoke
npm run test:regression
npm run build
npm run build:server
```

只要这条命令失败，就不应进入发布阶段。

## 3. 自动化覆盖范围

当前自动化覆盖的高风险主链路包括：

- 认证
  - 注册后建会话
  - `/api/auth/me` 识别登录态
  - 登出与撤销其他会话
- Provider 与运行时配置
  - Provider 配置保存
  - 默认上游和运行时检查
  - 未配置 Provider 时的阻断反馈
- 任务流转
  - 已登录用户创建任务
  - `queued -> running -> succeeded`
  - 终态任务不可取消
- 作品管理
  - 作品保存、读取、筛选、收藏、删除
  - 云端展示状态恢复
- 导出
  - ZIP 结构
  - `metadata.json` 统计与脱敏
  - 缺图、空文件等异常兜底

## 4. 门禁运行环境

自动化测试默认不依赖真实云端数据库，也不依赖生产 Provider：

- 服务端测试固定使用 `NODE_ENV=test`
- 服务端测试固定使用 `SERVER_STORE_BACKEND=json`

这意味着：

- `test:smoke`
- `test:regression`
- `release:check`

都可以在本地或 CI 里直接运行，不需要先准备 Postgres 或真实上游密钥。

## 5. 不属于发布阻断的检查

以下命令当前仍保留为工程质量检查，但不属于自动化发布阻断：

- `npm run typecheck`
- `npm run typecheck:server`
- `npm run lint`
- `npm run format:check`

建议在较大改动或合并前额外执行，但当前发布门禁的准入标准仍以 `npm run release:check` 为准。

## 6. 发布前手工 Smoke

自动化通过后，还需要做一次最小手工 smoke，确认真实部署链路没有偏差。

### 6.1 环境前提

至少确认：

- 前端可访问
- `/api` 已经正确路由到 Fastify
- `/health` 与 `/health/store` 正常
- 若要验证真实生图，准备可用 Provider 账号或预发布环境

### 6.2 必做清单

认证：

- 注册新账号后自动进入登录态
- 刷新页面后会话仍有效
- 登出后再次访问受保护页面会被拦回登录页

Provider：

- 保存 Provider API URL、Model、API Key 无异常
- 留空 API URL 时，如配置了 `PROVIDER_UPSTREAM_ORIGIN`，仍可正常走默认上游
- 未配置 Provider 时，提交任务会得到明确阻断提示

任务：

- 创建任务后能进入任务列表
- 状态至少覆盖一次 `queued -> running -> succeeded` 或 `queued -> running -> failed`
- 已结束任务点击取消时不会假装成功

作品：

- 作品页能看到标题、标签、收藏状态和关键元信息
- 搜索、标签筛选、收藏筛选和删除行为正常
- 刷新后作品仍可正常读取

导出：

- 导出 1 到 3 个作品的 ZIP
- ZIP 可解压
- `metadata.json` 内容与页面一致
- `metadata.json` 中不应出现 `apiKey`、`authorization`、`password`、`secret` 等敏感字段

## 7. 失败后优先排查位置

- 认证或登录态异常
  - `server/src/auth/routes.ts`
  - `src/features/auth/useAuthSession.tsx`
  - `src/shared/http/client.ts`
- Provider 配置或代理异常
  - `server/src/provider-config/provider.service.ts`
  - `server/src/provider-proxy/routes.ts`
  - `src/features/provider/useProviderConfig.ts`
- 任务状态流转异常
  - `server/src/generation-tasks/routes.ts`
  - `server/src/generation-tasks/worker.ts`
  - `src/features/generation/`
- 作品或导出异常
  - `server/src/works/routes.ts`
  - `src/features/works/`
  - `src/shared/utils/download.ts`
  - `src/shared/utils/download.metadata.ts`

## 8. 当前 smoke 入口清单

客户端 smoke 入口：

- `src/shared/http/client.test.ts`
- `src/shared/utils/download.metadata.test.ts`
- `src/shared/utils/download.zip.test.ts`
- `src/features/works/works.storage.test.ts`
- `src/features/works/useWorksGallery.test.ts`

服务端 smoke 入口：

- `server/src/server.test.ts`
- `server/src/release.regression.test.ts`
