import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { transpile } from './transpile.mjs'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../src/components/AppInstall.tsx', import.meta.url), 'utf8')
const compiled = transpile(source.replaceAll('import.meta.env.PROD', 'false'))

function mount(storage, app = 'Host', installed = false, userAgent = '') {
  const states = []
  const warnings = []
  const effects = []
  const browser = Object.assign(new EventTarget(), {
    localStorage: storage,
    matchMedia: () => Object.assign(new EventTarget(), { matches: installed }),
  })
  let index = 0
  const module = { exports: {} }
  new Function('require', 'module', 'window', 'navigator', 'console', compiled)(name => {
    if (name === 'react') return {
      useEffect(callback) { effects.push(callback) },
      useState(initial) {
        const current = index++
        if (!(current in states)) states[current] = typeof initial === 'function' ? initial() : initial
        return [states[current], value => { states[current] = value }]
      },
    }
    if (name === 'react-router-dom') return { useLocation: () => ({ pathname: '/host' }) }
    if (name === './ProfileDialog') return { default: () => null }
    if (name === '../appManifest') return {}
    return require(name)
  }, module, browser, { userAgent }, { warn: (...args) => warnings.push(args) })
  return {
    warnings, browser,
    runEffects() { effects.splice(0).forEach(effect => effect()) },
    render() { index = 0; return module.exports.InstallApp({ app, visible: true }) },
  }
}

describe('Host installation prompt dismissal', () => {
  it('hides the entire banner and remembers dismissal after a page reload', () => {
    const values = new Map()
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
    const app = mount(storage)
    const banner = app.render()
    const dismiss = banner.props.children.find(child => child?.props?.['aria-label'] === 'Dismiss Host app installation prompt')
    assert.ok(dismiss)
    assert.equal(dismiss.props.style.minHeight, 44)
    dismiss.props.onClick()
    assert.equal(app.render(), null)
    assert.equal(mount(storage).render(), null)
  })

  it('still dismisses for the current page when browser storage is unavailable', () => {
    const app = mount({
      getItem() { throw new Error('Storage blocked') },
      setItem() { throw new Error('Storage blocked') },
    })
    const banner = app.render()
    banner.props.children.find(child => child?.props?.['aria-label']).props.onClick()
    assert.equal(app.render(), null)
    assert.equal(app.warnings.length, 2)
  })

  it('keeps Player dismissal independent of Host and floats above the display', () => {
    const values = new Map()
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
    const player = mount(storage, 'Player')
    const banner = player.render()
    assert.equal(banner.props.style.position, 'fixed')
    assert.equal(banner.props.children[0].props.children, 'Install Player app')
    banner.props.children.find(child => child?.props?.['aria-label'] === 'Dismiss Player app installation prompt').props.onClick()
    assert.equal(player.render(), null)
    assert.equal(mount(storage, 'Player').render(), null)
    assert.ok(mount(storage, 'Host').render())
    assert.equal(values.get('karaoke-player-install-dismissed'), 'true')
  })

  it('hides installation controls in the installed Player', () => {
    const player = mount({ getItem: () => null }, 'Player', true)
    player.render()
    player.runEffects()
    assert.equal(player.render(), null)
  })

  it('does not offer PWA installation inside the native Android TV Player', () => {
    const player = mount({ getItem: () => null }, 'Player', false, 'Android WebView KaraokeDockTV/1.0')
    player.render()
    player.runEffects()
    assert.equal(player.render(), null)
  })

  it('uses the browser install prompt and hides it when installation completes', async () => {
    const player = mount({ getItem: () => null }, 'Player')
    player.render()
    player.runEffects()
    let prompted = false
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: async () => { prompted = true },
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    })
    player.browser.dispatchEvent(event)
    assert.ok(event.defaultPrevented)
    player.render().props.children[0].props.onClick()
    await new Promise(resolve => setImmediate(resolve))
    assert.ok(prompted)
    player.browser.dispatchEvent(new Event('appinstalled'))
    assert.equal(player.render(), null)
  })
})
