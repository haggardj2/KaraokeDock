export type ProfileCrop = { x: number; y: number; width: number; height: number };

export type SingerProfileRow = {
  singer_uuid: string;
  requested_by: string;
  image_mime: string | null;
  image_data: Buffer | null;
  image_url: string | null;
  crop: string | null;
  focus_x: number;
  focus_y: number;
  updated_at: string | null;
};

export function parseProfileCrop(value: unknown): ProfileCrop | null {
  if (value === undefined) return null;
  const invalid = () => Object.assign(new Error('crop must be a rectangle within the original image (percent x, y, width, height)'), { status: 400 });
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const { x, y, width, height } = value as Record<string, unknown>;
  if (
    typeof x !== 'number' || typeof y !== 'number' ||
    typeof width !== 'number' || typeof height !== 'number' ||
    ![x, y, width, height].every(Number.isFinite) ||
    x < 0 || y < 0 || width <= 0 || height <= 0 ||
    x + width > 100 || y + height > 100
  ) throw invalid();
  return { x, y, width, height };
}

export function profileImageUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && url.href.length <= 2048 ? url.href : null;
  } catch {
    return null;
  }
}

export function clampFocus(value: unknown): number {
  if (value == null) return 50;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(0, Math.min(100, Math.round(parsed * 10) / 10));
}

export function serializeSingerProfile(row: SingerProfileRow | undefined, includeImageData = false) {
  const uploaded = Boolean(row?.image_mime && row?.image_data);
  const externalUrl = profileImageUrl(row?.image_url);
  let crop: ProfileCrop | null = null;
  if ((uploaded || externalUrl) && row?.crop) {
    try {
      crop = parseProfileCrop(JSON.parse(row.crop));
    } catch {
      // A malformed legacy row must not prevent reading the rest of the profile.
    }
  }
  return {
    imageSource: uploaded ? 'upload' : externalUrl ? 'oidc' : null,
    imageUrl: uploaded
      ? includeImageData ? null : `/api/singers/${encodeURIComponent(row!.singer_uuid)}/profile-image?updatedAt=${encodeURIComponent(row!.updated_at || '')}`
      : externalUrl,
    ...(includeImageData ? {
      imageMime: uploaded ? row!.image_mime : null,
      imageDataBase64: uploaded ? row!.image_data!.toString('base64') : null,
    } : {}),
    focusX: clampFocus(row?.focus_x),
    focusY: clampFocus(row?.focus_y),
    ...(crop ? { crop } : {}),
    updatedAt: row?.updated_at || null,
  };
}
