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
| [image-skill-platform-v1-prd.md](./image-skill-platform-v1-prd.md) | 图像 Skill 平台 V1 产品规划主文档，定义工作台升级方向与中台能力边界 |
| [image-skill-platform-pro-v1-prd.md](./image-skill-platform-pro-v1-prd.md) | 专业版产品规划主文档，定义控制导向工作台的用户、能力边界和一期范围 |
| [image-skill-platform-pro-pages-v1.md](./image-skill-platform-pro-pages-v1.md) | 专业版页面结构文档，定义创作页、结果页、历史页、模板视图和执行设置视图的角色与优先级 |
| [image-skill-platform-pro-wireframes-v1.md](./image-skill-platform-pro-wireframes-v1.md) | 专业版线框级信息结构，定义创作页和结果页的三栏骨架、信息分区和页面主关系 |
| [image-skill-platform-pro-components-v1.md](./image-skill-platform-pro-components-v1.md) | 专业版组件清单与状态清单，定义创作页和结果页的控制组件、快照组件和状态体系 |
| [image-skill-platform-pro-interactions-v1.md](./image-skill-platform-pro-interactions-v1.md) | 专业版交互流与状态流，定义创作页和结果页的控制动作、重跑链路与版本回流机制 |
| [image-skill-platform-pro-copy-v1.md](./image-skill-platform-pro-copy-v1.md) | 专业版文案与按钮文案清单，定义创作页和结果页的标题、按钮、反馈与失败提示话术 |
| [image-skill-platform-consumer-v1.md](./image-skill-platform-consumer-v1.md) | 普通用户版产品主文档，定义面向大众用户的前台界面、任务入口与创作流程 |
| [image-skill-platform-consumer-pages-v1.md](./image-skill-platform-consumer-pages-v1.md) | 普通用户版 3 张核心页面拆解，定义首页、创作页、结果页的结构与交互重点 |
| [image-skill-platform-consumer-wireframes-v1.md](./image-skill-platform-consumer-wireframes-v1.md) | 普通用户版线框级信息结构，定义首页、创作页、结果页的区块骨架与主按钮优先级 |
| [image-skill-platform-mode-switching-v1.md](./image-skill-platform-mode-switching-v1.md) | 普通用户版与专业版的切换策略，定义双模式共存方式、能力边界与状态共享规则 |
| [image-skill-platform-consumer-components-v1.md](./image-skill-platform-consumer-components-v1.md) | 普通用户版组件清单与状态清单，定义首页、创作页、结果页的组件层级、页面状态与空态 |
| [image-skill-platform-consumer-interactions-v1.md](./image-skill-platform-consumer-interactions-v1.md) | 普通用户版交互流与状态流，定义用户动作、系统响应、页面变化和失败恢复策略 |
| [image-skill-platform-consumer-copy-v1.md](./image-skill-platform-consumer-copy-v1.md) | 普通用户版文案与按钮文案清单，定义标题、按钮、空态、失败态和全局反馈话术 |
| [image-skill-platform-consumer-layout-decisions-v1.md](./image-skill-platform-consumer-layout-decisions-v1.md) | 普通用户版信息优先级与布局决策，定义区块排序、按钮主次和折叠展开规则 |
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
7. `image-skill-platform-v1-prd.md`
8. `image-skill-platform-pro-v1-prd.md`
9. `image-skill-platform-pro-pages-v1.md`
10. `image-skill-platform-pro-wireframes-v1.md`
11. `image-skill-platform-pro-components-v1.md`
12. `image-skill-platform-pro-interactions-v1.md`
13. `image-skill-platform-pro-copy-v1.md`
14. `image-skill-platform-consumer-v1.md`
15. `image-skill-platform-consumer-pages-v1.md`
16. `image-skill-platform-consumer-wireframes-v1.md`
17. `image-skill-platform-mode-switching-v1.md`
18. `image-skill-platform-consumer-components-v1.md`
19. `image-skill-platform-consumer-interactions-v1.md`
20. `image-skill-platform-consumer-copy-v1.md`
21. `image-skill-platform-consumer-layout-decisions-v1.md`
22. `development-workflow.md`
23. `testing-strategy.md`
24. `troubleshooting.md`
25. `current-project-status.md`

## 相关入口

以下文件与文档集配套使用：

| 文档 | 用途 |
|---|---|
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | 协作与提交前检查 |
