import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { keepPlayerScreenAwake } from '../src/playerWakeLock.ts'

const settle = () => new Promise(resolve => setImmediate(resolve))
function sentinel() {
  return Object.assign(new EventTarget(), {
    released: false,
    releaseCalls: 0,
    async release() {
      this.releaseCalls++
      this.released = true
      this.dispatchEvent(new Event('release'))
    },
  })
}
function fixture(request = async () => sentinel(), userAgent = 'Chrome') {
  const page = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  const reports = []
  const requests = []
  const browser = { userAgent, wakeLock: { request: type => { requests.push(type); return request() } } }
  const control = keepPlayerScreenAwake(message => reports.push(message), page, browser)
  return {
    page, requests, reports, control,
    visibility(value) { page.visibilityState = value; page.dispatchEvent(new Event('visibilitychange')) },
  }
}

describe('Player screen wake lock', () => {
  it('requests a screen lock on opening, even while waiting for singers, without duplicating it on taps', async () => {
    const lock = sentinel()
    const app = fixture(async () => lock)
    await settle()
    assert.deepEqual(app.requests, ['screen'])
    assert.deepEqual(app.reports, [null])
    app.page.dispatchEvent(new Event('pointerdown'))
    app.control.retry()
    await settle()
    assert.equal(app.requests.length, 1)
    app.control.dispose()
    await settle()
    assert.equal(lock.releaseCalls, 1)
  })

  it('releases when hidden and reacquires when returning to the installed app', async () => {
    const locks = []
    const app = fixture(async () => { const lock = sentinel(); locks.push(lock); return lock })
    await settle()
    app.visibility('hidden')
    await settle()
    assert.equal(locks[0].released, true)
    app.visibility('visible')
    await settle()
    assert.equal(locks.length, 2)
    assert.equal(locks[1].released, false)
    app.control.dispose()
  })

  it('reports an OS release without an infinite reacquisition loop and lets the user retry', async () => {
    const locks = []
    const app = fixture(async () => { const lock = sentinel(); locks.push(lock); return lock })
    await settle()
    await locks[0].release()
    await settle()
    assert.match(app.reports.at(-1), /released/)
    assert.equal(app.requests.length, 1)
    app.page.dispatchEvent(new Event('pointerdown'))
    await settle()
    assert.equal(app.requests.length, 2)
    assert.equal(app.reports.at(-1), null)
    app.control.dispose()
  })

  it('shows denied requests and recovers on retry', async t => {
    const warning = t.mock.method(console, 'warn', () => {})
    let denied = true
    const app = fixture(async () => {
      if (denied) throw new DOMException('Denied', 'NotAllowedError')
      return sentinel()
    })
    await settle()
    assert.match(app.reports.at(-1), /Could not keep/)
    assert.equal(warning.mock.callCount(), 1)
    denied = false
    app.control.retry()
    await settle()
    assert.equal(app.reports.at(-1), null)
    app.control.dispose()
  })

  it('releases a pending lock if the Player unmounts before the request completes', async () => {
    let resolve
    const app = fixture(() => new Promise(done => { resolve = done }))
    app.control.retry()
    assert.equal(app.requests.length, 1)
    app.control.dispose()
    const lock = sentinel()
    resolve(lock)
    await settle()
    assert.equal(lock.releaseCalls, 1)
    assert.deepEqual(app.reports, [])
    app.visibility('visible')
    app.page.dispatchEvent(new Event('pointerdown'))
    assert.equal(app.requests.length, 1)
  })

  it('does not hold a lock granted after the app became hidden', async () => {
    let resolve
    const app = fixture(() => new Promise(done => { resolve = done }))
    app.visibility('hidden')
    const lock = sentinel()
    resolve(lock)
    await settle()
    assert.equal(lock.released, true)
    assert.deepEqual(app.reports, [])
    app.control.dispose()
  })

  it('handles a return to foreground while a stale lock is being released', async () => {
    let resolveRequest, resolveRelease
    const app = fixture(() => new Promise(done => { resolveRequest = done }))
    app.visibility('hidden')
    const lock = sentinel()
    lock.release = () => new Promise(done => { resolveRelease = done })
    resolveRequest(lock)
    await settle()
    app.visibility('visible')
    resolveRelease()
    await settle()
    assert.equal(app.requests.length, 2)
    const current = sentinel()
    resolveRequest(current)
    await settle()
    assert.equal(app.reports.at(-1), null)
    app.control.dispose()
  })

  it('explains unsupported browsers instead of claiming the display will stay awake', () => {
    const reports = []
    const page = Object.assign(new EventTarget(), { visibilityState: 'visible' })
    const control = keepPlayerScreenAwake(message => reports.push(message), page, { userAgent: 'Browser' })
    assert.match(reports[0], /cannot keep the screen awake/)
    control.dispose()
  })

  it('uses the APK native keep-screen-on behavior without a misleading WebView warning', () => {
    const app = fixture(async () => { assert.fail('Native TV app must not request a web lock') }, 'KaraokeDockTV/1.0')
    assert.deepEqual(app.reports, [])
    assert.deepEqual(app.requests, [])
    app.control.dispose()
  })
})
