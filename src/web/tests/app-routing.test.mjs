import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { transpile } from './transpile.mjs'

const require = createRequire(import.meta.url)
const packageInfo = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const versionModule = { exports: {} }
new Function('require', 'module', transpile(
  readFileSync(new URL('../src/components/AppVersion.tsx', import.meta.url), 'utf8'),
))(name => name === '../../package.json' ? packageInfo : require(name), versionModule)
const source = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8')
const compiled = transpile(source)

function renderRoute(pathname, { loggedIn = false, menuOpen = false } = {}) {
  let tree, authMounted = false
  let stateIndex = 0
  const messages = []
  const mocks = {
    react: {
      ...require('react'),
      useState: initial => React.useState(stateIndex++ === 0 && menuOpen ? true : initial),
    },
    'react-dom/client': { createRoot: () => ({ render(value) { tree = value } }) },
    'react-router-dom': {
      ...require('react-router-dom'),
      BrowserRouter: ({ children }) => React.createElement(MemoryRouter, { initialEntries: [pathname] }, children),
    },
    './auth-context': {
      AuthProvider: ({ children }) => { authMounted = true; return children },
      useAuth: () => ({ profile: {}, isLoggedIn: loggedIn, sessionError: null }),
    },
    './api': {},
    './components/SingerAvatar': { profileAssetUrl: () => null },
    './components/AppInstall': { __esModule: true, default: () => React.createElement('aside', null, 'Install controls') },
    './components/AppVersion': versionModule.exports,
    './appManifest': { updateAppManifest() {} },
  }
  for (const name of ['Player', 'Requests', 'Host', 'Admin']) {
    mocks[`./pages/${name}`] = { __esModule: true, default: () => React.createElement('main', null, `${name} page`) }
  }
  new Function('require', 'module', 'window', 'document', 'console', compiled)(
    name => name in mocks ? mocks[name] : require(name),
    { exports: {} }, { location: { pathname } }, { getElementById: () => ({}) },
    { info: message => messages.push(message) },
  )
  return { html: renderToStaticMarkup(tree), messages, get authMounted() { return authMounted } }
}

describe('client page routing', () => {
  it('does not render navigation, authentication, or installation controls for unknown paths', () => {
    for (const path of ['/cast-diagnostics', '/cast-receiver', '/missing', '/host/extra', '/Host']) {
      const result = renderRoute(path)
      assert.match(result.html, /404 - Page not found/, path)
      assert.doesNotMatch(result.html, /<nav|Install controls/, path)
      assert.equal(result.authMounted, false, path)
    }
  })

  it('keeps the normal layout and correct page on registered routes', () => {
    for (const [path, page] of [['/', 'Requests'], ['/request', 'Requests'], ['/player', 'Player'], ['/host', 'Host'], ['/admin', 'Admin']]) {
      const result = renderRoute(path)
      assert.match(result.html, /<nav/, path)
      assert.ok(result.html.includes(`${page} page`), path)
      assert.equal(result.authMounted, true, path)
    }
  })

  it('logs the package version on load without displaying it outside the profile menu', () => {
    for (const route of ['/', '/request', '/host', '/admin', '/player', '/player/']) {
      const { html, messages } = renderRoute(route)
      assert.deepEqual(messages, [`KaraokeDock v${packageInfo.version}`], route)
      assert.equal(html.includes(`Application version ${packageInfo.version}`), false, route)
    }
    const requests = readFileSync(new URL('../src/pages/Requests.tsx', import.meta.url), 'utf8')
    assert.match(requests, /<nav id="request-profile-menu"[\s\S]*?<AppVersion\s*\/>[\s\S]*?<\/nav>/)
    const player = readFileSync(new URL('../src/pages/Player.tsx', import.meta.url), 'utf8')
    assert.doesNotMatch(player, /AppVersion/)
  })

  it('shows the version below Logout only when the Host or Admin profile menu is open', () => {
    for (const route of ['/host', '/admin']) {
      const closed = renderRoute(route, { loggedIn: true })
      assert.doesNotMatch(closed.html, /Application version/)
      const open = renderRoute(route, { loggedIn: true, menuOpen: true })
      assert.match(open.html, /Logout[\s\S]*Application version/)
      assert.ok(open.html.includes(`Application version ${packageInfo.version}`))
    }
    const player = renderRoute('/player', { loggedIn: true, menuOpen: true })
    assert.doesNotMatch(player.html, /Application version/)
  })
})
