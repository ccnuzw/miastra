# 图像 Skill 平台 V1 · 第一阶段多 Agent 可复制任务提示词

## 文档说明

- 文档目标：提供可直接复制发送给多会话 / 多 Agent 的单独任务提示词。
- 文档定位：承接 [image-skill-platform-phase1-agent-briefs-v1.md](./image-skill-platform-phase1-agent-briefs-v1.md) 的实操提示词文档。
- 当前状态：可执行提示词文档。
- 更新时间：2026-05-05。

## 1. 使用说明

使用方式：

1. 先确保当前总分支是 `feature/image-skill-platform-v1`
2. 为每个 Agent 从总分支切对应子分支
3. 把下面对应 Agent 的整段提示词直接复制发送
4. 要求每个 Agent 只改自己负责的文件范围
5. 每个 Agent 完成后先汇报改动文件和自测结果，再准备合并

统一要求：

- 你不是独自在仓库里工作
- 不要回滚别人改动
- 只在自己负责范围内改动
- 如果发现主骨架已有变化，要适配现状，不要强行覆盖
- 完成后必须说明改了哪些文件、做了哪些自测、还有什么风险

## 2. Agent A 提示词

```text
你现在负责 Miastra 第一阶段开发里的 Agent A：工作台双模式壳层。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/studio-shell-dual-mode

任务目标：
把 src/pages/app/StudioPage.tsx 从现有单一工作台页重构成普通版 / 专业版统一容器页，为后续普通版主链路和专业版控制视图留出清晰插槽。

你负责的文件范围：
- src/pages/app/StudioPage.tsx
- src/pages/app/studio/StudioEditorColumn.tsx
- src/pages/app/studio/StudioGenerationColumn.tsx
- src/pages/app/studio/StudioWorksColumn.tsx
- 可以新增：
  - src/features/studio-shared/
  - 必要的模式容器组件

你的核心任务：
1. 梳理 StudioPage 当前状态依赖和数据流
2. 增加工作台模式状态：普通版 / 专业版
3. 保留现有三栏骨架，但改造成模式感知容器
4. 抽出工作台共用适配层
5. 确保现有生成、取消、预览、回放逻辑不被破坏

明确不要做的事：
- 不要直接重写生成逻辑
- 不要顺手改 WorksPage
- 不要顺手改 TasksPage
- 不要把普通版完整交互也一起做掉
- 不要改服务端

交付标准：
- 同一路由下支持普通版 / 专业版切换
- 切换时不丢当前 prompt、已上传图片和当前结果
- 原有生成主流程仍可用
- 页面结构已经能承载后续普通版和专业版接入

自测清单：
- 打开 /app/studio
- 切换普通版 / 专业版
- 发起一次生成
- 切换模式后确认当前输入和当前结果仍在

参考文档：
- docs/image-skill-platform-product-map-v1.md
- docs/image-skill-platform-implementation-plan-v1.md
- docs/image-skill-platform-phase1-backlog-v1.md
- docs/image-skill-platform-phase1-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 3. Agent B 提示词

```text
你现在负责 Miastra 第一阶段开发里的 Agent B：普通版主链路。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/studio-consumer-flow

任务目标：
让普通用户在新工作台里完成“开始 -> 生成 -> 继续改”的主链路。

你负责的文件范围：
- src/features/studio-consumer/
- src/features/studio-home/
- 允许接触：
  - src/features/studio/PromptComposer.tsx
  - src/features/studio/ParameterPanel.tsx
  - src/features/generation/PreviewStage.tsx
  - src/features/generation/ResponsePanel.tsx

如果 Agent A 已经把普通版插槽抽出来，优先在新目录里接，不要反复深改旧组件。

你的核心任务：
1. 新增普通版任务入口区
2. 新增普通版引导式输入区
3. 把现有 Prompt、参数、参考图能力重新包装成普通版话术和流程
4. 新增普通版结果动作层
5. 打通普通版从结果继续修改的链路

明确不要做的事：
- 不要改模式切换主状态
- 不要改专业版控制区
- 不要改 WorksPage
- 不要改 TasksPage
- 不要顺手改 Provider 配置页

交付标准：
- 普通用户可直接开始一次文生图
- 普通用户可上传图开始一次图生图
- 结果区有明确“继续改”动作
- 主路径文案符合普通版产品文档定义

自测清单：
- 从普通版开始文生图
- 从普通版开始图生图
- 点击结果动作进入下一轮生成
- 页面里不出现明显的 Provider / Prompt / Runtime Mode 等专业术语

参考文档：
- docs/image-skill-platform-consumer-v1.md
- docs/image-skill-platform-consumer-pages-v1.md
- docs/image-skill-platform-consumer-wireframes-v1.md
- docs/image-skill-platform-consumer-copy-v1.md
- docs/image-skill-platform-phase1-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 4. Agent C 提示词

