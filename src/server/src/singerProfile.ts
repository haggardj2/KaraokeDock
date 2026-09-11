import { query, type User } from './db.js';

export const SINGER_PROFILE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const SINGER_PROFILE_IMAGE_TOTAL_MAX_BYTES = 512 * 1024 * 1024;

export type SingerProfileImageSource = 'oidc' | 'upload';

export type SingerProfileCrop = { x: number; y: number; width: number; height: number };

export function validateSingerProfileCrop(value: unknown): SingerProfileCrop {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw Object.assign(new Error('Invalid profile crop'), { status: 400 });
  }
  const { x, y, width, height } = value as SingerProfileCrop;
  if (
    ![x, y, width, height].every((n) => typeof n === 'number' && Number.isFinite(n))
    || x < 0 || y < 0 || x >= 100 || y >= 100
    || width <= 0 || height <= 0 || width > 100 || height > 100
    || x + width > 100.0001 || y + height > 100.0001
  ) {
    throw Object.assign(new Error('Invalid profile crop: expected an in-bounds percentage rectangle'), { status: 400 });
  }
  return { x, y, width, height };
}

export type SingerProfileRow = {
  id: string | number | bigint;
  profile_image_source?: string | null;
  profile_image_url?: string | null;
  profile_image_mime?: string | null;
  profile_image_data?: Buffer | null;
  profile_image_focus_x?: number | string | null;
  profile_image_focus_y?: number | string | null;
  profile_image_crop?: SingerProfileCrop | null;
  profile_image_admin_override?: boolean;
  profile_image_updated_at?: Date | string | null;
};

export type SingerProfileResponse = {
  imageSource: SingerProfileImageSource | null;
  imageUrl: string | null;
  focusX: number;
  focusY: number;
  crop?: SingerProfileCrop;
  updatedAt: string | null;
};

export type ImportedSingerProfile = {
  imageSource?: SingerProfileImageSource | null;
  imageUrl?: string | null;
  imageMime?: string | null;
  imageDataBase64?: string | null;
  focusX?: number | null;
  focusY?: number | null;
  crop?: SingerProfileCrop;
  updatedAt?: string | null;
};

function clampFocus(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 50;
  return Math.max(0, Math.min(100, Math.round(numeric * 10) / 10));
}

