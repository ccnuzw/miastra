# Miastra Studio

Miastra Studio 是一个面向图片创作的 AI Image Studio，支持提示词生成、参考图生图、抽卡式批量生成、实时预览、作品墙和本地持久化管理。

## 功能特性

- 文生图与图生图：兼容 OpenAI Images API 风格接口。
- 图片抽卡：固定提示词和参数，批量生成相近但有轻微差异的图片。
- 作品管理：Works Rail、图片墙、预览、下载、删除、批量选择、复制提示词。
- 本地持久化：作品与抽卡批次保存在当前浏览器 IndexedDB，刷新不丢失。
- Provider 配置：API URL、Model、API Key 保存在当前浏览器 localStorage。

## 最小验收流程

1. `npm install`
2. `cp .env.example .env`
3. `npm run dev`
4. 打开 `http://127.0.0.1:5173/`
5. 在 Provider 设置里补全 Model / API Key
6. 生成一张图，确认预览和作品区更新
7. 保存一个 Prompt 模板并在模板库里搜索 / 复制
8. 打开图片墙，确认搜索 / 筛选 / 收藏 / 标签 / 重试入口可用
9. 勾选后下载 ZIP，确认包含图片和 metadata
10. 刷新页面，确认本地持久化恢复

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


## Docker 部署

项目提供了生产环境 Docker 配置：前端先通过 Vite 构建静态文件，再由 Nginx 提供访问，并在容器内把 `/sub2api/*` 反向代理到你的生图 API 服务。

### 使用 Docker Compose

```bash
cp .env.example .env
# 修改 .env 中的 SUB2API_PROXY_TARGET，例如：
# SUB2API_PROXY_TARGET=https://your-sub2api.example.com

docker compose up -d --build
```

默认访问地址：`http://127.0.0.1:8080/`

如果你的服务器已有宝塔、1Panel、Nginx Proxy Manager 或宿主机 Nginx，可以把外层域名反代到：

```bash
http://127.0.0.1:8080
```

### 直接使用 Docker

```bash
docker build -t miastra-studio:latest .
docker run -d \
  --name miastra-studio \
  --restart unless-stopped \
  -p 8080:80 \
  -e SUB2API_PROXY_TARGET=https://your-sub2api.example.com \
  miastra-studio:latest
```

### 生产代理说明

- Docker 运行时的 `/sub2api/` 代理由 `SUB2API_PROXY_TARGET` 控制。
- Nginx 已内置较长的生图超时：`proxy_read_timeout`、`proxy_send_timeout`、`send_timeout` 默认 `600s`。
- Nginx 已关闭代理缓冲：`proxy_buffering off`、`proxy_request_buffering off`，更适合长耗时生成和 SSE/流式响应。
- 如果前端 Provider 配置中 `API URL` 留空，请求会走当前站点的 `/sub2api/v1/images/generations` 和 `/sub2api/v1/images/edits`。
- 如果前端 Provider 配置中填写了完整远端 API URL，则浏览器会直接请求该远端服务，需要远端服务允许 CORS。

### 常用环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SUB2API_PROXY_TARGET` | `http://127.0.0.1:18080` | 生产容器内 `/sub2api/` 的上游服务地址 |
| `CLIENT_MAX_BODY_SIZE` | `25m` | 图生图上传请求体大小上限 |
| `PROXY_CONNECT_TIMEOUT` | `60s` | 连接上游超时 |
| `PROXY_SEND_TIMEOUT` | `600s` | 向上游发送请求超时 |
| `PROXY_READ_TIMEOUT` | `600s` | 等待上游生成响应超时 |
| `SEND_TIMEOUT` | `600s` | Nginx 向浏览器发送响应超时 |

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
