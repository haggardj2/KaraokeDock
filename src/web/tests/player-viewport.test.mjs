import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { observePlayerViewport } from '../src/playerViewport.ts'

function mount({ height = 800, visibleHeight = 720, scale = 1, visualViewport = true } = {}) {
  const viewportWindow = new EventTarget()
  viewportWindow.innerHeight = height
  viewportWindow.visualViewport = visualViewport
    ? Object.assign(new EventTarget(), { height: visibleHeight, scale })
    : null
  const values = new Map()
  const element = {
    style: {
      setProperty: (name, value) => values.set(name, value),
      removeProperty: name => values.delete(name),
    },
  }
  const cleanup = observePlayerViewport(element, viewportWindow)
  return { viewportWindow, values, cleanup, height: () => values.get('--player-viewport-height') }
}

describe('Player visible viewport sizing', () => {
  it('fits browser/PWA chrome even when the layout viewport remains taller', () => {
    const app = mount({ height: 360, visibleHeight: 280 })
    assert.equal(app.height(), '280px')
    app.viewportWindow.visualViewport.height = 320
    app.viewportWindow.visualViewport.dispatchEvent(new Event('resize'))
    assert.equal(app.height(), '320px')
    app.cleanup()
  })

  it('updates on rotation and window/fullscreen resizing', () => {
    const app = mount()
    app.viewportWindow.innerHeight = 360
    app.viewportWindow.visualViewport.height = 280
    app.viewportWindow.dispatchEvent(new Event('resize'))
    assert.equal(app.height(), '280px')
    app.viewportWindow.innerHeight = 900
    app.viewportWindow.visualViewport.height = 900
    app.viewportWindow.dispatchEvent(new Event('resize'))
    assert.equal(app.height(), '900px')
    app.cleanup()
  })

  it('preserves desktop height and supports browsers without VisualViewport', () => {
    const desktop = mount({ height: 1080, visibleHeight: 1080 })
    assert.equal(desktop.height(), '1080px')
    desktop.cleanup()
    const fallback = mount({ height: 1080, visualViewport: false })
    assert.equal(fallback.height(), '1080px')
    fallback.viewportWindow.innerHeight = 720
    fallback.viewportWindow.dispatchEvent(new Event('resize'))
    assert.equal(fallback.height(), '720px')
    fallback.cleanup()
  })

  it('does not shrink the layout to a pinch-zoomed viewport', () => {
    const app = mount({ height: 800, visibleHeight: 400, scale: 2 })
    assert.equal(app.height(), '800px')
    app.cleanup()
  })

  it('removes listeners and sizing on unmount or a change of player surface', () => {
    const app = mount()
    app.cleanup()
    app.viewportWindow.dispatchEvent(new Event('resize'))
    app.viewportWindow.visualViewport.dispatchEvent(new Event('resize'))
    assert.equal(app.values.size, 0)
  })
})
