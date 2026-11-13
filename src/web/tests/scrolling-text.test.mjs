import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { transpile } from './transpile.mjs'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../src/components/ScrollingText.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/components/ScrollingText.css', import.meta.url), 'utf8')
const compiled = transpile(source)

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
  new Function('require', 'module', 'ResizeObserver', compiled)(name => {
    if (name === 'react') return hooks
    if (name.endsWith('.css')) return {}
    return require(name)
  }, module, ResizeObserver)
  function render(label = 'Next: Long Song - Artist', props = {}) {
    refIndex = 0
    return module.exports.default({ label, children: 'Long Song - Artist', ...props })
  }
  render()
  cleanup = effect()
  return {
    viewport, content, observed, render,
    resize: () => resize(),
    unmount: () => { cleanup(); return disconnected },
  }
}

describe('scrolling text', () => {
  it('keeps fitting titles static without adding a keyboard stop', () => {
    const app = mount(220, 100)
    const element = app.render()
    assert.equal(element.props.className, 'scrolling-text')
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
    assert.equal(element.props.style['--scroll-distance'], '-320px')
    assert.equal(element.props.style['--scroll-duration'], '16.8s')
    app.unmount()
  })

  it('remeasures on resize and removes animation when the title fits', () => {
    const app = mount(180, 500)
    app.viewport.clientWidth = 600
    app.resize()
    assert.equal(app.render().props.className, 'scrolling-text')
    app.content.scrollWidth = 800
    app.resize()
    assert.equal(app.render('Next: Replacement Song').props.style['--scroll-distance'], '-200px')
    assert.equal(app.render('Next: Replacement Song').props.children.key, 'Next: Replacement Song')
    app.unmount()
  })

  it('adds the hover-only modifier and any extra class names', () => {
    const app = mount(180, 500)
    assert.equal(app.render(undefined, { mode: 'hover', className: 'extra' }).props.className, 'scrolling-text scrolling-text-hover overflows extra')
    app.unmount()
  })

  it('scrolls at every width, starts hover-mode rows only on hover, and keeps reduced-motion/manual-scrolling fallbacks', () => {
    assert.doesNotMatch(css, /@media \(max-width/)
    assert.match(css, /\.scrolling-text\.overflows:not\(\.scrolling-text-hover\) \.scrolling-text-content/)
    assert.match(css, /\.scrolling-text-hover\.overflows:hover \.scrolling-text-content/)
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*overflow-x: auto;[\s\S]*animation: none;/)
    assert.match(css, /\.scrolling-text\.overflows:focus-visible/)
  })
})
