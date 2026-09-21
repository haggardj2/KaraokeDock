import { readFileSync, existsSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

const publicFile = name => new URL(`../public/${name}`, import.meta.url)
const manifest = JSON.parse(readFileSync(publicFile('host.webmanifest'), 'utf8'))
const worker = readFileSync(publicFile('host-sw.js'), 'utf8')

function serviceWorker(fetch) {
  const events = new Map()
  let claimed = false
  runInNewContext(worker, {
    self: {
      location: { origin: 'https://karaoke.example' },
      addEventListener: (name, handler) => events.set(name, handler),
      clients: { claim: async () => { claimed = true } },
    },
    URL, Response, fetch,
  })
  return {
    async activate() {
      let completion
      events.get('activate')({ waitUntil: promise => { completion = promise } })
      await completion
      return claimed
    },
    request(path, options = {}) {
      let response
      events.get('fetch')({
        request: { url: new URL(path, 'https://karaoke.example').href, method: 'GET', mode: 'navigate', ...options },
        respondWith: promise => { response = promise },
      })
      return response
    },
  }
}

describe('Host PWA', () => {
  it('maps webpage favicons and Windows tiles to the supplied public assets', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
    assert.doesNotMatch(html, /href="\/icon.png"/)
    assert.match(html, /href="\/favicon.ico"/)
    assert.match(html, /name="msapplication-config" content="\/browserconfig.xml"/)
    for (const size of [16, 32, 48]) {
      assert.ok(html.includes(`sizes="${size}x${size}" href="/favicon-${size}x${size}.png"`))
      const png = readFileSync(publicFile(`favicon-${size}x${size}.png`))
      assert.equal(png.readUInt32BE(16), size)
      assert.equal(png.readUInt32BE(20), size)
    }
    const config = readFileSync(publicFile('browserconfig.xml'), 'utf8')
    assert.match(config, /src="\/mstile-150x150.png"/)
    assert.ok(existsSync(publicFile('mstile-150x150.png')))
    assert.match(worker, /href="\/favicon.ico"/)
  })
  it('launches Host standalone with a stable identity and actual install-size icons', () => {
    assert.equal(manifest.id, '/host')
    assert.equal(manifest.start_url, '/host')
    assert.equal(manifest.display, 'standalone')
    assert.equal(manifest.scope, '/')
    for (const size of [192, 512]) {
      const icon = manifest.icons.find(icon => icon.sizes === `${size}x${size}`)
      assert.ok(icon)
      const data = readFileSync(publicFile(icon.src.slice(1)))
      assert.equal(data.readUInt32BE(16), size)
      assert.equal(data.readUInt32BE(20), size)
    }
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
    assert.match(html, /rel="manifest" href="\/host.webmanifest"/)
    assert.match(html, /rel="apple-touch-icon"/)
    assert.ok(existsSync(publicFile('apple-touch-icon.png')))
  })

  it('serves fresh Host navigation from the network and activates without a forced reload', async () => {
    const live = new Response('live app')
    const sw = serviceWorker(async request => {
      assert.equal(request.url, 'https://karaoke.example/host')
      return live
    })
    assert.equal(await sw.activate(), true)
    assert.equal(await sw.request('/host'), live)
  })

  it('shows an explicit offline page without cached queue data or credentials', async () => {
    const sw = serviceWorker(async () => { throw new TypeError('Network unavailable') })
    const response = await sw.request('/host')
    assert.equal(response.status, 503)
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
    const html = await response.text()
    assert.match(html, /Host is offline/)
    assert.match(html, /href="\/host"/)
    assert.doesNotMatch(worker, /caches\.|localStorage|indexedDB|skipWaiting/)
  })

  it('never intercepts API, media, authentication callbacks, other pages, or non-navigation requests', () => {
    const sw = serviceWorker(() => { assert.fail('Must not intercept') })
    for (const url of ['/api/queue', '/media/song.mp4', '/admin', '/requests', '/host?oidc_code=secret',
      '/host?social_code=secret', 'https://provider.example/host']) {
      assert.equal(sw.request(url), undefined)
    }
    assert.equal(sw.request('/host', { method: 'POST' }), undefined)
    assert.equal(sw.request('/host', { mode: 'cors' }), undefined)
  })
})
