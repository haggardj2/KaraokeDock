// Live show state, credentials, media, and application assets remain network-only.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const app = ['/player', '/player/'].includes(url.pathname) ? 'Player' : 'Host';
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate' ||
      url.origin !== self.location.origin || !['/host', '/host/', '/player', '/player/'].includes(url.pathname) ||
      url.search || url.hash) return;

  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<link rel="icon" type="image/x-icon" href="/favicon.ico">' +
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">' +
    `<meta name="theme-color" content="#0a0a0f"><title>KaraokeDock ${app} - Offline</title>` +
    '</head><body style="background:#0a0a0f;color:#fff;font:18px system-ui;padding:24px">' +
    `<h1>KaraokeDock ${app} is offline</h1>` +
    '<p>Connect to the internet or your karaoke server network to resume the show. Playback, controls, and queued changes are unavailable offline.</p>' +
    `<a href="/${app.toLowerCase()}" style="color:#a5b4fc">Reconnect to ${app}</a></body></html>`,
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  )));
});
