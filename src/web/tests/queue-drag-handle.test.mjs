import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../src/components/QueueDragHandle.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText
let handlers
const module = { exports: {} }
new Function('require', 'exports', compiled)((name) => {
  if (name === '../queue-drag') return require('../src/queue-drag.ts')
  if (name !== 'react/jsx-runtime') return require(name)
  const runtime = require(name)
  return { ...runtime, jsx: (type, props, key) => {
    if (type === 'button') handlers = props
    return runtime.jsx(type, props, key)
  } }
}, module.exports)
const QueueDragHandle = module.exports.default

describe('queue drag handle', () => {
  let targetId, drops, targets, ends, captured, target, frames
  const originals = new Map()

  beforeEach(() => {
    targetId = '2'; drops = []; targets = []; ends = 0; captured = false; frames = new Map()
    const globals = {
      document: {
        elementFromPoint: () => targetId === null ? null : { closest: () => ({ getAttribute: () => targetId }) },
        querySelectorAll: () => ['9007199254740993', '2', '3'].map(id => ({ getAttribute: () => id })),
      },
      window: { innerHeight: 800, scrollBy() {} },
      requestAnimationFrame: callback => { frames.set(frames.size + 1, callback); return frames.size },
      cancelAnimationFrame: id => frames.delete(id),
    }
    for (const [key, value] of Object.entries(globals)) {
      originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
      Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
    }
    target = {
      parentElement: null,
      setPointerCapture: () => { captured = true },
      hasPointerCapture: () => captured,
      releasePointerCapture: () => { captured = false },
    }
  })

  afterEach(() => {
    for (const [key, original] of originals) {
      if (original) Object.defineProperty(globalThis, key, original)
      else delete globalThis[key]
    }
    originals.clear()
  })

  function render(disabled = false) {
    renderToStaticMarkup(React.createElement(QueueDragHandle, {
      id: '9007199254740993', attribute: 'data-singer-drag-id', label: 'Reorder singer', disabled,
      onStart() {}, onTarget: id => targets.push(id), onEnd: () => { ends++ },
      onDrop: (...ids) => drops.push(ids),
    }, '1'))
  }
  function event(overrides = {}) {
    return { pointerId: 1, button: 0, isPrimary: true, clientX: 20, clientY: 20, currentTarget: target, preventDefault() {}, ...overrides }
  }
  function drag() {
    handlers.onPointerDown(event())
    handlers.onPointerMove(event({ clientY: 180 }))
  }

  it('captures touch movement and commits exact singer IDs once on release', () => {
    render(); drag()
    assert.equal(captured, true)
    assert.equal(handlers.style.touchAction, 'none')
    assert.deepEqual(targets, ['2'])
    handlers.onPointerUp(event({ clientY: 180 }))
    handlers.onLostPointerCapture(event())
    assert.deepEqual(drops, [['9007199254740993', '2']])
    assert.equal(captured, false)
    assert.equal(frames.size, 0)
    assert.equal(ends, 1)
  })

  it('does not save taps, same-row drops, or drops outside the queue', () => {
    render()
    handlers.onPointerDown(event()); handlers.onPointerUp(event())
    targetId = '9007199254740993'
    drag(); handlers.onPointerUp(event({ clientY: 180 }))
    targetId = null
    drag(); handlers.onPointerUp(event({ clientY: 180 }))
    assert.deepEqual(drops, [])
  })

  it('cancels a gesture without saving or leaving an animation running', () => {
    render(); drag(); handlers.onPointerCancel(event())
    assert.deepEqual(drops, [])
    assert.equal(captured, false)
    assert.equal(frames.size, 0)
  })

  it('ignores a second pointer and disabled handles', () => {
    render(); drag()
    handlers.onPointerUp(event({ pointerId: 2 }))
    assert.deepEqual(drops, [])
    assert.equal(captured, true)
    handlers.onPointerCancel(event())
    render(true); drag(); handlers.onPointerUp(event())
    assert.deepEqual(drops, [])
    assert.equal(captured, false)
  })

  it('allows keyboard reorder but does not move beyond list boundaries', () => {
    render()
    handlers.onKeyDown(event({ key: 'ArrowUp' }))
    handlers.onKeyDown(event({ key: 'ArrowDown' }))
    assert.deepEqual(drops, [['9007199254740993', '2']])
  })
})
