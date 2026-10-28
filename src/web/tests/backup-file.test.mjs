import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  encodePassphraseHeader,
  filenameFromDisposition,
  parseBackupHeader,
  passphraseProblem,
} from '../src/pages/admin/backupFile.ts'

const encode = (text) => new TextEncoder().encode(text)
const header = { format: 'karaokedock-backup', version: 1, kind: 'settings', createdAt: '2026-10-28T15:30:00.000Z', appVersion: '4.0.24' }

describe('backup files in the browser', () => {
  it('reads the plaintext header of a .kdbackup file', () => {
    const bytes = encode(`KDBACKUP\n${JSON.stringify(header)}\n\u0001\u0002encrypted`)
    assert.deepEqual(parseBackupHeader(bytes), { kind: 'settings', createdAt: header.createdAt, appVersion: '4.0.24' })
  })

  it('rejects files that are not KaraokeDock backups', () => {
    assert.equal(parseBackupHeader(encode('{"tables":{}}')), null)
    assert.equal(parseBackupHeader(encode('KDBACKUP\nnot json\n')), null)
    assert.equal(parseBackupHeader(encode(`KDBACKUP\n${JSON.stringify({ ...header, kind: 'other' })}\n`)), null)
  })

  it('encodes any passphrase for the restore header as UTF-8 base64', () => {
    const passphrase = 'héllo wörld ☃ 2026'
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(encodePassphraseHeader(passphrase)), (c) => c.charCodeAt(0)))
    assert.equal(decoded, passphrase)
  })

  it('checks passphrase length and confirmation', () => {
    assert.match(passphraseProblem('short', 'short'), /at least 10/)
    assert.match(passphraseProblem('long enough!', 'different!!'), /don't match/)
    assert.equal(passphraseProblem('long enough!', 'long enough!'), null)
  })

  it('takes the download name from Content-Disposition', () => {
    assert.equal(filenameFromDisposition('attachment; filename="karaokedock-database-2026-10-28-1530.kdbackup"', 'x'), 'karaokedock-database-2026-10-28-1530.kdbackup')
    assert.equal(filenameFromDisposition(null, 'fallback.kdbackup'), 'fallback.kdbackup')
  })
})
