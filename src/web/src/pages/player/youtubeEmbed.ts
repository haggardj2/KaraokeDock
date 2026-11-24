/**
 * YouTube refuses embedded playback on a page opened by IP address (127.0.0.1, 192.168.x.x):
 * error 150 with the address as referrer, 153 without one. Host names, localhost included, work.
 */
export function canEmbedYouTubeOn(hostname: string): boolean {
  return !/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) && !hostname.startsWith('[')
}
