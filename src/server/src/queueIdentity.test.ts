// server/src/queueIdentity.test.ts
// Unit tests for singer identity normalization.
// These tests only cover the pure normalizeSingerName function and do NOT
// require a database connection.

import { describe, it, expect } from 'vitest';
import { normalizeSingerName } from './queueIdentity.js';

describe('normalizeSingerName', () => {
  it('lowercases the name', () => {
    expect(normalizeSingerName('JARED')).toBe('jared');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeSingerName('  Jared  ')).toBe('jared');
    expect(normalizeSingerName(' jared ')).toBe('jared');
  });

  it('collapses internal whitespace runs to a single space', () => {
    expect(normalizeSingerName('Jared  Smith')).toBe('jared smith');
    expect(normalizeSingerName('Jared   Smith')).toBe('jared smith');
  });

  it('maps all name variants to the same canonical key', () => {
    const variants = ['Jared', ' jared ', 'JARED', 'Jared  ', '  JARED  '];
    const normalized = variants.map(normalizeSingerName);
    // All should be identical
    const first = normalized[0];
    for (const n of normalized) {
      expect(n).toBe(first);
    }
    expect(first).toBe('jared');
  });

  it('preserves multi-word names after normalizing', () => {
    expect(normalizeSingerName('Alice Bob')).toBe('alice bob');
    expect(normalizeSingerName('  Alice   Bob  ')).toBe('alice bob');
  });

  it('handles empty string', () => {
    expect(normalizeSingerName('')).toBe('');
  });

  it('handles single character names', () => {
    expect(normalizeSingerName('A')).toBe('a');
    expect(normalizeSingerName(' a ')).toBe('a');
  });

  it('handles names with tabs', () => {
    expect(normalizeSingerName('Alice\tBob')).toBe('alice bob');
  });

  // S.1: same singer name with different casing maps to one singer
  it('S.1 — same singer name with different casing produces the same normalized key', () => {
    expect(normalizeSingerName('Jared')).toBe(normalizeSingerName('jared'));
    expect(normalizeSingerName('JARED')).toBe(normalizeSingerName('Jared'));
    expect(normalizeSingerName('Jared Collins')).toBe(normalizeSingerName('jared collins'));
    expect(normalizeSingerName('JARED COLLINS')).toBe(normalizeSingerName('Jared Collins'));
  });

  // S.2: multiple songs for the same singer share the same normalized identity
  it('S.2 — multiple song requests from the same singer (different casing) map to one identity', () => {
    const req1 = normalizeSingerName('Alice');
    const req2 = normalizeSingerName('alice');
    const req3 = normalizeSingerName('ALICE');
    const req4 = normalizeSingerName(' Alice ');
    // All requests are from the same person — they must resolve to the same key
    expect(req1).toBe(req2);
    expect(req2).toBe(req3);
    expect(req3).toBe(req4);
  });
});
