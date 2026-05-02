import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { inspectorPlugin } from './plugins/inspector-plugin'
import { safeCssPlugin } from './plugins/safe-css-plugin'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const sub2apiTarget = env.VITE_SUB2API_PROXY_TARGET || 'http://127.0.0.1:18080'
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:18081'
  console.info(`[miastra] /sub2api proxy target: ${sub2apiTarget}`)
  console.info(`[miastra] /api proxy target: ${apiTarget}`)

  return {
    plugins: [react(), inspectorPlugin(), safeCssPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, './src'),
        '@ui': path.resolve(rootDir, './src/components/ui'),
        '@store': path.resolve(rootDir, './src/store'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        '/sub2api': {
          target: sub2apiTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (requestPath) => requestPath.replace(/^\/sub2api/, ''),
        },
      },
      hmr: {
        overlay: true,
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('jszip')) return 'zip'
            if (id.includes('react-router')) return 'router'
            if (id.includes('lucide-react')) return 'icons'
            return 'vendor'
          },
        },
      },
    },
  }
})
