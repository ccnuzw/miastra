# 图像 Skill 平台 V1 · 第一阶段多 Agent 任务说明书

## 文档说明

- 文档目标：把第一阶段 backlog 继续拆成可直接分发给多会话 / 多 Agent 的任务说明书。
- 文档定位：承接 [image-skill-platform-phase1-backlog-v1.md](./image-skill-platform-phase1-backlog-v1.md) 的执行分发文档。
- 当前状态：多 Agent 执行说明文档。
- 更新时间：2026-05-05。

## 1. 使用方式

这份文档不是继续讨论产品方向，而是给实际开发用的。

推荐使用方式：

1. 先以当前总分支 `feature/image-skill-platform-v1` 作为集成分支
2. 每个 Agent 从总分支切自己的子分支
3. 每个 Agent 严格按自己的“负责范围”改动
4. 每个 Agent 完成后先自检，再合回总分支
5. 总分支统一做集成验证

## 2. 总体分工原则

- 先壳层，后功能
- 先普通版主链路，后专业版增强
- 先打通回流链路，后做抛光
- 按文件边界拆，不按抽象概念拆
- 尽量避免多个 Agent 同时改同一核心文件

## 3. Agent 总览

| Agent | 任务名称 | 核心目标 | 优先级 | 是否阻塞别人 |
|---|---|---|---|---|
| Agent A | 工作台双模式壳层 | 让 `StudioPage` 成为普通版 / 专业版统一容器 | P0 | 是 |
| Agent B | 普通版主链路 | 让普通用户完成开始、生成、继续改 | P0 | 部分 |
| Agent C | 专业版最小控制视图 | 让专业版具备最小控制力 | P1 | 否 |
| Agent D | 作品与任务回流链路 | 让作品和任务都能回到工作台继续创作 | P0 | 否 |
| Agent E | 模板 / Provider / 文案抛光 | 补模板定位、配置中心一致性和全局话术 | P1 | 否 |

## 4. Agent A：工作台双模式壳层

### 4.1 任务目标

把 [StudioPage.tsx](/Users/apple/Progame/newfeng/miastra/src/pages/app/StudioPage.tsx) 从单一工作台页重构成统一双模式容器。

### 4.2 负责范围

- `src/pages/app/StudioPage.tsx`
- `src/pages/app/studio/StudioEditorColumn.tsx`
- `src/pages/app/studio/StudioGenerationColumn.tsx`
- `src/pages/app/studio/StudioWorksColumn.tsx`
- 新增：
  - `src/features/studio-shared/`
  - 必要的模式容器组件

### 4.3 允许目标

- 新增模式状态：普通版 / 专业版
- 调整工作台页面骨架
- 抽工作台共用适配层
- 给后续普通版和专业版留插槽

### 4.4 不要做的事

- 不要直接重写生成逻辑
- 不要顺手改 `WorksPage`
- 不要顺手改 `TasksPage`
- 不要把普通版完整交互也一起塞进去
- 不要改服务端

### 4.5 交付标准

- 同一路由下支持普通版 / 专业版切换
- 切换时不丢当前 prompt、已上传图片和当前结果
- 原有生成主流程仍可用
- 页面结构已经能承载 Agent B 和 Agent C 继续接入

### 4.6 自测清单

- 打开 `/app/studio`
- 切换普通版 / 专业版
- 发起一次生成
- 切换模式后再看当前输入和当前结果是否还在

### 4.7 建议子分支名

- `feature/studio-shell-dual-mode`

## 5. Agent B：普通版主链路

### 5.1 任务目标

让普通用户在新工作台里完成“开始 -> 生成 -> 继续改”的主链路。

### 5.2 负责范围

- `src/features/studio-consumer/`
- `src/features/studio-home/`
- 允许接触：
  - `src/features/studio/PromptComposer.tsx`
  - `src/features/studio/ParameterPanel.tsx`
  - `src/features/generation/PreviewStage.tsx`
  - `src/features/generation/ResponsePanel.tsx`

说明：

- 如果 Agent A 已经把普通版插槽抽出来，优先在新目录里接，不要反复深改旧组件。

### 5.3 允许目标

- 新增普通版任务入口
- 新增普通版引导式输入区
- 新增普通版结果动作层
- 隐藏或翻译专业术语

### 5.4 不要做的事

- 不要改模式切换主状态
- 不要改专业版控制区
- 不要改 `WorksPage`
- 不要改 `TasksPage`
- 不要顺手改 Provider 配置页

### 5.5 交付标准

- 普通用户可直接开始一次文生图
- 普通用户可上传图开始一次图生图
- 结果区有明确“继续改”动作
- 主路径文案符合普通版文档定义

### 5.6 自测清单

- 从普通版开始文生图
- 从普通版开始图生图
- 点击结果动作进入下一轮生成
- 页面里不出现明显的 Provider / Prompt / Runtime Mode 术语

### 5.7 建议子分支名

- `feature/studio-consumer-flow`

## 6. Agent C：专业版最小控制视图

### 6.1 任务目标

在不污染普通版的情况下，让专业版具备最小控制力。

### 6.2 负责范围

