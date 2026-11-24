// A page this server served itself (opened at its LAN address, a host name, ...) is always
// allowed: its Origin names the same host and port the request was sent to.
export function isSameOriginRequest(origin: string | undefined, host: string | undefined) {
  if (!origin || !host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.trim().toLowerCase();
  } catch {
    return false;
  }
}
