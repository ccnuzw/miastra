import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { inspectorPlugin } from './plugins/inspector-plugin'
import { safeCssPlugin } from './plugins/safe-css-plugin'

const sub2apiTarget = process.env.VITE_SUB2API_PROXY_TARGET || 'http://127.0.0.1:18080'

export default defineConfig({
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
})
