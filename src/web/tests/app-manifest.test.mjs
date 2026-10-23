import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getInstallApp, updateAppManifest } from '../src/appManifest.ts'

describe('per-page app identity', () => {
  it('selects Player only for the Player route', () => {
    for (const route of ['/player', '/player/']) assert.equal(getInstallApp(route), 'Player')
    for (const route of ['/host', '/admin', '/requests', '/', '/player/other']) {
      assert.equal(getInstallApp(route), 'Host')
    }
  })

  it('sets the initial manifest and Apple name, then switches correctly on client navigation', () => {
    const original = globalThis.document
    const attributes = new Map()
    const manifest = {
      getAttribute: key => attributes.get(key),
      setAttribute: (key, value) => attributes.set(key, value),
    }
    const title = { setAttribute: (key, value) => attributes.set(`title-${key}`, value) }
    globalThis.document = { querySelector: selector => selector.startsWith('link') ? manifest : title }
    try {
      updateAppManifest('/player')
      assert.equal(attributes.get('href'), '/player.webmanifest')
      assert.equal(attributes.get('title-content'), 'KaraokeDock Player')
      updateAppManifest('/host')
      assert.equal(attributes.get('href'), '/host.webmanifest')
      assert.equal(attributes.get('title-content'), 'KaraokeDock Host')
      updateAppManifest('/player/')
      assert.equal(attributes.get('href'), '/player.webmanifest')
    } finally {
      if (original === undefined) delete globalThis.document
      else globalThis.document = original
    }
  })
})
