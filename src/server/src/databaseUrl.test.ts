import { describe, expect, it } from 'vitest';
import { resolveDatabaseUrl } from './databaseUrl.js';

describe('resolveDatabaseUrl', () => {
  it('prefers DATABASE_URL when it is set', () => {
    expect(resolveDatabaseUrl({
      DATABASE_URL: 'postgres://user:pass@db:5432/appdb',
      DB_HOST: '',
      DB_NAME: '',
      DB_USER: '',
      DB_PASSWORD: '',
    })).toBe('postgres://user:pass@db:5432/appdb');
  });

  it('builds a connection string from split DB variables', () => {
    expect(resolveDatabaseUrl({
      DB_HOST: 'postgresql_alpine',
      DB_PORT: '5432',
      DB_NAME: 'karaoke',
      DB_USER: 'karaoke',
      DB_PASSWORD: 'secret',
    })).toBe('postgres://karaoke:secret@postgresql_alpine:5432/karaoke');
  });

  it('defaults DB_PORT to 5432 when it is omitted', () => {
    expect(resolveDatabaseUrl({
      DB_HOST: 'postgresql_alpine',
      DB_NAME: 'karaoke',
      DB_USER: 'karaoke',
      DB_PASSWORD: 'secret',
    })).toBe('postgres://karaoke:secret@postgresql_alpine:5432/karaoke');
  });

  it('encodes credentials safely when constructing the connection string', () => {
    expect(resolveDatabaseUrl({
      DB_HOST: 'postgresql_alpine',
      DB_NAME: 'karaoke db',
      DB_USER: 'karaoke@host',
      DB_PASSWORD: 's:e/cret',
    })).toBe('postgres://karaoke%40host:s%3Ae%2Fcret@postgresql_alpine:5432/karaoke%20db');
  });

  it('throws a useful error when required split variables are missing', () => {
    expect(() => resolveDatabaseUrl({
      DB_HOST: 'postgresql_alpine',
      DB_NAME: 'karaoke',
    })).toThrow('Missing: DB_USER, DB_PASSWORD');
  });
});
