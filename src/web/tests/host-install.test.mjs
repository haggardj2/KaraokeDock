import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../src/components/HostInstall.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source.replaceAll('import.meta.env.PROD', 'false'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText

function mount(storage) {
  const states = []
  const warnings = []
  let index = 0
  const module = { exports: {} }
  new Function('require', 'exports', 'window', 'console', compiled)(name => {
    if (name === 'react') return {
      useEffect() {},
      useState(initial) {
        const current = index++
        if (!(current in states)) states[current] = typeof initial === 'function' ? initial() : initial
        return [states[current], value => { states[current] = value }]
      },
    }
    if (name === 'react-router-dom') return { useLocation: () => ({ pathname: '/host' }) }
    if (name === './ProfileDialog') return { default: () => null }
    return require(name)
  }, module.exports, { localStorage: storage }, { warn: (...args) => warnings.push(args) })
  return {
    warnings,
    render() { index = 0; return module.exports.default() },
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
})
