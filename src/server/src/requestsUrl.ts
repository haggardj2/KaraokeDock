import os from 'node:os';
import type express from 'express';
import { getSetting } from './db.js';

// The address singers use to reach the Requests page: printed on the Player and in its QR code.
// In order: the Remote Requests Gateway (while enabled), the Admin › System override, then
// this server's own address with localhost swapped for one other devices can reach: on Station
// the computer's mDNS name (YouTube refuses embeds on pages opened by IP address), otherwise
// the LAN address (a Docker container's host name means nothing on the network).

export const REQUESTS_URL_OVERRIDE_KEY = 'requests.url_override';

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1', '[::]']);

function trimUrl(value: unknown) {
  return String(value ?? '').trim().replace(/\/+$/, '');
}

/** The machine's LAN IPv4 address, preferring private ranges; null when it has none. */
export function getLanAddress(interfaces = os.networkInterfaces()): string | null {
  const addresses = Object.values(interfaces)
    .flat()
    .filter((entry): entry is os.NetworkInterfaceInfo => Boolean(entry))
    .filter((entry) => entry.family === 'IPv4' && !entry.internal && !entry.address.startsWith('169.254.'))
    .map((entry) => entry.address);
  const isPrivate = (ip: string) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
  return addresses.find(isPrivate) ?? addresses[0] ?? null;
}

/** The computer's mDNS name (desktop-17t77as.local), or null when the host name is unusable. */
export function getMdnsName(hostname = os.hostname()): string | null {
  const label = hostname.trim().toLowerCase().replace(/\.local$/, '').split('.')[0];
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label) ? `${label}.local` : null;
}

/** This server's web address as configured or as reached, without a trailing slash. */
export function getPublicWebAppUrl(req: express.Request): string {
  const webAppUrl = process.env.WEB_APP_URL?.trim();
  if (webAppUrl) return trimUrl(webAppUrl);

  const origins = process.env.ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean);
  if (origins?.length) return trimUrl(origins[0]);

  const host = req.headers.host || 'localhost:5173';
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return trimUrl(`${proto}://${host}`);
}

/** The automatic Requests address: localhost is replaced by a name or address phones can reach. */
export function getAutomaticRequestsUrl(
  req: express.Request,
  lanAddress = getLanAddress(),
  mdnsName = process.env.STATION_MODE === 'true' ? getMdnsName() : null,
): string {
  const base = getPublicWebAppUrl(req);
  try {
    const url = new URL(base);
    const reachableHost = mdnsName || lanAddress;
    if (reachableHost && LOOPBACK_HOSTNAMES.has(url.hostname)) url.hostname = reachableHost;
    return `${trimUrl(url.toString())}/request`;
  } catch {
    return `${base}/request`;
  }
}

export async function getPublicRequestsUrl(req: express.Request): Promise<string> {
  const [gatewayEnabled, gatewayUrl, override] = await Promise.all([
    getSetting('remote_gateway.enabled'),
    getSetting('remote_gateway.url'),
    getSetting(REQUESTS_URL_OVERRIDE_KEY),
  ]);
  if (gatewayEnabled === true && trimUrl(gatewayUrl)) return trimUrl(gatewayUrl);
  if (trimUrl(override)) return trimUrl(override);
  return getAutomaticRequestsUrl(req);
}
