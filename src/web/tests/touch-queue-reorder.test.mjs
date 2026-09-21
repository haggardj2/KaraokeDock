import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../src/touch-queue-reorder.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const module = { exports: {} }
new Function('require', 'exports', compiled)(name => name === './queue-drag' ? require('../src/queue-drag.ts') : require(name), module.exports)
const { attachTouchQueueReorder } = module.exports

describe('mobile whole-card reordering', () => {
  const originals = new Map()
  let listeners, row, element, cleanup, drops, targets, enabled, frames, dropTarget, ends
  beforeEach(() => {
    mock.timers.enable({ apis: ['setTimeout'] })
    listeners = new Map(); drops = []; targets = []; frames = new Map(); enabled = true; ends = 0
    dropTarget = '2'
    class Element {
      closest(selector) { return selector.startsWith('[data-') ? row : null }
    }
    element = new Element()
    row = { draggable: true, parentElement: null, getAttribute: () => '9007199254740993' }
    for (const [key, value] of Object.entries({
      Element,
      document: { elementFromPoint: () => dropTarget === null ? null : { closest: () => ({ getAttribute: () => dropTarget }) } },
      window: { innerHeight: 800, scrollBy() {} },
      requestAnimationFrame: fn => { frames.set(1, fn); return 1 },
      cancelAnimationFrame: id => frames.delete(id),
    })) {
      originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
      Object.defineProperty(globalThis, key, { value, writable: true, configurable: true })
    }
    cleanup = attachTouchQueueReorder({
      contains: candidate => candidate === row,
      addEventListener: (type, fn) => listeners.set(type, fn),
      removeEventListener: type => listeners.delete(type),
    }, {
      attribute: 'data-singer-drag-id', isEnabled: () => enabled,
      onStart() {}, onTarget: id => targets.push(id), onEnd: () => ends++,
      onDrop: (...ids) => drops.push(ids),
    })
  })
  afterEach(() => {
    cleanup()
    mock.timers.reset()
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
    originals.clear()
  })
  function event(y = 100, extras = {}) {
    const touch = { identifier: 1, clientX: 100, clientY: y }
    return { target: element, touches: [touch], changedTouches: [touch], cancelable: true,
      preventDefault: mock.fn(), ...extras }
  }
  function holdAndMove() {
    listeners.get('touchstart')(event())
    mock.timers.tick(300)
    listeners.get('touchmove')(event(250))
  }
  it('suppresses native HTML dragging and saves a held card exactly once on lift', () => {
    listeners.get('touchstart')(event())
    assert.equal(row.draggable, false)
    mock.timers.tick(300)
    const move = event(250)
    listeners.get('touchmove')(move)
    assert.equal(move.preventDefault.mock.callCount(), 1)
    assert.deepEqual(targets, ['2'])
    listeners.get('touchend')(event(250))
    assert.deepEqual(drops, [['9007199254740993', '2']])
    assert.equal(row.draggable, true)
    assert.equal(frames.size, 0)
    assert.equal(ends, 1)
  })
  it('leaves ordinary swipes available for scrolling and never saves them', () => {
    listeners.get('touchstart')(event())
    const swipe = event(130)
    listeners.get('touchmove')(swipe)
    mock.timers.tick(500)
    listeners.get('touchend')(event(250))
    assert.equal(swipe.preventDefault.mock.callCount(), 0)
    assert.deepEqual(drops, [])
    assert.equal(row.draggable, true)
  })
  it('cancels interrupted or noncancelable gestures rather than saving stale targets', () => {
    holdAndMove()
    listeners.get('touchcancel')()
    listeners.get('touchend')(event(250))
    assert.deepEqual(drops, [])
    holdAndMove()
    listeners.get('touchmove')(event(250, { cancelable: false }))
    listeners.get('touchend')(event(250))
    assert.deepEqual(drops, [])
  })
  it('does not capture button interactions or save after permissions change', () => {
    element.closest = () => ({})
    listeners.get('touchstart')(event())
    mock.timers.tick(500)
    assert.equal(row.draggable, true)
    element.closest = selector => selector.startsWith('[data-') ? row : null
    holdAndMove()
    enabled = false
    listeners.get('touchend')(event(250))
    assert.deepEqual(drops, [])
  })
  it('cleans up listeners, pending holds and scroll frames on unmount', () => {
    holdAndMove()
    cleanup()
    assert.equal(listeners.size, 0)
    assert.equal(frames.size, 0)
    assert.equal(row.draggable, true)
    assert.deepEqual(drops, [])
  })
})
