import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// KaraFun password hashing (lib-core/lib/utils/passwordHasher.js)
//
// The desktop app substitutes characters with a fixed alphabet, then MD5s the
// result. The 32-hex value is the `pwd` parameter for /session/open.
// Store only this hash, never the clear password.
// ---------------------------------------------------------------------------
const PASSWORD_MAP: Record<string, string> = {
  a: '9', b: 'N', c: 'p', d: 'W', e: 'X', f: 'k', g: 'j', h: 'L', i: 'K',
  j: 'I', k: 'u', l: 'z', m: '2', n: 'Z', o: 'x', p: 'y', q: 'H', r: 'V',
  s: 'Y', t: 'q', u: 'c', v: '3', w: 'v', x: 'd', y: 'M', z: 'A',
  A: 'g', B: '7', C: '6', D: 'U', E: 'J', F: 'a', G: 'S', H: 'Q', I: 'F',
  J: '8', K: '0', L: 't', M: 'o', N: '1', O: 'h', P: 'i', Q: 'D', R: 'm',
  S: 'R', T: 'E', U: 'w', V: 's', W: 'l', X: 'e', Y: 'P', Z: 'n',
  '0': '5', '1': 'r', '2': 'f', '3': 'O', '4': 'T', '5': 'G', '6': 'C',
  '7': 'B', '8': '4', '9': 'b',
};

export function hashKarafunPassword(password: string): string {
  const mapped = [...password].map((char) => PASSWORD_MAP[char] ?? char).join('');
  return crypto.createHash('md5').update(mapped).digest('hex');
}

// ---------------------------------------------------------------------------
// Request signing (lib-core/lib/utils/signatureBuilder.js)
//   data = ["kfun-v1.5", url, payload, timestamp, sessionKey]
//            .filter(Boolean).join("|")
//   signature = SHA-256(data) hex
// ---------------------------------------------------------------------------
export const KARAFUN_SIGNATURE_VERSION = 'kfun-v1.5';

export function strictEncodeUriComponent(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    '%' + char.charCodeAt(0).toString(16).toUpperCase(),
  );
}

export function strictEncodeUriParams(params: Record<string, unknown>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${strictEncodeUriComponent(key)}=${strictEncodeUriComponent(String(value))}`)
    .join('&');
}

export function signKarafunRequest(input: {
  url: string;
  payload?: string;
  timestamp: number;
  sessionKey?: string | null;
}): string {
  const data = [
    KARAFUN_SIGNATURE_VERSION,
    input.url,
    input.payload ?? '',
    String(input.timestamp),
    input.sessionKey ?? '',
  ]
    .filter(Boolean)
    .join('|');
  return crypto.createHash('sha256').update(data).digest('hex');
}


