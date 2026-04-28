import type { Plugin } from "vite"
import fs from "fs"
import path from "path"

/**
 * AgentHub Inspector Vite Plugin
 *
 * Development-only plugin that injects an inspector script into the preview project.
 * The script enables DOM element selection via hover-highlight + click-select,
 * then serializes element info and sends it to the parent window via postMessage.
 */
export function inspectorPlugin(): Plugin {
  let inspectorScript = ""

  return {
    name: "agenthub-inspector",
    apply: "serve",

    configResolved() {
      // Load inspector script at startup
      const scriptPath = path.resolve(__dirname, "inspector-runtime.js")
      if (fs.existsSync(scriptPath)) {
        inspectorScript = fs.readFileSync(scriptPath, "utf-8")
      }
    },

    transformIndexHtml(html: string) {
      // Remove any CSP meta tags that might block the inspector script
      let processed = html.replace(
        /<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
        ""
      )
      // Inject inspector script before </body>
      return processed.replace(
        "</body>",
        '<script src="/__agenthub_inspector.js"></script></body>'
      )
    },

    configureServer(server) {
      // Serve the inspector script as a virtual module
      server.middlewares.use("/__agenthub_inspector.js", (_req, res) => {
        res.setHeader("Content-Type", "application/javascript")
        res.setHeader("Cache-Control", "no-cache")
        res.end(inspectorScript)
      })
    },
  }
}
