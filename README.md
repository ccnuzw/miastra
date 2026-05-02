# Miastra Studio

Miastra Studio 是一个面向图片创作的 AI Image Studio，支持提示词生成、参考图生图、抽卡式批量生成、实时预览、作品墙和本地持久化管理。

## 快速开始

```bash
npm install
cp .env.example .env
npm run dev
```

前端默认地址：`http://127.0.0.1:5173/`

服务端默认地址：`http://127.0.0.1:18081/`

## 目录结构

- `src/`：前端应用、页面、布局、features 和共享工具
- `server/`：Fastify 服务、认证、任务队列、作品与模板接口
- `docker/`：生产部署相关配置
- `.github/workflows/`：CI 门禁

## 常用命令

```bash
npm run dev
npm run build
npm run build:server
npm run typecheck
npm run typecheck:server
npm run lint
npm run format:check
npm test
```

## 验证流程

1. 启动前端和后端开发服务。
2. 登录 / 登出 / 刷新会话。
3. 保存 Provider 配置并测试连接。
4. 完成一次文生图或图生图生成。
5. 打开模板库保存、搜索、应用、删除模板。
6. 打开作品墙，筛选、收藏、下载 ZIP，并检查 metadata。
7. 刷新页面，确认本地持久化恢复正常。

## 环境变量

详见 `.env.example`。

## 安全说明

- 不要把长期 API Key 写死在前端代码里。
- 本地开发时可以直接连远端 API；多人或正式部署时建议使用后端代理或服务端保存密钥。
- 生成作品和抽卡批次存储在访问者自己的浏览器 IndexedDB 中。
- Provider 配置会保存到后端的当前账号配置中心。
