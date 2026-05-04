# 开发流程

这份文档定义当前仓库的推荐开发流程，目标是让新成员能稳定完成：

- 初始化环境
- 本地联调
- 提交前自检
- 文档与代码一起维护

## 1. 初始化

安装依赖：

```bash
npm ci
npm --prefix server ci
```

复制环境变量模板：

```bash
cp .env.example .env
```

至少补齐：

- `SERVER_STORE_BACKEND=postgres`
- `DATABASE_URL`
- `AUTH_JWT_SECRET`
- `RESET_JWT_SECRET`

初始化数据库：

```bash
npm run init:db
```

## 2. 本地启动

终端 1：

```bash
npm --prefix server run dev
```

终端 2：

```bash
npm run dev
```

联调检查：

- 前端：`http://127.0.0.1:5173`
- 服务：`http://127.0.0.1:18081/health`
- 存储：`http://127.0.0.1:18081/health/store`

## 3. 目录分工

前端：

- `src/pages/`：页面与路由入口
- `src/features/`：按业务能力拆分
- `src/layouts/`：页面框架
- `src/shared/`：通用能力

服务端：

- `server/src/<module>/routes.ts`：接口入口
- `server/src/lib/`：共享基础设施
- `server/scripts/`：数据库与运维脚本

文档：

- `README.md`：对外主入口
- `docs/`：系统、运维、API、测试、排障文档

## 4. 日常开发建议顺序

1. 从页面或接口需求切入，先确认影响模块
2. 在对应 `feature` 或 `server/src/<module>` 中修改
3. 补最贴近改动的测试
4. 跑最小必要命令
5. 如果影响启动、环境变量、测试命令、发布门禁或接口目录，同步改文档

## 5. 常用命令

开发：

```bash
npm run dev
npm --prefix server run dev
```

构建：

```bash
npm run build
npm run build:server
```

自动化测试：

```bash
npm run test:smoke
npm run test:regression
npm run release:check
```

质量检查：

```bash
npm run lint
npm run format:check
npm run typecheck
npm run typecheck:server
```

## 6. 提交前检查

推荐最小顺序：

1. 跑与本次改动直接相关的测试
2. 跑 `npm run test:smoke`
3. 如改动面较大，再跑 `npm run test:regression`
4. 如准备发版或合并关键改动，跑 `npm run release:check`

更高标准的本地自检，见 [../CONTRIBUTING.md](../CONTRIBUTING.md)。

## 7. 何时必须补测试

以下情况默认应补测试：

- 新增或修改服务端路由
- 修改认证、会话、角色、权限
- 修改任务状态流转
- 修改作品存储、导出、标签、收藏
- 修改 Provider URL、代理和错误映射
- 修改发布门禁或运行时检查

## 8. 何时必须补文档

以下改动必须同步文档：

- 新增或删除环境变量
- 修改启动命令、构建命令、测试命令
- 修改发布门禁
- 新增核心 API 模块或重要路由
- 修改部署边界
- 修改数据库初始化方式

## 9. 分支与协作建议

仓库当前 CI 在 `push` 到 `main`、`dev` 以及 `pull_request` 时运行 `release:check`。

如果团队没有另行规定，建议采用：

- 功能分支：`feature/<topic>`
- 修复分支：`fix/<topic>`
- 文档分支：`docs/<topic>`

提交说明应至少让人看懂：

- 改了什么
- 影响哪一层
- 是否影响环境变量、API、测试或发布

## 10. Definition of Done

一次改动可以认为完成，至少满足：

- 代码能跑通
- 相关测试已补或已验证
- 不破坏当前 `release:check`
- 如果影响交付面，文档已经同步
