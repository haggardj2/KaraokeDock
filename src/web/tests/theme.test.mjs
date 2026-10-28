import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_THEME_ID,
  THEMES,
  THEME_STORAGE_KEY,
  REQUEST_THEME_STORAGE_KEY,
  loadRequestThemeChoice,
  resolveRequestTheme,
  resolvePlayerTheme,
  themeCssVars,
  loadThemeId,
  saveThemeId,
  themeCssText,
} from '../src/theme.ts'

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  }
}

describe('host themes', () => {
  it('defines the same tokens for every theme', () => {
    const expected = Object.keys(THEMES[0].tokens).sort()
    for (const theme of THEMES) {
      assert.deepEqual(Object.keys(theme.tokens).sort(), expected, theme.id)
    }
  })

  it('keeps the original Midnight palette as the default', () => {
    assert.equal(DEFAULT_THEME_ID, 'midnight')
    const css = themeCssText('midnight')
    assert.match(css, /--color-accent: #6366f1;/)
    assert.match(css, /--color-bg-card: #1d1d27;/)
    assert.match(css, /color-scheme: dark;/)
  })

  it('marks the light theme with a light color scheme', () => {
    assert.match(themeCssText('daylight'), /color-scheme: light;/)
  })

  it('loads a saved theme and ignores unknown or unreadable values', () => {
    assert.equal(loadThemeId(createStorage({ [THEME_STORAGE_KEY]: 'stage' })), 'stage')
    assert.equal(loadThemeId(createStorage({ [THEME_STORAGE_KEY]: 'neon' })), DEFAULT_THEME_ID)
    assert.equal(loadThemeId({ getItem() { throw new Error('blocked') } }), DEFAULT_THEME_ID)
    assert.equal(loadThemeId(undefined), DEFAULT_THEME_ID)
  })

  it('saves the theme and tolerates blocked storage', () => {
    const storage = createStorage()
    saveThemeId('daylight', storage)
    assert.equal(storage.getItem(THEME_STORAGE_KEY), 'daylight')
    assert.doesNotThrow(() => saveThemeId('stage', { setItem() { throw new Error('blocked') } }))
  })
})

describe('request page theme choice', () => {
  it('follows the venue theme unless the singer picked one', () => {
    assert.equal(loadRequestThemeChoice(createStorage()), 'venue')
    assert.equal(resolveRequestTheme('venue', 'stage'), 'stage')
    assert.equal(resolveRequestTheme('daylight', 'stage'), 'daylight')
  })

  it('falls back to the default when the venue value is missing or unknown', () => {
    assert.equal(resolveRequestTheme('venue', undefined), DEFAULT_THEME_ID)
    assert.equal(resolveRequestTheme('venue', 'neon'), DEFAULT_THEME_ID)
  })

  it('keeps the singer override separate from the host theme', () => {
    const storage = createStorage({ [THEME_STORAGE_KEY]: 'daylight', [REQUEST_THEME_STORAGE_KEY]: 'stage' })
    assert.equal(loadThemeId(storage), 'daylight')
    assert.equal(loadRequestThemeChoice(storage), 'stage')
    assert.equal(loadRequestThemeChoice(createStorage({ [REQUEST_THEME_STORAGE_KEY]: 'bogus' })), 'venue')
  })
})

describe('player theme', () => {
  it('follows a dark venue theme and keeps the TV dark for a light one', () => {
    assert.equal(resolvePlayerTheme('stage'), 'stage')
    assert.equal(resolvePlayerTheme('midnight'), 'midnight')
    assert.equal(resolvePlayerTheme('daylight'), DEFAULT_THEME_ID)
    assert.equal(resolvePlayerTheme(undefined), DEFAULT_THEME_ID)
    assert.equal(resolvePlayerTheme('neon'), DEFAULT_THEME_ID)
  })

  it('exposes theme tokens as scoped CSS custom properties', () => {
    const vars = themeCssVars('stage')
    const stage = THEMES.find((theme) => theme.id === 'stage')
    assert.equal(vars['--color-accent'], stage.tokens.accent)
    assert.equal(Object.keys(vars).length, Object.keys(stage.tokens).length)
  })
})