```text
你现在负责 Miastra 第一阶段开发里的 Agent C：专业版最小控制视图。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/studio-pro-controls

任务目标：
在不污染普通版的情况下，让专业版具备最小可用控制力。

你负责的文件范围：
- src/features/studio-pro/
- 允许接触：
  - src/features/studio/PromptComposer.tsx
  - src/features/studio/ParameterPanel.tsx
  - src/features/studio/AdvancedSettingsPanel.tsx
  - src/features/provider/useProviderConfig.ts

你的核心任务：
1. 新增专业版控制面板
2. 暴露完整 Prompt
3. 暴露更完整参数
4. 显示当前 Provider / model 信息
5. 保证这些能力只在专业版清晰出现

明确不要做的事：
- 不要更改普通版入口和普通版话术
- 不要改 WorksPage
- 不要改 TasksPage
- 不要把专业版逻辑写死到普通版组件里

交付标准：
- 专业版可看 Prompt
- 专业版可看更多参数
- 专业版可识别当前 Provider / model
- 普通版页面不被明显污染

自测清单：
- 打开专业版工作台
- 查看 Prompt 区和参数区
- 确认能识别当前模型或 Provider
- 切回普通版后不应看到这些专业块

参考文档：
- docs/image-skill-platform-pro-v1-prd.md
- docs/image-skill-platform-pro-pages-v1.md
- docs/image-skill-platform-pro-wireframes-v1.md
- docs/image-skill-platform-pro-copy-v1.md
- docs/image-skill-platform-phase1-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 5. Agent D 提示词

```text
你现在负责 Miastra 第一阶段开发里的 Agent D：作品与任务回流链路。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/works-tasks-replay

任务目标：
让作品页和任务页都能把用户带回工作台继续创作。

你负责的文件范围：
- src/pages/app/WorksPage.tsx
- src/pages/app/TasksPage.tsx
- src/features/works/ImageViewerModal.tsx
- src/features/works/workReplay.ts
- src/features/works/useWorksGallery.ts

你的核心任务：
1. 强化作品页中的“继续做 / 再做一版”入口
2. 强化任务详情中的回放和恢复入口
3. 强化失败任务恢复路径
4. 统一从作品和任务回到工作台的提示
5. 确保工作台能带回必要参数和上下文

明确不要做的事：
- 不要重构 StudioPage 主骨架
- 不要改普通版或专业版输入面板
- 不要扩写新的大页面

交付标准：
- 从作品可回到工作台继续做
- 从任务可回到工作台重跑
- 失败任务恢复路径清楚

自测清单：
- 从作品点“继续做”
- 从作品点“再做一版”
- 从任务点“重试 / 恢复”
- 能正常回到工作台并带回参数

参考文档：
- docs/image-skill-platform-product-map-v1.md
- docs/image-skill-platform-implementation-plan-v1.md
- docs/image-skill-platform-phase1-backlog-v1.md
- docs/image-skill-platform-phase1-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 6. Agent E 提示词

```text
你现在负责 Miastra 第一阶段开发里的 Agent E：模板 / Provider / 文案抛光。

当前总分支：
feature/image-skill-platform-v1

你的建议子分支名：
feature/templates-provider-polish

任务目标：
补足第一阶段模板定位、配置中心一致性和全局话术问题。

你负责的文件范围：
- src/pages/app/TemplatesPage.tsx
- src/pages/app/ProviderConfigPage.tsx
- src/layouts/AppShell.tsx
- 必要时可接触全局文案相关组件

你的核心任务：
1. 调整模板页的定位与文案
2. 调整 Provider 配置页与工作台状态提示的一致性
3. 调整模式切换相关全局文案
4. 补空态、错误态、加载态

明确不要做的事：
- 不要重构工作台主骨架
- 不要改任务回放逻辑
- 不要深改生成逻辑

交付标准：
- 模板页、工作台、配置中心话术一致
- 模式切换命名一致
- 页面空态与错误态不割裂

自测清单：
- 检查导航和模式文案
- 检查模板页与工作台入口话术
- 检查 Provider 页与工作台状态提示是否一致

参考文档：
- docs/image-skill-platform-product-map-v1.md
- docs/image-skill-platform-mode-switching-v1.md
- docs/image-skill-platform-consumer-copy-v1.md
- docs/image-skill-platform-pro-copy-v1.md
- docs/image-skill-platform-phase1-agent-briefs-v1.md

输出要求：
- 直接修改代码
- 完成后汇报：改动文件、核心实现、已做自测、剩余风险
```

## 7. 推荐发送顺序

建议按这个顺序启动多会话：

1. Agent A
2. Agent B
3. Agent D
4. Agent C
5. Agent E

原因：

- A 先把壳层搭出来
- B 和 D 尽快打通主闭环
- C 在壳层稳定后更容易接
- E 最适合后置抛光

## 8. 启动前最后提醒

真正开始并行前，建议你再做两件事：

1. 先把当前总分支上的文档改动提交一次
2. 每个 Agent 会话一开始就强调：
   - 只改自己负责范围
   - 不要回滚别人的改动
   - 如果主骨架已经变化，要适配现状

这份文档的用途，就是让你可以直接复制整段提示词发送，不需要现场再重新组织任务语言。
