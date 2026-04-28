# Miastra Studio

Miastra Studio 是一个面向图片创作的 AI Image Studio，支持提示词生成、参考图生图、抽卡式批量生成、实时预览、作品墙和本地持久化管理。

## 功能特性

- 文生图与图生图：兼容 OpenAI Images API 风格接口。
- 图片抽卡：固定提示词和参数，批量生成相近但有轻微差异的图片。
- 作品管理：Works Rail、图片墙、预览、下载、删除、批量选择、复制提示词。
- 本地持久化：作品与抽卡批次保存在当前浏览器 IndexedDB，刷新不丢失。
- Provider 配置：API URL、Model、API Key 保存在当前浏览器 localStorage。

## 本地开发

```bash
npm install
cp .env.example .env
npm run dev
```

默认开发服务地址：`http://127.0.0.1:5173/`

如果需要使用本地 `/sub2api` 代理，请在 `.env` 中配置：

```bash
VITE_SUB2API_PROXY_TARGET=https://your-sub2api.example.com
```

## 构建

```bash
npm run build
npm run preview
```

## 数据与安全说明

- 当前版本是前端优先的个人工作台方案。
- 生成作品和抽卡批次保存在访问者自己的浏览器 IndexedDB 中。
- Provider 配置保存在访问者自己的浏览器 localStorage 中。
- 不建议把长期 API Key 写死在前端代码中；多人正式使用时建议增加后端代理、用户系统、数据库和对象存储。

## 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide Icons

## License

MIT
