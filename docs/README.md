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
| [image-skill-platform-product-map-v1.md](./image-skill-platform-product-map-v1.md) | 普通版与专业版完整产品地图，定义统一前台产品层、共享资产主线与页面角色分工 |
| [image-skill-platform-implementation-plan-v1.md](./image-skill-platform-implementation-plan-v1.md) | 第一阶段开发实施方案，定义从现有工作台到双模式统一创作平台的改造顺序与代码落点 |
| [image-skill-platform-phase1-backlog-v1.md](./image-skill-platform-phase1-backlog-v1.md) | 第一阶段开发任务清单，定义 Epic、任务包、并行边界、多 Agent 分工与分支策略 |
| [image-skill-platform-phase1-agent-briefs-v1.md](./image-skill-platform-phase1-agent-briefs-v1.md) | 第一阶段多 Agent 任务说明书，定义每个 Agent 的目标、文件边界、禁止改动区域与集成规则 |
| [image-skill-platform-phase1-agent-prompts-v1.md](./image-skill-platform-phase1-agent-prompts-v1.md) | 第一阶段多 Agent 可复制任务提示词，提供可直接发送给各 Agent 的独立任务文本 |
| [image-skill-platform-phase1-review-v1.md](./image-skill-platform-phase1-review-v1.md) | 第一阶段复盘，整理已完成能力、已暴露问题与第二阶段建议 |
| [image-skill-platform-phase2-scope-v1.md](./image-skill-platform-phase2-scope-v1.md) | 第二阶段开发目标与范围，定义体验增强阶段的目标、优先级与边界 |
| [image-skill-platform-phase2-backlog-v1.md](./image-skill-platform-phase2-backlog-v1.md) | 第二阶段多 Agent 开发任务清单，定义第二阶段 Epic、任务范围与并行方向 |
| [image-skill-platform-phase2-agent-briefs-v1.md](./image-skill-platform-phase2-agent-briefs-v1.md) | 第二阶段多 Agent 任务说明书，定义每个 Agent 的目标、文件边界、禁止改动区域与集成规则 |
| [image-skill-platform-phase2-agent-prompts-v1.md](./image-skill-platform-phase2-agent-prompts-v1.md) | 第二阶段多 Agent 可复制任务提示词，提供可直接发送给各 Agent 的独立任务文本 |
| [image-skill-platform-phase2-review-v1.md](./image-skill-platform-phase2-review-v1.md) | 第二阶段复盘，整理第二阶段已完成能力、已暴露问题与第三阶段建议 |
| [image-skill-platform-phase3-scope-v1.md](./image-skill-platform-phase3-scope-v1.md) | 第三阶段开发目标与范围，定义结构化能力建设阶段的目标、优先级与边界 |
| [image-skill-platform-phase3-backlog-v1.md](./image-skill-platform-phase3-backlog-v1.md) | 第三阶段多 Agent 开发任务清单，定义第三阶段 Epic、任务范围与并行方向 |
| [image-skill-platform-phase3-agent-briefs-v1.md](./image-skill-platform-phase3-agent-briefs-v1.md) | 第三阶段多 Agent 任务说明书，定义每个 Agent 的目标、文件边界、禁止改动区域与集成规则 |
| [image-skill-platform-phase3-agent-prompts-v1.md](./image-skill-platform-phase3-agent-prompts-v1.md) | 第三阶段多 Agent 可复制任务提示词，提供可直接发送给各 Agent 的独立任务文本 |
| [image-skill-platform-phase3-review-v1.md](./image-skill-platform-phase3-review-v1.md) | 第三阶段复盘，整理第三阶段已完成能力、已暴露问题与第四阶段建议 |
| [image-skill-platform-phase4-scope-v1.md](./image-skill-platform-phase4-scope-v1.md) | 第四阶段开发目标与范围，定义结构统一与机制扩展阶段的目标、优先级与边界 |
| [image-skill-platform-phase4-backlog-v1.md](./image-skill-platform-phase4-backlog-v1.md) | 第四阶段多 Agent 开发任务清单，定义第四阶段 Epic、任务范围与并行方向 |
| [image-skill-platform-phase4-agent-briefs-v1.md](./image-skill-platform-phase4-agent-briefs-v1.md) | 第四阶段多 Agent 任务说明书，定义每个 Agent 的目标、文件边界、禁止改动区域与集成规则 |
| [image-skill-platform-phase4-agent-prompts-v1.md](./image-skill-platform-phase4-agent-prompts-v1.md) | 第四阶段多 Agent 可复制任务提示词，提供可直接发送给各 Agent 的独立任务文本 |
| [image-skill-platform-phase4-review-v1.md](./image-skill-platform-phase4-review-v1.md) | 第四阶段复盘，整理第四阶段已完成能力、已暴露问题与第五阶段建议 |
| [image-skill-platform-phase5-scope-v1.md](./image-skill-platform-phase5-scope-v1.md) | 第五阶段开发目标与范围，定义系统能力稳定化阶段的目标、优先级与边界 |
| [image-skill-platform-phase5-backlog-v1.md](./image-skill-platform-phase5-backlog-v1.md) | 第五阶段多 Agent 开发任务清单，定义第五阶段 Epic、任务范围与并行方向 |
| [image-skill-platform-phase5-agent-briefs-v1.md](./image-skill-platform-phase5-agent-briefs-v1.md) | 第五阶段多 Agent 任务说明书，定义每个 Agent 的目标、文件边界、禁止改动区域与集成规则 |
| [image-skill-platform-phase5-agent-prompts-v1.md](./image-skill-platform-phase5-agent-prompts-v1.md) | 第五阶段多 Agent 可复制任务提示词，提供可直接发送给各 Agent 的独立任务文本 |
| [image-skill-platform-phase5-review-v1.md](./image-skill-platform-phase5-review-v1.md) | 第五阶段复盘，整理第五阶段已完成能力、已暴露问题与第六阶段建议 |
| [image-skill-platform-phase6-scope-v1.md](./image-skill-platform-phase6-scope-v1.md) | 第六阶段开发目标与范围，定义 contract 深化与 runtime 决策增强阶段的目标、优先级与边界 |
| [image-skill-platform-phase6-backlog-v1.md](./image-skill-platform-phase6-backlog-v1.md) | 第六阶段多 Agent 开发任务清单，定义第六阶段 Epic、任务范围与并行方向 |
| [image-skill-platform-phase6-agent-briefs-v1.md](./image-skill-platform-phase6-agent-briefs-v1.md) | 第六阶段多 Agent 任务说明书，定义每个 Agent 的目标、文件边界、禁止改动区域与集成规则 |
| [image-skill-platform-phase6-agent-prompts-v1.md](./image-skill-platform-phase6-agent-prompts-v1.md) | 第六阶段多 Agent 可复制任务提示词，提供可直接发送给各 Agent 的独立任务文本 |
| [image-skill-platform-phase6-review-v1.md](./image-skill-platform-phase6-review-v1.md) | 第六阶段复盘，整理第六阶段已完成能力、已暴露问题与第七阶段建议 |
| [image-skill-platform-phase7-scope-v1.md](./image-skill-platform-phase7-scope-v1.md) | 第七阶段开发目标与范围，定义 V1 上线前收口阶段的目标、优先级与边界 |
| [image-skill-platform-phase7-backlog-v1.md](./image-skill-platform-phase7-backlog-v1.md) | 第七阶段多 Agent 开发任务清单，定义第七阶段 Epic、任务范围与并行方向 |
| [image-skill-platform-phase7-agent-briefs-v1.md](./image-skill-platform-phase7-agent-briefs-v1.md) | 第七阶段多 Agent 任务说明书，定义每个 Agent 的目标、文件边界、禁止改动区域与集成规则 |
| [image-skill-platform-phase7-agent-prompts-v1.md](./image-skill-platform-phase7-agent-prompts-v1.md) | 第七阶段多 Agent 可复制任务提示词，提供可直接发送给各 Agent 的独立任务文本 |
| [image-skill-platform-phase7-review-v1.md](./image-skill-platform-phase7-review-v1.md) | 第七阶段复盘，整理第七阶段已完成能力、已暴露问题与第八阶段建议 |
| [image-skill-platform-phase8-scope-v1.md](./image-skill-platform-phase8-scope-v1.md) | 第八阶段开发目标与范围，定义 V1 最终封口与验收准备阶段的目标、优先级与边界 |
| [image-skill-platform-phase8-backlog-v1.md](./image-skill-platform-phase8-backlog-v1.md) | 第八阶段多 Agent 开发任务清单，定义第八阶段 Epic、任务范围与并行方向 |
| [image-skill-platform-phase8-agent-briefs-v1.md](./image-skill-platform-phase8-agent-briefs-v1.md) | 第八阶段多 Agent 任务说明书，定义每个 Agent 的目标、文件边界、禁止改动区域与集成规则 |
| [image-skill-platform-phase8-agent-prompts-v1.md](./image-skill-platform-phase8-agent-prompts-v1.md) | 第八阶段多 Agent 可复制任务提示词，提供可直接发送给各 Agent 的独立任务文本 |
| [image-skill-platform-phase8-review-v1.md](./image-skill-platform-phase8-review-v1.md) | 第八阶段复盘，整理第八阶段已完成能力、已暴露问题与第九阶段建议 |
| [image-skill-platform-phase9-scope-v1.md](./image-skill-platform-phase9-scope-v1.md) | 第九阶段开发目标与范围，定义最终验收与上线执行准备阶段的目标、优先级与边界 |
| [image-skill-platform-phase9-backlog-v1.md](./image-skill-platform-phase9-backlog-v1.md) | 第九阶段多 Agent 开发任务清单，定义第九阶段 Epic、任务范围与并行方向 |
| [image-skill-platform-phase9-agent-briefs-v1.md](./image-skill-platform-phase9-agent-briefs-v1.md) | 第九阶段多 Agent 任务说明书，定义每个 Agent 的目标、文件边界、禁止改动区域与集成规则 |
| [image-skill-platform-phase9-agent-prompts-v1.md](./image-skill-platform-phase9-agent-prompts-v1.md) | 第九阶段多 Agent 可复制任务提示词，提供可直接发送给各 Agent 的独立任务文本 |
| [image-skill-platform-phase9-review-v1.md](./image-skill-platform-phase9-review-v1.md) | 第九阶段复盘，整理第九阶段已完成能力、已暴露问题与最终验收状态判断 |
| [image-skill-platform-phase9-release-execution-v1.md](./image-skill-platform-phase9-release-execution-v1.md) | 第九阶段最终验收与上线执行清单，定义手工验收视角、回归重点与上线执行准备顺序 |
| [image-skill-platform-final-merge-and-release-v1.md](./image-skill-platform-final-merge-and-release-v1.md) | 最终合并前检查与发布前收口建议，定义是否可合回 dev、合回前后检查与发布收口动作 |
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
18. `image-skill-platform-product-map-v1.md`
19. `image-skill-platform-implementation-plan-v1.md`
20. `image-skill-platform-phase1-backlog-v1.md`
21. `image-skill-platform-phase1-agent-briefs-v1.md`
22. `image-skill-platform-phase1-agent-prompts-v1.md`
23. `image-skill-platform-phase1-review-v1.md`
24. `image-skill-platform-phase2-scope-v1.md`
25. `image-skill-platform-phase2-backlog-v1.md`
26. `image-skill-platform-phase2-agent-briefs-v1.md`
27. `image-skill-platform-phase2-agent-prompts-v1.md`
28. `image-skill-platform-phase2-review-v1.md`
29. `image-skill-platform-phase3-scope-v1.md`
30. `image-skill-platform-phase3-backlog-v1.md`
31. `image-skill-platform-phase3-agent-briefs-v1.md`
32. `image-skill-platform-phase3-agent-prompts-v1.md`
33. `image-skill-platform-phase3-review-v1.md`
34. `image-skill-platform-phase4-scope-v1.md`
35. `image-skill-platform-phase4-backlog-v1.md`
36. `image-skill-platform-phase4-agent-briefs-v1.md`
37. `image-skill-platform-phase4-agent-prompts-v1.md`
38. `image-skill-platform-phase4-review-v1.md`
39. `image-skill-platform-phase5-scope-v1.md`
40. `image-skill-platform-phase5-backlog-v1.md`
41. `image-skill-platform-phase5-agent-briefs-v1.md`
42. `image-skill-platform-phase5-agent-prompts-v1.md`
43. `image-skill-platform-phase5-review-v1.md`
44. `image-skill-platform-phase6-scope-v1.md`
45. `image-skill-platform-phase6-backlog-v1.md`
46. `image-skill-platform-phase6-agent-briefs-v1.md`
47. `image-skill-platform-phase6-agent-prompts-v1.md`
48. `image-skill-platform-phase6-review-v1.md`
49. `image-skill-platform-phase7-scope-v1.md`
50. `image-skill-platform-phase7-backlog-v1.md`
51. `image-skill-platform-phase7-agent-briefs-v1.md`
52. `image-skill-platform-phase7-agent-prompts-v1.md`
53. `image-skill-platform-phase7-review-v1.md`
54. `image-skill-platform-phase8-scope-v1.md`
55. `image-skill-platform-phase8-backlog-v1.md`
56. `image-skill-platform-phase8-agent-briefs-v1.md`
57. `image-skill-platform-phase8-agent-prompts-v1.md`
58. `image-skill-platform-phase8-review-v1.md`
59. `image-skill-platform-phase9-scope-v1.md`
60. `image-skill-platform-phase9-backlog-v1.md`
61. `image-skill-platform-phase9-agent-briefs-v1.md`
62. `image-skill-platform-phase9-agent-prompts-v1.md`
63. `image-skill-platform-phase9-review-v1.md`
64. `image-skill-platform-phase9-release-execution-v1.md`
65. `image-skill-platform-final-merge-and-release-v1.md`
66. `image-skill-platform-consumer-components-v1.md`
67. `image-skill-platform-consumer-interactions-v1.md`
68. `image-skill-platform-consumer-copy-v1.md`
69. `image-skill-platform-consumer-layout-decisions-v1.md`
70. `development-workflow.md`
71. `testing-strategy.md`
72. `troubleshooting.md`
73. `current-project-status.md`

## 相关入口

以下文件与文档集配套使用：

| 文档 | 用途 |
|---|---|
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | 协作与提交前检查 |
