# 贡献指南

## 提交前

- 运行 `npm run lint`
- 运行 `npm run format:check`
- 运行 `npm run typecheck`
- 运行 `npm run typecheck:server`
- 运行 `npm test`
- 运行 `npm run build`
- 运行 `npm run build:server`

## 代码风格

- 优先沿用现有 feature 分层。
- 只做必要改动，不做无关重构。
- 新增逻辑优先补测试。

## 安全要求

- 不要把长期密钥写进前端代码或本地持久化。
- 涉及认证、会话、存储和下载逻辑时，优先检查输入与输出边界。
