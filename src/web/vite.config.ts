import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
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
