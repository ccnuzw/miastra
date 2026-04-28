FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner

ENV NGINX_PORT=80 \
    CLIENT_MAX_BODY_SIZE=25m \
    SUB2API_PROXY_TARGET=http://127.0.0.1:18080 \
    PROXY_CONNECT_TIMEOUT=60s \
    PROXY_SEND_TIMEOUT=600s \
    PROXY_READ_TIMEOUT=600s \
    SEND_TIMEOUT=600s

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${NGINX_PORT}/ >/dev/null || exit 1
