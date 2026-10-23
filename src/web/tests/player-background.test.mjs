import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { transpile } from './transpile.mjs'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../src/components/PlayerBackgroundImage.tsx', import.meta.url), 'utf8')
const compiled = transpile(source)

function mount() {
  const values = []
  const errors = []
  let index = 0
  const module = { exports: {} }
  new Function('require', 'module', 'console', compiled)(name => name === 'react' ? {
    useState(initial) {
      const key = index++
      if (!(key in values)) values[key] = initial
      return [values[key], value => { values[key] = typeof value === 'function' ? value(values[key]) : value }]
    },
  } : require(name), module, { error: (...args) => errors.push(args) })
  return {
    errors,
    render(src = '/api/player/background/image?updatedAt=1', active = true) {
      index = 0
      return module.exports.default({ src, active }).props.children
    },
  }
}

describe('Player background images', () => {
  it('renders a full-screen image without changing the existing cover/dimming behavior', () => {
    const app = mount()
    const [image, error] = app.render()
    assert.equal(image.type, 'img')
    assert.equal(image.props.src, '/api/player/background/image?updatedAt=1')
    assert.equal(image.props.style.objectFit, 'cover')
    assert.equal(image.props.style.filter, 'brightness(0.58)')
    assert.equal(image.props.style.height, '100%')
    assert.equal(error, false)
  })

  it('surfaces missing images and allows retry rather than silently showing black', () => {
    const app = mount()
    const [image] = app.render()
    image.props.onError()
    const [, error] = app.render()
    assert.equal(error.props.role, 'alert')
    assert.equal(app.errors.length, 1)
    error.props.children.find(child => child?.type === 'button').props.onClick()
    const [retried, cleared] = app.render()
    assert.notEqual(retried.key, image.key)
    assert.equal(cleared, false)
    retried.props.onLoad()
    assert.equal(app.render()[1], false)
  })

  it('does not carry a failed old URL into a replacement image or show errors for hidden slides', () => {
    const app = mount()
    app.render()[0].props.onError()
    assert.equal(app.render('/api/player/background/image?updatedAt=2')[1], false)
    assert.equal(app.render(undefined, false)[1], false)
  })
})
