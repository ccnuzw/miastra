import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { inspectorPlugin } from './plugins/inspector-plugin'
import { safeCssPlugin } from './plugins/safe-css-plugin'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const sub2apiTarget = env.VITE_SUB2API_PROXY_TARGET || 'http://127.0.0.1:18080'
  console.info(`[miastra] /sub2api proxy target: ${sub2apiTarget}`)

  return {
    plugins: [react(), inspectorPlugin(), safeCssPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@ui': path.resolve(__dirname, './src/components/ui'),
        '@store': path.resolve(__dirname, './src/store'),
      },
    },
    server: {
      port: 5173,
      proxy: {
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
  }
})
