import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createServer, preview } from 'vite'
import { app } from '../server.js'

for (const mode of ['production', 'development', 'preview']) {
  describe(`${mode} page routing`, () => {
    let server, vite, origin
    before(async () => {
      let handler = app
      if (mode === 'development') {
        vite = await createServer({
          server: { middlewareMode: true, hmr: false, preTransformRequests: false },
          optimizeDeps: { noDiscovery: true, include: [] },
        })
        handler = express().use(vite.middlewares)
      } else if (mode === 'preview') {
        const result = await preview({ preview: { port: 0, host: '127.0.0.1', strictPort: false } })
        server = result.httpServer
      }
      if (!server) await new Promise(resolve => { server = handler.listen(0, '127.0.0.1', resolve) })
      origin = `http://127.0.0.1:${server.address().port}`
    })
    after(async () => {
      server?.closeAllConnections()
      if (server?.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
      await vite?.close()
    })
    it('serves only registered pages and preserves assets', async () => {
      for (const route of ['/', '/player', '/host', '/admin', '/request', '/request/', '/admin?oidc_code=example']) {
        const response = await fetch(origin + route)
        assert.equal(response.status, 200, route)
        assert.match(await response.text(), /id="root"/, route)
      }
      for (const route of ['/host-sw.js', '/host.webmanifest', '/player.webmanifest', '/favicon.ico']) {
        assert.equal((await fetch(origin + route)).status, 200, route)
      }
    })
    it('returns 404 without the app shell for unknown pages, missing assets, and explicit HTML URLs', async () => {
      for (const route of ['/cast-diagnostics', '/cast-receiver', '/unknown', '/host/extra', '/Host', '/player//', '/index.html', '/%69ndex.html', '/missing.js']) {
        for (const method of ['GET', 'HEAD']) {
          const response = await fetch(origin + route, { method })
          assert.equal(response.status, 404, `${method} ${route}`)
          assert.doesNotMatch(await response.text(), /id="root"/, route)
        }
      }
    })
    it('redirects legacy request links without dropping query parameters', async () => {
      const response = await fetch(`${origin}/requests/?social=complete`, { redirect: 'manual' })
      assert.equal(response.status, 308)
      assert.equal(response.headers.get('location'), '/request?social=complete')
    })
  })
}
