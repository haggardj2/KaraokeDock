import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'

function routePages(req: IncomingMessage, res: ServerResponse, next: () => void) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()
  const url = req.url || '/'
  const pathname = url.split('?')[0]
  const query = url.slice(pathname.length)
  if (/^\/requests\/?$/.test(pathname)) {
    res.writeHead(308, { Location: `/request${query}` })
    res.end()
    return
  }
  if (/^\/(?:player\/?|host\/?|admin\/?|request\/?)?$/.test(pathname)) {
    req.url = `/index.html${query}`
  } else {
    try {
      if (/\.html?$/i.test(decodeURIComponent(pathname))) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('404 - Page not found')
        return
      }
    } catch {
      res.writeHead(400)
      res.end()
      return
    }
  }
  next()
}

export default defineConfig({
  appType: 'mpa',
  plugins: [
    {
      name: 'registered-page-routes',
      configureServer(server) { server.middlewares.use(routePages) },
      configurePreviewServer(server) { server.middlewares.use(routePages) },
    },
    {
      name: 'croppie-metadata-only',
      enforce: 'pre',
      transform(code, id) {
        if (!id.split('?')[0].replaceAll('\\', '/').endsWith('/croppie/croppie.js')) return
        // We save crop coordinates, not canvas pixels. Provider images need not allow CORS.
        const corsAssignment = "img.setAttribute('crossOrigin', 'anonymous');"
        if (!code.includes(corsAssignment)) throw new Error('Croppie image loader changed; review metadata-only integration.')
        const start = '(function (root, factory) {'
        const factory = "}(typeof self !== 'undefined' ? self : this, function () {"
        const end = code.lastIndexOf('}));')
        const promiseStart = code.indexOf("    if (typeof Promise !== 'function') {")
        const promiseEnd = code.indexOf('    if (typeof window !== \'undefined\' && typeof window.CustomEvent')
        if (!code.includes(start) || !code.includes(factory) || end < 0 ||
            promiseStart < code.indexOf(factory) || promiseEnd <= promiseStart) {
          throw new Error('Croppie module wrapper changed.')
        }
        // Supported Vite browsers have native Promises; the obsolete polyfill exports CommonJS.
        const body = code.slice(code.indexOf(factory) + factory.length, promiseStart) +
          code.slice(promiseEnd, end)
        // Adapt the pinned UMD entry to ESM for both Vite development and production.
        return code.slice(0, code.indexOf(start)) + 'export default (function () {' +
          body.replace(corsAssignment, '') + '})();'
      },
    },
    react(),
  ],
  optimizeDeps: { exclude: ['croppie'] },
  resolve: {
    extensions: ['.tsx', '.ts', '.mjs', '.js', '.jsx', '.json']
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true }
})
