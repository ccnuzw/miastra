# 文档索引

当前文档按“交付必读”和“开发运维参考”两类区分，只保留当前云端项目需要维护的文档。

## 交付必读

以下文档构成当前仓库的交付主文档集：

| 文档 | 用途 |
|---|---|
| [../README.md](../README.md) | 新成员入口：初始化、启动、测试、发布总览 |
| [deployment-runbook.md](./deployment-runbook.md) | 云端部署边界、环境变量、数据库初始化、发布步骤 |
| [release-regression.md](./release-regression.md) | smoke / regression / release 门禁定义与手工 smoke 清单 |
| [current-project-status.md](./current-project-status.md) | 当前项目阶段、已交付能力和已知边界 |
| [architecture-overview.md](./architecture-overview.md) | 系统组成、请求流、目录分层与部署边界 |
| [api-overview.md](./api-overview.md) | 服务端接口目录与鉴权边界 |
| [data-model.md](./data-model.md) | 核心实体、关联关系与数据边界 |
| [development-workflow.md](./development-workflow.md) | 日常开发、提交流程、命令与 DoD |
| [testing-strategy.md](./testing-strategy.md) | 自动化测试分层、CI 与发布门禁关系 |
| [troubleshooting.md](./troubleshooting.md) | 常见启动、联调、部署和回归问题排查 |

推荐阅读顺序：

1. `README.md`
2. `deployment-runbook.md`
3. `release-regression.md`
4. `architecture-overview.md`
5. `api-overview.md`
6. `data-model.md`
7. `development-workflow.md`
8. `testing-strategy.md`
9. `troubleshooting.md`
10. `current-project-status.md`

## 相关入口

以下文件与文档集配套使用：

| 文档 | 用途 |
|---|---|
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | 协作与提交前检查 |
