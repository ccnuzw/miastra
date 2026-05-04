# API 总览

这份文档提供当前服务端接口的快速目录，而不是逐字段 OpenAPI。目标是让开发、联调和排障时能快速知道接口在哪、是否需要登录、主要用途是什么。

## 1. 响应约定

成功响应：

```json
{
  "data": {}
}
```

失败响应：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误说明"
  }
}
```

## 2. 健康检查接口

| 方法 | 路径 | 鉴权 | 用途 |
|---|---|---|---|
| `GET` | `/health` | 否 | 查看运行时配置健康度 |
| `GET` | `/ready` | 否 | 查看服务是否可用与是否能读写存储 |
| `GET` | `/health/store` | 否 | 查看存储后端、连接状态和核心数据计数 |

## 3. 认证与会话

| 方法 | 路径 | 鉴权 | 用途 |
|---|---|---|---|
| `POST` | `/api/auth/register` | 否 | 注册并自动建会话 |
| `POST` | `/api/auth/login` | 否 | 使用账号或邮箱登录 |
| `POST` | `/api/auth/logout` | 是 | 登出并撤销当前会话 |
| `GET` | `/api/auth/me` | 是 | 获取当前登录用户 |
| `GET` | `/api/auth/quota` | 是 | 获取当前额度档案 |
| `POST` | `/api/auth/profile` | 是 | 更新昵称 |
| `POST` | `/api/auth/password` | 是 | 修改密码 |
| `POST` | `/api/auth/forgot-password` | 否 | 申请重置密码 |
| `POST` | `/api/auth/reset-password` | 否 | 提交重置密码 |
| `GET` | `/api/auth/sessions` | 是 | 查看会话列表 |
| `POST` | `/api/auth/sessions/:id/revoke` | 是 | 撤销指定会话 |
| `POST` | `/api/auth/sessions/revoke-others` | 是 | 撤销其他会话 |

## 4. Provider 配置与代理

### 4.1 Provider 配置

| 方法 | 路径 | 鉴权 | 用途 |
|---|---|---|---|
| `GET` | `/api/provider-config` | 是 | 获取当前用户 Provider 配置和公共 Provider 列表 |
| `PUT` | `/api/provider-config` | 是 | 保存当前用户 Provider 配置 |
| `GET` | `/api/provider-config/resolve` | 是 | 获取最终生效的 Provider 与模型 |

### 4.2 Provider 代理

| 方法 | 路径 | 鉴权 | 用途 |
|---|---|---|---|
| `ALL` | `/api/provider-proxy/*` | 是 | 把生成或图生图请求代理到上游 Provider |

说明：

- 业务主路径是 `/api/provider-proxy/*`
- `/sub2api` 只用于前端辅助代理和静态容器转发，不承载主业务接口定义

## 5. 生成任务

| 方法 | 路径 | 鉴权 | 用途 |
|---|---|---|---|
| `GET` | `/api/generation-tasks` | 是 | 获取当前用户任务列表 |
| `GET` | `/api/generation-tasks/:id` | 是 | 获取单个任务详情 |
| `POST` | `/api/generation-tasks` | 是 | 创建新任务 |
| `POST` | `/api/generation-tasks/:id/cancel` | 是 | 取消任务 |
| `POST` | `/api/generation-tasks/:id/retry` | 是 | 重试失败任务 |
| `POST` | `/api/generation-tasks/:id` | 是 | 更新任务状态，主要供内部链路使用 |

## 6. 作品

| 方法 | 路径 | 鉴权 | 用途 |
|---|---|---|---|
| `GET` | `/api/works` | 是 | 获取当前用户作品 |
| `PUT` | `/api/works/replace` | 是 | 批量替换用户作品 |
| `PUT` | `/api/works/:id` | 是 | 新增或更新单个作品 |
| `DELETE` | `/api/works/:id` | 是 | 删除单个作品 |
| `POST` | `/api/works/delete` | 是 | 批量删除作品 |
| `PUT` | `/api/works/:id/favorite` | 是 | 更新收藏状态 |
| `PUT` | `/api/works/:id/tags` | 是 | 替换标签 |
| `POST` | `/api/works/tags/add` | 是 | 批量加标签 |
| `POST` | `/api/works/tags/remove` | 是 | 批量去标签 |

## 7. Prompt 模板

| 方法 | 路径 | 鉴权 | 用途 |
|---|---|---|---|
| `GET` | `/api/prompt-templates` | 是 | 获取模板列表 |
| `POST` | `/api/prompt-templates` | 是 | 创建或更新模板 |
| `POST` | `/api/prompt-templates/:id/use` | 是 | 标记模板最近使用 |
| `DELETE` | `/api/prompt-templates/:id` | 是 | 删除模板 |

## 8. 抽卡批次

| 方法 | 路径 | 鉴权 | 用途 |
|---|---|---|---|
| `GET` | `/api/draw-batches` | 是 | 获取批次列表和摘要 |
| `PUT` | `/api/draw-batches/replace` | 是 | 批量替换批次 |
| `POST` | `/api/draw-batches/:id/rerun` | 是 | 以历史批次为源重新排队任务 |

## 9. Billing

| 方法 | 路径 | 鉴权 | 用途 |
|---|---|---|---|
| `GET` | `/api/billing/config` | 否 | 获取当前 Billing 运行模式 |
| `GET` | `/api/billing/plans` | 否 | 获取套餐列表 |
| `GET` | `/api/billing/invoices` | 是 | 获取当前用户账单 |
| `POST` | `/api/billing/checkout` | 是 | 发起升级或续费 |
| `POST` | `/api/billing/restore` | 是 | 恢复额度快照 |

说明：

- 当前 `BILLING_MODE=real` 时仍未接入真实支付网关
- 生产默认建议 `disabled`

## 10. 管理台

以下接口要求管理员或具备后台权限的角色：

| 方法 | 路径 | 用途 |
|---|---|---|
| `GET` | `/api/admin/dashboard` | 仪表盘概览 |
| `GET` | `/api/admin/users` | 用户分页查询 |
| `GET` | `/api/admin/users/:id` | 用户详情 |
| `POST` | `/api/admin/users/:id/role` | 调整角色 |
| `POST` | `/api/admin/users/:id/revoke-sessions` | 撤销用户会话 |
| `GET` | `/api/admin/works` | 全局作品查询 |
| `GET` | `/api/admin/works/:id` | 单作品详情 |
| `DELETE` | `/api/admin/works/:id` | 删除作品 |
| `GET` | `/api/admin/tasks` | 全局任务查询 |
| `GET` | `/api/admin/tasks/:id` | 单任务详情 |
| `POST` | `/api/admin/tasks/:id/cancel` | 取消任务 |
| `GET` | `/api/admin/providers` | 公共 Provider 列表 |
| `PUT` | `/api/admin/providers/:id` | 新增或更新公共 Provider |
| `DELETE` | `/api/admin/providers/:id` | 删除公共 Provider |
| `GET` | `/api/admin/roles` | 可分配角色列表 |
| `GET` | `/api/admin/policies` | 当前后台策略说明 |

## 11. 鉴权规则

- `/health`、`/ready`、`/health/store` 不需要登录
- `/api/auth/register`、`/api/auth/login`、`/api/auth/forgot-password`、`/api/auth/reset-password` 不需要登录
- 大多数 `/api/*` 业务接口需要登录
- `/api/admin/*` 需要服务端角色校验，不以单纯前端可见性作为准入

## 12. 联调建议

- 前端日常联调优先走本地 Fastify
- API 结构变更时，同时更新本文件和对应页面/feature 的调用层
- 如果新增接口会影响发布门禁或 smoke，记得同步更新 [release-regression.md](./release-regression.md)
