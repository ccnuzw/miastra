import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pluginDir = path.dirname(fileURLToPath(import.meta.url))

/**
 * AgentHub Inspector Vite Plugin
 *
 * Development-only plugin that injects an inspector script into the preview project.
 * The script enables DOM element selection via hover-highlight + click-select,
 * then serializes element info and sends it to the parent window via postMessage.
 */
export function inspectorPlugin(): Plugin {
  let inspectorScript = ''

  return {
    name: 'agenthub-inspector',
    apply: 'serve',

    configResolved() {
      const scriptPath = path.resolve(pluginDir, 'inspector-runtime.js')
      if (fs.existsSync(scriptPath)) {
        inspectorScript = fs.readFileSync(scriptPath, 'utf-8')
      }
    },

    transformIndexHtml(html: string) {
      const processed = html.replace(
        /<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
        '',
      )
      return processed.replace(
        '</body>',
        '<script src="/__agenthub_inspector.js"></script></body>',
      )
    },

    configureServer(server) {
      server.middlewares.use('/__agenthub_inspector.js', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript')
        res.setHeader('Cache-Control', 'no-cache')
        res.end(inspectorScript)
      })
    },
  }
}
