# 发布回归说明

这份文档定义 Miastra Studio 当前版本的发布回归入口。目标不是堆大量脆弱测试，而是在不依赖真实外部 Provider 的前提下，优先拦截高频回归，并把发版前的自动化与手工检查收敛到少数几个稳定命令。

## 自动化命令入口

当前发布相关的三个命令：

```bash
npm run test:smoke
npm run test:regression
npm run release:check
```

建议使用方式：

- `npm run test:smoke`
  - 最小高价值门禁
  - 适合日常自测、修复高风险问题后快速回归
- `npm run test:regression`
  - 全量前后端自动化回归
  - 适合定位问题时单独执行
- `npm run release:check`
  - 标准发版入口
  - 顺序执行 `smoke -> regression -> 前后端构建`

说明：

- 发版前优先执行 `npm run release:check`
- `release:check` 已经包含 `smoke` 和 `regression`，不要在它前面机械重复跑同一套命令，除非你在定位失败原因

## 当前自动化覆盖范围

当前自动化覆盖以下高风险链路：

- 认证登录态
  - 注册后自动建会话
  - `/api/auth/me` 会话识别
  - `revoke-others` 后旧会话失效
  - `logout` 后登录态清空
- 作品存储与展示基础行为
  - 本地 legacy 作品迁移
  - 大 payload 分批导入与超大 data URL 降级
  - 作品读取时本地资源回填
  - 作品保存时超大 inline 图片剥离
  - 作品搜索、标签、收藏、批次筛选
- ZIP 导出
  - ZIP 结构生成
  - metadata 计数、文件映射、失败原因
  - generation snapshot 脱敏
  - 空 blob / 缺图兜底
- 任务列表基础状态流转
  - 未配置 Provider 时禁止建任务
  - 已登录用户创建任务
  - `queued -> running -> succeeded` 更新
  - 终态任务禁止取消
- 迁移兼容
  - 服务端 works 导入与读取
  - legacy `favorite/isFavorite`、`tags`、`src` roundtrip

## 当前未纳入发布阻断的项

以下检查目前没有并入 `release:check`：

- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm run typecheck:server`

原因不是这些项不重要，而是仓库当前仍有历史基线问题。直接并入会让发布门禁长期红灯，失去拦截高频回归的价值。

建议后续补一轮基线治理，再把这些检查重新纳入发布阻断。

## 手工 Smoke 的执行前提

执行手工 smoke 前，至少确认：

- 前端已可访问
- 服务端 `/health` 与 `/health/store` 正常
- 如果要验证真实生成，已准备可用 Provider 账号或预发布测试环境
- 如果没有真实 Provider，也至少要验证“未配置 Provider 时阻断”这条兜底链路

## 手工 Smoke Checklist

### 认证

- 注册新账号后自动进入登录态
- 刷新页面后，受保护页面仍保持登录态
- 登出后再次访问 `/app/*` 会被拦回登录页
- 同账号二次登录后，在账号页执行“撤销其他会话”，旧标签页刷新后应失效

### Provider

- 打开设置，保存 Provider API Key 与 Model 后无异常报错
- Provider API URL 留空时，前端能继续走 `/sub2api` 或服务端回退代理
- 未配置 Provider 时提交任务，应得到明确阻断提示

### 作品

- 新建或导入作品后，作品页可正常展示标题、元信息、标签、收藏状态
- 作品页搜索可命中标题、Prompt、标签、模型、状态等关键词
- 收藏筛选、标签筛选、清空筛选行为正常
- 删除单个作品、批量删除作品后，列表与预览状态同步更新
- 刷新页面后，作品与本地资源回填正常，没有大量丢图

### 导出

- 在作品墙选择 1 到 3 个作品执行 ZIP 导出
- ZIP 能解压，图片文件名可读，没有明显非法字符
- 勾选 metadata 时，压缩包中包含 `metadata.json`
- `metadata.json` 中计数、标题、标签、收藏信息与页面一致
- `metadata.json` 中不应出现 `apiKey`、`authorization`、`password`、`secret` 等敏感字段

### 任务

- 配置 Provider 后，提交任务可进入任务列表
- 任务状态至少能覆盖 `queued/running/succeeded` 或 `queued/running/failed`
- 已结束任务点击取消时应给出不可取消提示，不应假装成功

### 迁移兼容

- 如果本地还留有 legacy works 数据，首次登录后应自动迁移，不应重复导入
- 含大 data URL 的旧作品迁移后，作品基础信息必须保留；图片缺失时应能从本地资源缓存回填

## 推荐发布节奏

### 日常开发自测

```bash
npm run test:smoke
```

### 合并前或发版前

```bash
npm run release:check
```

命令通过后，再执行上面的手工 smoke。

### 仅在定位失败时

```bash
npm run test:regression
```

## 为什么当前没有 Playwright 门禁

之前已经尝试过 Playwright，但当前仓库环境依赖还不完整。现阶段如果强行引入，会让发布门禁依赖浏览器安装、系统库和外部环境，稳定性反而下降。

当前替代方案：

- 前端使用 `vitest + jsdom` 覆盖作品筛选、导出与存储逻辑
- 服务端使用 `fastify.inject()` 覆盖认证、作品、迁移、任务主链路
- 剩余不适合在当前环境稳定自动化的浏览器交互，使用上面的手工 smoke checklist 兜底

等 Playwright 依赖链补齐后，再补一个真正可运行的 browser smoke，而不是保留一套跑不稳的伪门禁。

## 失败后先看哪里

- 认证失败
  - `server/src/auth/routes.ts`
  - `src/features/auth/useAuthSession.tsx`
  - `src/shared/http/client.ts`
- 作品读写或迁移失败
  - `src/features/works/works.storage.ts`
  - `src/features/works/useWorksGallery.ts`
  - `server/src/works/routes.ts`
  - `server/src/migrations/routes.ts`
- ZIP 导出或 metadata 异常
  - `src/shared/utils/download.ts`
  - `src/shared/utils/download.metadata.ts`
  - `src/shared/utils/download.file.ts`
- 任务状态流转异常
  - `src/features/generation/generation.api.ts`
  - `server/src/generation-tasks/routes.ts`

## 当前 smoke 用例清单

客户端：

- `src/shared/http/client.test.ts`
- `src/shared/storage/browserDatabase.test.ts`
- `src/shared/utils/download.metadata.test.ts`
- `src/shared/utils/download.zip.test.ts`
- `src/features/works/works.storage.test.ts`
- `src/features/works/useWorksGallery.test.ts`

服务端：

- `server/src/server.test.ts`
- `server/src/release.regression.test.ts`
