import { describe, expect, it } from 'vitest';
import {
  BackupError, decryptBackup, decryptBackupWithKey, encryptBackup, encryptBackupWithKey,
  readBackupHeader, snapshotKeyId, validatePassphrase,
} from './backup.js';

// Low scrypt cost keeps the tests fast; real backups use the default (2^17).
const fast = { appVersion: '9.9.9', kdf: { N: 2 ** 14, r: 8, p: 1 } };
const passphrase = 'correct horse battery';

describe('encrypted backups', () => {
  it('round-trips a payload and exposes only the header without the passphrase', async () => {
    const payload = { settings: [{ key: 'oidc.client_secret', value: 's3cret' }] };
    const file = await encryptBackup('settings', payload, passphrase, fast);
    expect(file.toString('latin1')).not.toContain('s3cret');
    const { header } = readBackupHeader(file);
    expect(header).toMatchObject({ format: 'karaokedock-backup', version: 1, kind: 'settings', appVersion: '9.9.9' });
    expect(await decryptBackup(file, passphrase)).toMatchObject({ payload });
  });

  it('rejects a wrong passphrase', async () => {
    const file = await encryptBackup('database', { tables: {}, files: [] }, passphrase, fast);
    await expect(decryptBackup(file, 'not the passphrase')).rejects.toThrow(/wrong passphrase/i);
  });

  it('detects tampering with the ciphertext or the header', async () => {
    const file = await encryptBackup('database', { tables: {}, files: [] }, passphrase, fast);
    const flipped = Buffer.from(file);
    flipped[flipped.length - 20] ^= 0xff;
    await expect(decryptBackup(flipped, passphrase)).rejects.toThrow(/damaged/i);
    // Relabelling a database backup as settings must fail authentication.
    const relabelled = Buffer.from(file.toString('latin1').replace('"kind":"database"', '"kind":"settings"'), 'latin1');
    expect(readBackupHeader(relabelled).header.kind).toBe('settings');
    await expect(decryptBackup(relabelled, passphrase)).rejects.toThrow(/damaged/i);
  });

  it('refuses files that are not backups or ask for an unbounded scrypt cost', async () => {
    expect(() => readBackupHeader(Buffer.from('hello'))).toThrow(BackupError);
    const file = await encryptBackup('settings', { settings: [] }, passphrase, fast);
    const greedy = Buffer.from(file.toString('latin1').replace(`"N":${2 ** 14}`, `"N":${2 ** 30}`), 'latin1');
    expect(() => readBackupHeader(greedy)).toThrow(/different version/);
  });

  it('requires a passphrase of at least 10 characters', () => {
    expect(() => validatePassphrase('short')).toThrow(/at least 10/);
    expect(validatePassphrase('long enough!')).toBe('long enough!');
  });
});

describe('snapshot encryption with a key file', () => {
  it('round-trips with the key and names the key it needs', async () => {
    const key = Buffer.alloc(32, 7);
    const file = await encryptBackupWithKey('database', { tables: {}, files: [] }, key, { appVersion: '9.9.9' });
    expect(readBackupHeader(file).header.kdf).toEqual({ name: 'keyfile', keyId: snapshotKeyId(key) });
    expect((await decryptBackupWithKey(file, key)).payload).toEqual({ tables: {}, files: [] });
    await expect(decryptBackupWithKey(file, Buffer.alloc(32, 8))).rejects.toThrow(/different snapshot key/);
    // A snapshot uploaded through the passphrase restore gets a clear explanation.
    await expect(decryptBackup(file, passphrase)).rejects.toThrow(/automatic snapshot/);
  });
});
