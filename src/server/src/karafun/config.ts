import { getSetting, setSetting } from '../db.js';
import type { KarafunConfig } from './types.js';

export const KARAFUN_SETTING_KEYS = {
  enabled: 'libraries.karafun_enabled',
  username: 'karafun.username',
  passwordHash: 'karafun.password_hash',
} as const;

export async function getKarafunConfig(): Promise<KarafunConfig> {
  const [enabled, username, passwordHash] = await Promise.all([
    getSetting(KARAFUN_SETTING_KEYS.enabled),
    getSetting(KARAFUN_SETTING_KEYS.username),
    getSetting(KARAFUN_SETTING_KEYS.passwordHash),
  ]);

  return {
    enabled: enabled === true,
    username: typeof username === 'string' ? username : '',
    passwordHash: typeof passwordHash === 'string' ? passwordHash : '',
  };
}

export async function isKarafunEnabled(): Promise<boolean> {
  return (await getSetting(KARAFUN_SETTING_KEYS.enabled)) === true;
}

export async function saveKarafunConfig(
  config: Partial<KarafunConfig>,
): Promise<void> {
  const writes: Array<Promise<void>> = [];
  if (config.enabled !== undefined) {
    writes.push(setSetting(KARAFUN_SETTING_KEYS.enabled, config.enabled));
  }
  if (config.username !== undefined) {
    writes.push(setSetting(KARAFUN_SETTING_KEYS.username, config.username));
  }
  if (config.passwordHash !== undefined) {
    writes.push(setSetting(KARAFUN_SETTING_KEYS.passwordHash, config.passwordHash));
  }
  await Promise.all(writes);
}
