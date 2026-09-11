import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  applyImportedSingerProfile, clearSingerProfileImage, detectSingerProfileImageMime,
  getSingerProfileRow, setSingerProfileFocus, setSingerUploadedProfileImage, singerProfileFromRow,
  syncSingerProfileFromOidc, validateSingerProfileCrop,
} from './singerProfile.js';
import { query, type User } from './db.js';

vi.mock('./db.js', () => ({ query: vi.fn() }));
const queryMock = vi.mocked(query);
const crop = { x: 10, y: 20, width: 70, height: 60 };
beforeEach(() => {
  queryMock.mockReset();
  queryMock.mockResolvedValue({ rows: [], rowCount: 0 } as any);
});

describe('detectSingerProfileImageMime', () => {
  it('detects supported image signatures', () => {
    expect(detectSingerProfileImageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
      .toBe('image/png');
    expect(detectSingerProfileImageMime(Buffer.from([0xff, 0xd8, 0xff, 0x00])))
      .toBe('image/jpeg');
    expect(detectSingerProfileImageMime(Buffer.from('GIF89a')))
      .toBe('image/gif');
    expect(detectSingerProfileImageMime(Buffer.from('RIFF0000WEBP')))
      .toBe('image/webp');
  });

  describe('profile crop validation and persistence', () => {
    it('accepts in-bounds rectangles, including rounding tolerance', () => {
      expect(validateSingerProfileCrop(crop)).toEqual(crop);
      expect(validateSingerProfileCrop({ x: 0, y: 0, width: 100, height: 100 })).toBeDefined();
      expect(validateSingerProfileCrop({ x: 33.333333, y: 0, width: 66.666668, height: 100 })).toBeDefined();
    });

    it.each([
      null, [], 'crop', {}, { ...crop, x: '10' }, { ...crop, x: NaN },
      { ...crop, y: Infinity }, { ...crop, width: -Infinity },
      { ...crop, x: -1 }, { ...crop, y: 100 }, { ...crop, width: 0 },
      { ...crop, height: -1 }, { ...crop, width: 101 },
      { ...crop, x: 40 }, { ...crop, y: 50 },
    ])('rejects invalid crop %j without writing', async (invalid) => {
      await expect(setSingerProfileFocus(7n, undefined, undefined, invalid)).rejects.toMatchObject({ status: 400 });
      expect(queryMock).not.toHaveBeenCalled();
    });

    it('writes crop JSONB, preserves omitted focus, and reads it in profile responses', async () => {
      await setSingerProfileFocus(7n, undefined, undefined, crop);
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('profile_image_crop = CASE WHEN $4 THEN $5::jsonb'),
        [7n, null, null, true, JSON.stringify(crop), false, false],
      );
      queryMock.mockResolvedValueOnce({ rows: [{ id: '7', profile_image_crop: crop }] } as any);
      const row = await getSingerProfileRow(7n);
      expect(queryMock).toHaveBeenLastCalledWith(expect.stringContaining('profile_image_crop'), [7n]);
      expect(singerProfileFromRow(row!).crop).toEqual(crop);
    });

    it('preserves crop when a legacy client updates only focus', async () => {
      await setSingerProfileFocus(7n, 35, 65);
      expect(queryMock).toHaveBeenCalledWith(expect.any(String), [7n, 35, 65, false, null, false, false]);
    });

    it('resets crop on upload and clear while retaining original uploaded bytes', async () => {
      const data = Buffer.from([0xff, 0xd8, 0xff, 0]);
      await setSingerUploadedProfileImage(7n, data, 'image/jpeg');
      expect(queryMock).toHaveBeenLastCalledWith(expect.stringContaining('profile_image_crop = NULL'),
        [7n, 'image/jpeg', data, false, false]);
      await clearSingerProfileImage(7n);
      expect(queryMock).toHaveBeenLastCalledWith(expect.stringContaining('profile_image_crop = NULL'), [7n, false, false]);
    });

    it('persists host override protection with crop-only edits', async () => {
      await setSingerProfileFocus(7n, 50, 50, crop, { adminOverride: true });
      expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('profile_image_admin_override'),
        [7n, 50, 50, true, JSON.stringify(crop), true, false]);
    });

    it('installs crop JSONB, bounds constraint and stable singer linkage in migration 021', () => {
      const migration = readFileSync(new URL('../migrations/021_singer_identity_and_crop.sql', import.meta.url), 'utf8');
      expect(migration).toContain('profile_image_crop JSONB');
      expect(migration).toContain('singers_profile_image_crop_check');
      expect(migration).toContain("jsonb_typeof(profile_image_crop->'width') = 'number'");
      expect(migration).toContain('<= 100.0001');
      expect(migration).toContain('user_matches = 1 AND c.singer_matches = 1');
      expect(migration).toContain('REFERENCES singers(id) ON DELETE SET NULL');
      expect(readFileSync(new URL('../scripts/migrate.sh', import.meta.url), 'utf8')).toContain('021_singer_identity_and_crop.sql');
      expect(readFileSync(new URL('../migrations/init.sql', import.meta.url), 'utf8')).toContain('profile_image_crop JSONB');
    });
  });

  describe('OIDC synchronization and imported crops', () => {
    const user = { oidc_subject: 'subject', picture: ' https://id.example/avatar ' } as User;

    it('synchronizes a provider URL without fetching images and resets crop only when the image changes', async () => {
      await syncSingerProfileFromOidc(7n, user);
      expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('profile_image_crop = CASE'), [7n, 'https://id.example/avatar']);
      const sql = queryMock.mock.calls[0][0];
      expect(sql).toContain("COALESCE(profile_image_url, '') IS DISTINCT FROM $2");
      expect(sql).toContain('THEN NULL ELSE profile_image_crop END');
      expect(sql).toContain("(profile_image_source IS NULL OR profile_image_source = 'oidc')");
    });

    it('does not synchronize local user images and handles provider picture removal', async () => {
      await syncSingerProfileFromOidc(7n, { ...user, oidc_subject: null });
      expect(queryMock).not.toHaveBeenCalled();
      await syncSingerProfileFromOidc(7n, { ...user, picture: null });
      expect(queryMock).toHaveBeenCalledWith(expect.any(String), [7n, '']);
    });

    it('imports OIDC crop and keeps original provider URL', async () => {
      await applyImportedSingerProfile(7n, {
        imageSource: 'oidc', imageUrl: 'https://id.example/avatar', crop,
      }, { allowOidcUrl: true });
      expect(queryMock).toHaveBeenLastCalledWith(expect.stringContaining('profile_image_crop = $6::jsonb'),
        [7n, 'https://id.example/avatar', 50, 50, null, JSON.stringify(crop)]);
    });

    it('imports uploaded images and crops without replacing host overrides', async () => {
      const profile = { imageSource: 'upload' as const, imageDataBase64: Buffer.from('GIF89a').toString('base64'), crop };
      await applyImportedSingerProfile(7n, profile);
      expect(queryMock).toHaveBeenLastCalledWith(expect.any(String), [7n, 50, 50, true, JSON.stringify(crop), false, true]);
      queryMock.mockClear().mockResolvedValueOnce({ rows: [{ id: '7', profile_image_admin_override: true }] } as any);
      await applyImportedSingerProfile(7n, profile);
      expect(queryMock).toHaveBeenCalledTimes(1);
    });

    it('accepts metadata-only crop imports without clearing the original image', async () => {
      await applyImportedSingerProfile(7n, { crop });
      expect(queryMock).toHaveBeenLastCalledWith(expect.stringContaining('profile_image_crop = CASE'),
        [7n, null, null, true, JSON.stringify(crop), false, true]);
      expect(queryMock.mock.calls.some(([sql]) => sql.includes('profile_image_data = NULL'))).toBe(false);
    });

    it('rejects invalid imported crop explicitly', async () => {
      await expect(applyImportedSingerProfile(7n, { crop: { ...crop, width: 100 } })).rejects.toMatchObject({ status: 400 });
      expect(queryMock).not.toHaveBeenCalled();
    });
  });

  it('rejects unsupported content', () => {
    expect(detectSingerProfileImageMime(Buffer.from('not-an-image'))).toBeNull();
  });
});

describe('singerProfileFromRow', () => {
  it('returns a cache-busted API URL and clamped focus for uploaded images', () => {
    const profile = singerProfileFromRow({
      id: '42',
      profile_image_source: 'upload',
      profile_image_mime: 'image/png',
      profile_image_focus_x: -10,
      profile_image_focus_y: 120,
      profile_image_updated_at: new Date('2026-09-09T12:00:00.000Z'),
    });

    expect(profile).toEqual({
      imageSource: 'upload',
      imageUrl: '/api/singers/42/profile-image?updatedAt=2026-09-09T12%3A00%3A00.000Z',
      focusX: 0,
      focusY: 100,
      updatedAt: '2026-09-09T12:00:00.000Z',
    });
  });

  it('returns the provider URL for OIDC images', () => {
    expect(singerProfileFromRow({
      id: '7',
      profile_image_source: 'oidc',
      profile_image_url: 'https://example.com/avatar.jpg',
      profile_image_focus_x: 40,
      profile_image_focus_y: 60,
    })).toMatchObject({
      imageSource: 'oidc',
      imageUrl: 'https://example.com/avatar.jpg',
      focusX: 40,
      focusY: 60,
    });
  });
});