- `src/features/studio-pro/`
- 允许接触：
  - `src/features/studio/PromptComposer.tsx`
  - `src/features/studio/ParameterPanel.tsx`
  - `src/features/studio/AdvancedSettingsPanel.tsx`
  - `src/features/provider/useProviderConfig.ts`

### 6.3 允许目标

- 新增专业版控制面板
- 暴露完整 Prompt
- 暴露更完整参数
- 显示当前 Provider / model 信息

### 6.4 不要做的事

- 不要更改普通版入口和普通版话术
- 不要改 `WorksPage`
- 不要改 `TasksPage`
- 不要把专业版逻辑写死到普通版组件里

### 6.5 交付标准

- 专业版可看 Prompt
- 专业版可看更多参数
- 专业版可识别当前 Provider / model
- 普通版页面不被明显污染

### 6.6 自测清单

- 打开专业版工作台
- 查看 Prompt 区和参数区
- 确认能识别当前模型或 Provider
- 切回普通版后不应看到这些专业块

### 6.7 建议子分支名

- `feature/studio-pro-controls`

## 7. Agent D：作品与任务回流链路

### 7.1 任务目标

让作品页和任务页都能把用户带回工作台继续创作。

### 7.2 负责范围

- `src/pages/app/WorksPage.tsx`
- `src/pages/app/TasksPage.tsx`
- `src/features/works/ImageViewerModal.tsx`
- `src/features/works/workReplay.ts`
- `src/features/works/useWorksGallery.ts`

### 7.3 允许目标

- 强化“继续做 / 再做一版”
- 强化任务详情中的回放和恢复入口
- 强化失败任务恢复路径
- 统一从作品和任务回到工作台的提示

### 7.4 不要做的事

- 不要重构 `StudioPage` 主骨架
- 不要改普通版或专业版输入面板
- 不要扩写新的大页面

### 7.5 交付标准

- 从作品可回到工作台继续做
- 从任务可回到工作台重跑
- 失败任务恢复路径清楚

### 7.6 自测清单

- 从作品点“继续做”
- 从作品点“再做一版”
- 从任务点“重试 / 恢复”
- 能正常回到工作台并带回参数

### 7.7 建议子分支名

- `feature/works-tasks-replay`

## 8. Agent E：模板 / Provider / 文案抛光

### 8.1 任务目标

补足第一阶段模板定位、配置中心一致性和全局话术问题。

### 8.2 负责范围

- `src/pages/app/TemplatesPage.tsx`
- `src/pages/app/ProviderConfigPage.tsx`
- `src/layouts/AppShell.tsx`
- 必要时可接触全局文案相关组件

### 8.3 允许目标

- 调整模板页的定位与文案
- 调整 Provider 配置页与工作台状态提示的一致性
- 调整模式切换相关全局文案
- 补空态、错误态、加载态

### 8.4 不要做的事

- 不要重构工作台主骨架
- 不要改任务回放逻辑
- 不要深改生成逻辑

### 8.5 交付标准

- 模板页、工作台、配置中心话术一致
- 模式切换命名一致
- 页面空态与错误态不割裂

### 8.6 自测清单

- 检查导航和模式文案
- 检查模板页与工作台入口话术
- 检查 Provider 页与工作台状态提示是否一致

### 8.7 建议子分支名

- `feature/templates-provider-polish`

## 9. 集成规则

## 9.1 合并顺序

建议合并顺序：

1. Agent A
2. Agent B
3. Agent D
4. Agent C
5. Agent E

原因：

- A 是壳层
- B 和 D 是第一阶段闭环的主体
- C 在壳层稳定后更容易接
- E 最适合后置收尾

## 9.2 冲突高风险文件

以下文件是高冲突区，原则上同一时间只允许一个 Agent 主改：

- `src/pages/app/StudioPage.tsx`
- `src/features/studio/PromptComposer.tsx`
- `src/features/studio/ParameterPanel.tsx`
- `src/pages/app/TasksPage.tsx`

## 9.3 集成验收清单

总分支每次合并后，至少检查：

- 工作台能打开
- 普通版能生成
- 专业版能切换
- 作品能回流
- 任务能回流
- Provider 页还能正常打开

## 10. 可以直接发给 Agent 的任务模板

你后面如果要开多个会话，可以按下面模板发任务：

### 模板

你负责 `Agent X` 任务。

目标：
- 这里写本文档中对应 Agent 的目标

负责文件：
- 这里写负责范围

不要改：
- 这里写禁止碰的文件或区域

完成标准：
- 这里写交付标准

自测：
- 这里写自测清单

注意：
- 你不是独自在仓库里工作
- 不要回滚别人改动
- 如果发现主骨架已变化，要适配现状，不要强行覆盖

## 11. 这份文档的作用

它的核心价值不是“多写一份计划”，而是让你后面启用多会话、多 Agent 时：

- 每个人知道自己负责什么
- 每个人知道不能碰什么
- 总分支知道先合谁、后合谁
- 集成阶段知道该重点看什么

下一步如果要真正开始并行开发，最合理的动作就是：

- 按本文档为每个 Agent 发一份任务说明
- 从当前总分支切对应子分支
