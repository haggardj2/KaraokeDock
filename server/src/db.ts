// server/src/db.ts
import { Pool } from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function query<T = any>(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const res = await client.query<T>(text, params);
    return res;
  } finally {
    client.release();
  }
}

/** Normalize artist names for case/diacritic-insensitive matching */
function nameNorm(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '');     // keep a-z0-9 only
}

/**
 * Optional: create helpful indexes if they're missing.
 * Safe to call at startup; IF NOT EXISTS guards prevent errors.
 */
export async function ensureHelpfulIndexes() {
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'tracks_path_basename_idx') THEN
        CREATE INDEX tracks_path_basename_idx ON tracks(path, basename);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'tracks_kind_title_idx') THEN
        CREATE INDEX tracks_kind_title_idx ON tracks(kind, title);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'artists_name_norm_uq') THEN
        CREATE UNIQUE INDEX artists_name_norm_uq ON artists(name_norm);
      END IF;
    END$$;
  `);
}

/**
 * Upsert artist by normalized name (populates name_norm which is NOT NULL).
 * Returns artist id.
 */
export async function upsertArtist(name: string): Promise<number> {
  let clean = (name || '').trim();
  if (!clean) clean = 'Unknown';
  const norm = nameNorm(clean);
  if (!norm) {
    // Fallback if the name reduced to nothing
    clean = 'Unknown';
  }
  const finalNorm = nameNorm(clean);

  const r = await query<{ id: number }>(`
    WITH existing AS (
      SELECT id FROM artists WHERE name_norm = $2 LIMIT 1
    ), ins AS (
      INSERT INTO artists(name, name_norm)
      SELECT $1, $2
      WHERE NOT EXISTS (SELECT 1 FROM existing)
      RETURNING id
    )
    SELECT id FROM ins
    UNION ALL
    SELECT id FROM existing
    LIMIT 1;
  `, [clean, finalNorm]);

  return r.rows[0].id;
}

/**
 * Upsert track identified by natural key (kind + path + basename) WITHOUT ON CONFLICT.
 * Null-ish "new" values won't overwrite existing non-nulls.
 */
export type UpsertTrackArgs = {
  artist_id: number | null;
  disc_id: string | null;
  title: string | null;
  kind: 'mp4' | 'cdgmp3';  // Match database enum
  duration_ms: number | null;
  file_mp4: string | null;
  file_cdg: string | null;
  file_mp3: string | null;
  path: string;       // absolute directory
  basename: string;   // file name only
  library_id: number | null;
};

export async function upsertTrack(a: UpsertTrackArgs) {
  const params = [
    a.artist_id,
    a.disc_id,
    a.title,
    a.kind,
    a.duration_ms,
    a.file_mp4,
    a.file_cdg,
    a.file_mp3,
    a.path,
    a.basename,
    a.library_id
  ];

  const sql = `
    WITH existing AS (
      SELECT id FROM tracks
      WHERE kind = $4 AND path = $9 AND basename = $10
      LIMIT 1
    ),
    updated AS (
      UPDATE tracks t
         SET artist_id   = COALESCE($1, t.artist_id),
             disc_id     = COALESCE($2, t.disc_id),
             title       = COALESCE($3, t.title),
             duration_ms = COALESCE($5, t.duration_ms),
             file_mp4    = COALESCE($6, t.file_mp4),
             file_cdg    = COALESCE($7, t.file_cdg),
             file_mp3    = COALESCE($8, t.file_mp3),
             library_id  = COALESCE($11, t.library_id)
      FROM existing e
      WHERE t.id = e.id
      RETURNING t.*
    )
    INSERT INTO tracks (artist_id, disc_id, title, kind, duration_ms, file_mp4, file_cdg, file_mp3, path, basename, library_id)
    SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
    WHERE NOT EXISTS (SELECT 1 FROM existing)
    RETURNING *;
  `;

  const res = await query(sql, params);
  return res.rows[0];
}

/**
 * Insert external track (e.g., from Karaoke Nerds)
 * External tracks have a unique constraint on (source, external_url)
 */
export type InsertExternalTrackArgs = {
  artist_id: number | null;
  title: string;
  external_url: string;
  source: string;
  duration_ms?: number | null;
};

export async function upsertExternalTrack(a: InsertExternalTrackArgs) {
  const sql = `
    WITH existing AS (
      SELECT id FROM tracks
      WHERE source = $4 AND external_url = $3
      LIMIT 1
    ),
    updated AS (
      UPDATE tracks t
      SET artist_id = COALESCE($1, t.artist_id),
          title = COALESCE($2, t.title),
          duration_ms = COALESCE($5, t.duration_ms)
      FROM existing e
      WHERE t.id = e.id
      RETURNING t.*
    ),
    inserted AS (
      INSERT INTO tracks (artist_id, title, kind, external_url, source, path, basename, duration_ms)
      SELECT $1, $2, 'mp4', $3, $4, '', '', $5
      WHERE NOT EXISTS (SELECT 1 FROM existing)
      RETURNING *
    )
    SELECT * FROM updated
    UNION ALL
    SELECT * FROM inserted
    LIMIT 1;
  `;
  
  const res = await query(sql, [a.artist_id, a.title, a.external_url, a.source, a.duration_ms || null]);
  return res.rows[0];
}

/**
 * Get a setting value from the settings table
 */
export async function getSetting(key: string): Promise<any> {
  const res = await query<{ value: any }>('SELECT value FROM settings WHERE key = $1', [key]);
  if (res.rows.length === 0) return null;
  // JSONB columns are automatically parsed by PostgreSQL, return the value directly
  return res.rows[0].value;
}

/**
 * Set a setting value in the settings table
 */
export async function setSetting(key: string, value: any): Promise<void> {
  await query(
    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
    [key, JSON.stringify(value)]
  );
}

/**
 * Session management functions
 */

export interface Session {
  id: number;
  token: string;
  created_at: Date;
  expires_at: Date;
  last_accessed: Date;
}

/**
 * Create a new session with a random token
 * Sessions expire after 30 days by default
 */
export async function createSession(expiresInDays: number = 30): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  
  await query(
    'INSERT INTO sessions (token, expires_at) VALUES ($1, $2)',
    [token, expiresAt]
  );
  
  return token;
}

/**
 * Validate a session token and update last accessed time
 */
export async function validateSession(token: string): Promise<boolean> {
  const res = await query<Session>(
    'SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()',
    [token]
  );
  
  if (res.rows.length === 0) {
    return false;
  }
  
  // Update last accessed time
  await query(
    'UPDATE sessions SET last_accessed = NOW() WHERE token = $1',
    [token]
  );
  
  return true;
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  await query('DELETE FROM sessions WHERE token = $1', [token]);
}

/**
 * Clean up expired sessions (can be called periodically)
 */
export async function cleanupExpiredSessions(): Promise<void> {
  await query('DELETE FROM sessions WHERE expires_at <= NOW()');
}

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Password hashing and verification functions
 */

// Number of salt rounds for bcrypt (10 is a good balance of security and performance)
const SALT_ROUNDS = 10;

// Regex to detect bcrypt hashes (starts with $2a$, $2b$, or $2y$ followed by cost factor)
const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$/;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hashed password
 * This function handles both bcrypt hashes and plaintext passwords for backward compatibility
 * during the migration period. Once all passwords are hashed, only bcrypt comparison will be used.
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  // Check if the stored password is a bcrypt hash
  // Bcrypt hashes always start with $2a$, $2b$, or $2y$ followed by the cost factor
  const isBcryptHash = BCRYPT_HASH_REGEX.test(hashedPassword);
  
  if (isBcryptHash) {
    // Password is hashed, use bcrypt to verify
    return await bcrypt.compare(password, hashedPassword);
  } else {
    // Password is in plaintext (legacy/migration state), do direct comparison
    // This should only occur during migration or when using environment variables
    console.warn('WARNING: Plaintext password detected. Please run "npm run migrate-passwords" to encrypt passwords.');
    return password === hashedPassword;
  }
}