export function detectSingerProfileImageMime(buffer: Buffer): string | null {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  const header = buffer.subarray(0, 12).toString('ascii');
  if (header.startsWith('GIF87a') || header.startsWith('GIF89a')) {
    return 'image/gif';
  }
  if (header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

export function getSingerProfileImageUrl(row: SingerProfileRow): string | null {
  if (row.profile_image_source === 'oidc' && row.profile_image_url) {
    return row.profile_image_url;
  }
  if (row.profile_image_mime && row.profile_image_updated_at) {
    const updatedAt = new Date(row.profile_image_updated_at).toISOString();
    return `/api/singers/${String(row.id)}/profile-image?updatedAt=${encodeURIComponent(updatedAt)}`;
  }
  return null;
}

export function singerProfileFromRow(row: SingerProfileRow): SingerProfileResponse {
  const source =
    row.profile_image_source === 'oidc' || row.profile_image_source === 'upload'
      ? row.profile_image_source
      : null;
  return {
    imageSource: source,
    imageUrl: getSingerProfileImageUrl(row),
    focusX: clampFocus(row.profile_image_focus_x),
    focusY: clampFocus(row.profile_image_focus_y),
    ...(row.profile_image_crop ? { crop: row.profile_image_crop } : {}),
    updatedAt: row.profile_image_updated_at
      ? new Date(row.profile_image_updated_at).toISOString()
      : null,
  };
}

export async function getSingerProfileRow(singerId: bigint): Promise<SingerProfileRow | null> {
  const result = await query<SingerProfileRow>(
    `SELECT id, profile_image_source, profile_image_url, profile_image_mime,
            profile_image_focus_x, profile_image_focus_y, profile_image_crop,
            profile_image_admin_override, profile_image_updated_at
       FROM singers
      WHERE id = $1`,
    [singerId],
  );
  return result.rows[0] ?? null;
}

export async function syncSingerProfileFromOidc(singerId: bigint, user: User): Promise<void> {
  if (!user.oidc_subject) return;
  const picture = typeof user.picture === 'string' ? user.picture.trim() : '';
  await query(
    `UPDATE singers
        SET profile_image_source = CASE WHEN $2 <> '' THEN 'oidc' ELSE NULL END,
            profile_image_url = NULLIF($2, ''),
            profile_image_mime = NULL,
            profile_image_data = NULL,
            profile_image_crop = CASE
              WHEN COALESCE(profile_image_url, '') IS DISTINCT FROM $2
                OR COALESCE(profile_image_source, '') IS DISTINCT FROM CASE WHEN $2 <> '' THEN 'oidc' ELSE '' END
              THEN NULL ELSE profile_image_crop END,
            profile_image_updated_at = CASE
              WHEN COALESCE(profile_image_url, '') IS DISTINCT FROM $2
                OR COALESCE(profile_image_source, '') IS DISTINCT FROM CASE WHEN $2 <> '' THEN 'oidc' ELSE '' END
              THEN NOW()
              ELSE profile_image_updated_at
            END
      WHERE id = $1
        AND (profile_image_source IS NULL OR profile_image_source = 'oidc')`,
    [singerId, picture],
  );
}

export async function setSingerUploadedProfileImage(
  singerId: bigint,
  data: Buffer,
  mime: string,
  options: { adminOverride?: boolean; preserveAdminOverride?: boolean } = {},
): Promise<void> {
  const usage = await query<{ total: string }>(
    `SELECT COALESCE(SUM(OCTET_LENGTH(profile_image_data)), 0)::text AS total
       FROM singers
      WHERE id <> $1`,
    [singerId],
  );
  if (Number(usage.rows[0]?.total || 0) + data.length > SINGER_PROFILE_IMAGE_TOTAL_MAX_BYTES) {
    throw Object.assign(new Error('Singer profile image storage is full'), { status: 507 });
  }
  await query(
    `UPDATE singers
        SET profile_image_source = 'upload',
            profile_image_url = NULL,
            profile_image_mime = $2,
            profile_image_data = $3,
            profile_image_crop = NULL,
            profile_image_admin_override = $4,
            profile_image_updated_at = NOW()
      WHERE id = $1 AND (NOT $5 OR NOT profile_image_admin_override)`,
    [singerId, mime, data, options.adminOverride === true, options.preserveAdminOverride === true],
  );
}

export async function setSingerProfileFocus(
  singerId: bigint,
  focusX: unknown,
  focusY: unknown,
  crop?: unknown,
  options: { adminOverride?: boolean; preserveAdminOverride?: boolean } = {},
): Promise<void> {
  const validatedCrop = crop === undefined ? undefined : validateSingerProfileCrop(crop);
  await query(
    `UPDATE singers
        SET profile_image_focus_x = COALESCE($2, profile_image_focus_x),
            profile_image_focus_y = COALESCE($3, profile_image_focus_y),
            profile_image_crop = CASE WHEN $4 THEN $5::jsonb ELSE profile_image_crop END,
            profile_image_admin_override = CASE WHEN $6 THEN TRUE ELSE profile_image_admin_override END,
            profile_image_updated_at = NOW()
      WHERE id = $1 AND (NOT $7 OR NOT profile_image_admin_override)`,
    [singerId, focusX === undefined ? null : clampFocus(focusX),
      focusY === undefined ? null : clampFocus(focusY),
      validatedCrop !== undefined, validatedCrop ? JSON.stringify(validatedCrop) : null,
      options.adminOverride === true, options.preserveAdminOverride === true],
  );
}

export async function clearSingerProfileImage(
  singerId: bigint,
  options: { adminOverride?: boolean; preserveAdminOverride?: boolean } = {},
): Promise<void> {
  await query(
    `UPDATE singers
        SET profile_image_source = NULL,
            profile_image_url = NULL,
            profile_image_mime = NULL,
            profile_image_data = NULL,
            profile_image_crop = NULL,
            profile_image_admin_override = $2,
            profile_image_updated_at = NOW()
      WHERE id = $1 AND (NOT $3 OR NOT profile_image_admin_override)`,
    [singerId, options.adminOverride === true, options.preserveAdminOverride === true],
  );
}

export async function applyImportedSingerProfile(
  singerId: bigint,
  profile: ImportedSingerProfile | null | undefined,
  options: { allowOidcUrl?: boolean } = {},
): Promise<void> {
  if (!profile) return;

  const crop = profile.crop === undefined ? undefined : validateSingerProfileCrop(profile.crop);
  const existing = await getSingerProfileRow(singerId);
  if (existing?.profile_image_admin_override) return;
  const importOptions = { preserveAdminOverride: true };
  if (profile.imageSource === undefined) {
    await setSingerProfileFocus(singerId, profile.focusX, profile.focusY, crop, importOptions);
    return;
  }
  const focusX = clampFocus(profile.focusX);
  const focusY = clampFocus(profile.focusY);
  if (profile.imageSource === 'oidc' && typeof profile.imageUrl === 'string' && profile.imageUrl.trim()) {
    const imageUrl = profile.imageUrl.trim();
    if (!options.allowOidcUrl || imageUrl.length > 2048) return;
    try {
      if (new URL(imageUrl).protocol !== 'https:') return;
    } catch {
      return;
    }
    await query(
      `UPDATE singers
          SET profile_image_source = 'oidc',
              profile_image_url = $2,
              profile_image_mime = NULL,
              profile_image_data = NULL,
              profile_image_focus_x = $3,
              profile_image_focus_y = $4,
              profile_image_crop = $6::jsonb,
              profile_image_updated_at = COALESCE($5::timestamptz, NOW())
        WHERE id = $1 AND NOT profile_image_admin_override`,
      [singerId, imageUrl, focusX, focusY, profile.updatedAt || null, crop ? JSON.stringify(crop) : null],
    );
    return;
  }

  if (profile.imageSource === 'upload' && profile.imageDataBase64) {
    const data = Buffer.from(profile.imageDataBase64, 'base64');
    const mime = detectSingerProfileImageMime(data);
    if (!mime || data.length === 0 || data.length > SINGER_PROFILE_IMAGE_MAX_BYTES) return;
    await setSingerUploadedProfileImage(singerId, data, mime, importOptions);
    await setSingerProfileFocus(singerId, focusX, focusY, crop, importOptions);
    return;
  }

  await clearSingerProfileImage(singerId, importOptions);
  await setSingerProfileFocus(singerId, focusX, focusY, crop, importOptions);
}
