import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../src/components/QueueSongText.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/components/QueueSongText.css', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText

function mount(viewportWidth, textWidth) {
  const viewport = { clientWidth: viewportWidth }
  const content = { scrollWidth: textWidth }
  let overflow = 0, refIndex = 0, effect, resize, cleanup, disconnected = false
  const observed = []
  const module = { exports: {} }
  const hooks = {
    useRef: () => ({ current: refIndex++ === 0 ? viewport : content }),
    useState: () => [overflow, value => { overflow = value }],
    useEffect: callback => { effect = callback },
  }
  class ResizeObserver {
    constructor(callback) { resize = callback }
    observe(element) { observed.push(element) }
    disconnect() { disconnected = true }
  }
  new Function('require', 'exports', 'ResizeObserver', compiled)(name => {
    if (name === 'react') return hooks
    if (name.endsWith('.css')) return {}
    return require(name)
  }, module.exports, ResizeObserver)
  function render(label = 'Next: Long Song - Artist') {
    refIndex = 0
    return module.exports.default({ label, children: 'Long Song - Artist' })
  }
  render()
  cleanup = effect()
  return {
    viewport, content, observed, render,
    resize: () => resize(),
    unmount: () => { cleanup(); return disconnected },
  }
}

describe('overflowing queue song text', () => {
  it('keeps fitting titles static without adding a keyboard stop', () => {
    const app = mount(220, 100)
    const element = app.render()
    assert.equal(element.props.className, 'queue-song-text')
    assert.equal(element.props.tabIndex, undefined)
    assert.equal(app.observed.length, 2)
    assert.equal(app.unmount(), true)
  })

  it('measures overflow, exposes the full accessible title, and scrolls only the clipped distance', () => {
    const app = mount(180, 500)
    const element = app.render()
    assert.match(element.props.className, /overflows/)
    assert.equal(element.props.tabIndex, 0)
    assert.equal(element.props['aria-label'], 'Next: Long Song - Artist')
    assert.equal(element.props.title, 'Next: Long Song - Artist')
    assert.equal(element.props.style['--song-scroll-distance'], '-320px')
    assert.equal(element.props.style['--song-scroll-duration'], '16.8s')
    app.unmount()
  })

  it('remeasures on resize and removes animation when the title fits', () => {
    const app = mount(180, 500)
    app.viewport.clientWidth = 600
    app.resize()
    assert.equal(app.render().props.className, 'queue-song-text')
    app.content.scrollWidth = 800
    app.resize()
    assert.equal(app.render('Next: Replacement Song').props.style['--song-scroll-distance'], '-200px')
    assert.equal(app.render('Next: Replacement Song').props.children.key, 'Next: Replacement Song')
    app.unmount()
  })

  it('limits automatic movement to mobile and provides reduced-motion/manual-scrolling fallbacks', () => {
    assert.match(css, /@media \(max-width: 640px\)/)
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*overflow-x: auto;[\s\S]*animation: none;/)
    assert.match(css, /\.queue-song-text:focus/)
  })
})
