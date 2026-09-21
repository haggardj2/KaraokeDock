import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'

const source = readFileSync(new URL('../src/pages/Admin.tsx', import.meta.url), 'utf8')
const ast = ts.createSourceFile('Admin.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
function findNode(predicate, node = ast) {
  if (predicate(node)) return node
  return ts.forEachChild(node, child => findNode(predicate, child))
}
function loadFunction(name, environment, textSource = source) {
  const tree = ts.createSourceFile('component.tsx', textSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const node = findNode(node =>
    (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) && node.name?.getText(tree) === name, tree)
  assert.ok(node, `Missing ${name}`)
  const text = ts.isVariableDeclaration(node) ? `const ${node.getText(tree)}` : node.getText(tree)
  const js = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  return new Function(...Object.keys(environment), `${js}; return ${name}`)(...Object.values(environment))
}

describe('Admin User Manager singer merging', () => {
  it('uses the canonical singer name with account-name fallbacks', () => {
    const displayName = loadFunction('getUserDisplayName', {})
    assert.equal(displayName({ singer_display_name: 'Kept Singer', display_name: 'Old Social Name', username: 'login' }), 'Kept Singer')
    assert.equal(displayName({ singer_display_name: null, display_name: 'Social Name', username: 'login' }), 'Social Name')
    assert.equal(displayName({ singer_display_name: null, display_name: null, username: 'login' }), 'login')
  })

  it('closes the merge dialog, revalidates the signed-in profile, and reloads linked users after success', async () => {
    const calls = []
    const complete = loadFunction('handleUserMerged', {
      mergeUser: { singer_display_name: 'Kept Singer' },
      getUserDisplayName: user => user.singer_display_name,
      setMergeUser: value => calls.push(['dialog', value]),
      auth: { retrySessionValidation: () => calls.push(['session']) },
      setBanner: message => calls.push(['banner', message]),
      refreshUsers: async () => calls.push(['refresh']),
    })
    await complete('Duplicate Singer')
    assert.deepEqual(calls.map(call => call[0]), ['dialog', 'session', 'banner', 'refresh'])
    assert.equal(calls[0][1], null)
    assert.match(calls[2][1], /Duplicate Singer.*Kept Singer.*Sign in again.*permissions/)
  })

  it('surfaces failed list refreshes rather than allowing stale merge targets without warning', async () => {
    const errors = []
    const refresh = loadFunction('refreshUsers', {
      auth: { sessionToken: 'admin', isLoggedIn: true, isAdmin: true },
      sessionHeaders: {},
      setUsersLoadError: message => errors.push(message),
      setUsers: () => assert.fail('Must not replace users with a failed response'),
      api: async () => { throw new Error('Connection lost') },
      console: { error() {} },
    })
    await refresh()
    assert.deepEqual(errors, ['', 'Connection lost'])
  })

  it('links by actual account ID even when two sign-ins already share the same singer', () => {
    const dialog = findNode(node => ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'AccountLinkDialog')
    assert.ok(dialog)
    const targetId = dialog.attributes.properties.find(property => property.name?.getText(ast) === 'userId')
    assert.equal(targetId.initializer.expression.getText(ast), 'mergeUser.id')
  })

  it('has no account merge dialog or trigger on Host', () => {
    const host = readFileSync(new URL('../src/pages/Host.tsx', import.meta.url), 'utf8')
    assert.doesNotMatch(host, /SingerMergeDialog|AccountLinkDialog|setMergeSingerDialogOpen/)
  })

  it('submits explicit source-account identity only after ownership and permission confirmation', async () => {
    const dialog = readFileSync(new URL('../src/components/AccountLinkDialog.tsx', import.meta.url), 'utf8')
    const calls = []
    const environment = {
      busy: false, selected: { id: 24, displayName: 'Social Singer', isActive: true },
      confirmed: true, userId: 7, sessionToken: 'admin-session',
      setError: error => calls.push(['error', error]),
      setBusy: busy => calls.push(['busy', busy]),
      api: async (path, init) => calls.push(['api', path, JSON.parse(init.body)]),
      onLinked: name => calls.push(['linked', name]),
    }
    await loadFunction('link', environment, dialog)({ preventDefault() {} })
    assert.deepEqual(calls.find(call => call[0] === 'api'), ['api', '/api/admin/users/7/link', { sourceUserId: 24 }])
    assert.deepEqual(calls.find(call => call[0] === 'linked'), ['linked', 'Social Singer'])
    calls.length = 0
    await loadFunction('link', { ...environment, confirmed: false }, dialog)({ preventDefault() {} })
    assert.equal(calls.some(call => call[0] === 'api'), false)
    assert.match(calls[0][1], /confirm account ownership and permissions/)
    assert.match(dialog, /including Host and Admin access/)
  })

  it('keeps link failures visible without reporting a successful merge', async () => {
    const dialog = readFileSync(new URL('../src/components/AccountLinkDialog.tsx', import.meta.url), 'utf8')
    const errors = []
    const link = loadFunction('link', {
      busy: false, selected: { id: 24, displayName: 'Social', isActive: true },
      confirmed: true, userId: 7, sessionToken: 'admin',
      setError: error => errors.push(error), setBusy() {},
      api: async () => { throw new Error('Already linked to another account') },
      onLinked: () => assert.fail('Failed linking must not report success'),
    }, dialog)
    await link({ preventDefault() {} })
    assert.deepEqual(errors, ['', 'Already linked to another account'])
  })
})
