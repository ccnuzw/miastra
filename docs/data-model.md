# 数据模型总览

这份文档描述当前项目的核心实体、字段语义和存储边界，重点是帮助开发理解：

- 哪些数据是按用户隔离的
- 哪些字段是任务、作品、模板之间的关联键
- 哪些数据是主存储，哪些只是浏览器展示缓存

## 1. 存储后端

当前有两种存储实现：

- Postgres：标准运行时与生产环境
- JSON store：自动化测试和部分隔离场景

业务层通过统一 store 抽象访问数据，不直接依赖某一种后端。

## 2. 核心实体

| 实体 | 作用 | 关键关联 |
|---|---|---|
| `users` | 用户主表 | `sessions`、`providerConfigs`、`works`、`promptTemplates`、`generationTasks`、`drawBatches`、`quotaProfiles`、`billingInvoices` |
| `sessions` | 登录会话 | `userId -> users.id` |
| `promptTemplates` | Prompt 模板 | `userId -> users.id` |
| `works` | 作品资产 | `userId -> users.id`，可关联 `batchId`、`snapshotId` |
| `providerConfigs` | 用户 Provider 配置 | `userId -> users.id` |
| `managedProviders` | 公共 Provider 配置 | 可被多个用户引用 |
| `drawBatches` | 批量生成批次 | `userId -> users.id`，与任务通过 `batchId` 关联 |
| `generationTasks` | 生成任务 | `userId -> users.id`，结果可关联 `workId` |
| `auditLogs` | 审计日志 | `actorUserId -> users.id` |
| `quotaProfiles` | 额度档案 | `userId -> users.id` |
| `billingInvoices` | 账单 | `userId -> users.id` |

## 3. 用户与会话

### `users`

主要字段：

- `id`
- `email`
- `nickname`
- `role`
- `passwordHash`
- `createdAt`
- `updatedAt`
- `passwordResetToken`
- `passwordResetExpiresAt`

说明：

- 登录时支持邮箱或昵称
- 后台权限以 `role` 为准

### `sessions`

主要字段：

- `id`
- `userId`
- `createdAt`
- `expiresAt`
- `revokedAt`

说明：

- 当前登录态基于 cookie + session 记录
- 撤销其他会话、本会话登出、本用户全会话撤销都依赖这个实体

## 4. 内容资产

### `promptTemplates`

主要字段：

- `id`
- `userId`
- `title`
- `content`
- `category`
- `tags`
- `createdAt`
- `updatedAt`
- `lastUsedAt`

### `works`

主要字段：

- `id`
- `userId`
- `title`
- `src`
- `assetId`
- `assetStorage`
- `assetSyncStatus`
- `assetRemoteKey`
- `assetRemoteUrl`
- `meta`
- `batchId`
- `drawIndex`
- `taskStatus`
- `retryCount`
- `createdAt`
- `mode`
- `providerModel`
- `size`
- `quality`
- `snapshotId`
- `generationSnapshot`
- `promptSnippet`
- `promptText`
- `isFavorite`
- `tags`

说明：

- `src` 是前端展示时最常用的图片来源
- `assetRemoteUrl` 和 `assetRemoteKey` 用于远端资源标识
- `batchId` 用来把作品归到某一批量生成结果
- `snapshotId` 和 `generationSnapshot` 用于回看当时生成参数

## 5. Provider 配置

### `providerConfigs`

主要字段：

- `userId`
- `mode`
- `providerId`
- `managedProviderId`
- `apiUrl`
- `model`
- `apiKey`
- `updatedAt`

说明：

- `mode` 取值为 `managed` 或 `custom`
- 用户可以直接保存自定义上游，也可以绑定公共 Provider

### `managedProviders`

主要字段：

- `id`
- `name`
- `description`
- `apiUrl`
- `apiKey`
- `models`
- `defaultModel`
- `enabled`
- `updatedAt`

说明：

- 这是管理员维护的公共 Provider 列表
- 普通用户在 `managed` 模式下引用它

## 6. 任务与批次

### `generationTasks`

主要字段：

- `id`
- `userId`
- `status`
- `progress`
- `errorMessage`
- `payload`
- `result`
- `createdAt`
- `updatedAt`

状态集合：

- `pending`
- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`
- `timeout`

`payload` 中的重要结构：

- 生成模式、标题、prompt、模型、尺寸、质量
- `referenceImages`
- `tracking`
- `draw`

`tracking` 用于描述：

- 根任务 ID
- 父任务 ID
- 当前重试次数
- 是否来自手工恢复

`draw` 用于描述：

- 抽卡数量
- 并发度
- 延迟与重试
- 超时
- 批次 ID
- 当前槽位索引

### `drawBatches`

主要字段：

- `id`
- `userId`
- `title`
- `createdAt`
- `strategy`
- `concurrency`
- `count`
- `successCount`
- `failedCount`
- `cancelledCount`
- `interruptedCount`
- `timeoutCount`
- `snapshotId`

说明：

- 批次是任务的聚合视角
- 任务与批次通过 `payload.draw.batchId` 关联

## 7. 计费与额度

### `quotaProfiles`

主要字段：

- `userId`
- `planName`
- `quotaTotal`
- `quotaUsed`
- `quotaRemaining`
- `renewsAt`
- `updatedAt`

### `billingInvoices`

主要字段：

- `id`
- `userId`
- `planName`
- `amountCents`
- `currency`
- `status`
- `provider`
- `providerRef`
- `createdAt`
- `updatedAt`

说明：

- 当前支持 `mock` 与保留态 `real`
- 生产环境建议默认 `disabled`

## 8. 审计日志

### `auditLogs`

主要字段：

- `id`
- `actorUserId`
- `actorRole`
- `action`
- `targetType`
- `targetId`
- `payload`
- `ip`
- `requestId`
- `createdAt`

说明：

- 后台权限操作、登录与会话相关关键动作会写审计日志

## 9. 数据边界原则

当前应遵循以下原则：

- 主业务数据以服务端存储为准
- 浏览器本地仅保留必要展示缓存，不作为权威数据源
- 所有内容数据都应带 `userId` 做隔离
- 管理台跨用户读取必须经过服务端角色校验
- 生成任务、批次、作品之间的关联优先通过 `taskId`、`batchId`、`snapshotId` 维护

## 10. 常见关联关系

- 一个 `user` 可以有多个 `session`
- 一个 `user` 可以有多个 `promptTemplate`
- 一个 `user` 可以有多个 `work`
- 一个 `user` 可以有多个 `generationTask`
- 一个 `drawBatch` 可以聚合多个 `generationTask`
- 一个 `generationTask` 成功后通常会落一条 `work`
- 一个 `user` 通常只有一条有效 `providerConfig`
- 一个 `user` 通常只有一条 `quotaProfile`

## 11. 变更数据模型时的同步要求

任何数据模型改动，至少同步以下内容：

- 服务端类型定义
- 对应仓储或 SQL schema
- 前端调用层与展示层
- 测试用例
- 本文档和相关运行文档
