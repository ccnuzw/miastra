# 测试策略

这份文档说明当前项目的测试层次、发布门禁关系，以及本地开发与 CI 应该怎么使用这些命令。

## 1. 当前测试分层

当前测试分成四层：

- 单模块或功能测试
- smoke 回归
- regression 回归
- release gate

补充一层工程质量检查：

- `lint`
- `format:check`
- `typecheck`
- `typecheck:server`

## 2. 标准命令

```bash
npm run test:smoke
npm run test:regression
npm run release:check
```

### `test:smoke`

用途：

- 最小高价值回归
- 快速拦截认证、作品、导出、任务主链路问题

适用场景：

- 日常开发自测
- 高风险修复后快速回归

### `test:regression`

用途：

- 完整前后端自动化测试

适用场景：

- 大改动后做全量确认
- smoke 失败后继续定位
- 合并前补一次完整自动化验证

### `release:check`

用途：

- 当前唯一自动化发布阻断门禁

执行顺序：

```bash
test:smoke -> test:regression -> build -> build:server
```

## 3. 前后端测试入口

前端：

- `npm run test:client`
- `npm run test:watch`

服务端：

- `npm run test:server`
- `npm --prefix server run test:watch`

当前 smoke 入口主要包括：

- HTTP client
- 浏览器端状态恢复
- ZIP 导出与 `metadata.json`
- 作品筛选与管理
- 服务端认证、任务、发布回归路由

## 4. 测试运行环境

服务端自动化测试固定使用：

- `NODE_ENV=test`
- `SERVER_STORE_BACKEND=json`

这意味着：

- 测试不依赖外部 Postgres
- 测试不依赖真实云端 Provider
- 本地 `.env` 不会决定自动化回归是否通过

## 5. CI 与本地标准的区别

当前 GitHub Actions CI 运行的是：

```bash
npm run release:check
```

这代表：

- CI 当前只阻断自动化回归与构建
- CI 不直接阻断 `lint`、`format:check`、`typecheck`

本地协作标准更高，参考 [../CONTRIBUTING.md](../CONTRIBUTING.md)。

## 6. 推荐使用方式

### 日常开发

先跑与改动最贴近的测试，再跑：

```bash
npm run test:smoke
```

### 大改动或跨模块改动

```bash
npm run test:regression
```

### 合并前或发版前

```bash
npm run release:check
```

自动化通过后，再执行手工 smoke，见 [release-regression.md](./release-regression.md)。

## 7. 什么时候必须加测试

默认应补测试的改动：

- 新服务端路由
- 认证与权限逻辑
- Provider URL 解析或代理逻辑
- 任务状态流转
- 作品存储和导出逻辑
- Billing 配置与额度扣减
- 运行时检查与启动保护

## 8. 当前测试边界

自动化覆盖重点是：

- 认证与会话
- Provider 配置与默认上游解析
- 生成任务创建、取消、重试
- 作品读写、标签、收藏、删除
- ZIP 导出与敏感字段脱敏

自动化尚未完全覆盖：

- 真实浏览器端到端路径
- 真实第三方 Provider 可用性
- 生产反向代理配置错误

这些项仍依赖手工 smoke 和部署验收。

## 9. 失败时的处理顺序

建议顺序：

1. 先看失败的是 `smoke`、`regression` 还是 `build`
2. 确认是否是本次改动直接影响的模块
3. 如果是服务端失败，先看运行时配置和 store 逻辑
4. 如果是前端失败，先看 feature 调用层和 shared 工具层
5. 如果是发布前失败，再补跑手工 smoke 进行验证
