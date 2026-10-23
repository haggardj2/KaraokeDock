export function getInstallApp(pathname: string): 'Host' | 'Player' {
  return pathname === '/player' || pathname === '/player/' ? 'Player' : 'Host';
}

export function updateAppManifest(pathname: string) {
  const app = getInstallApp(pathname);
  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  const href = `/${app.toLowerCase()}.webmanifest`;
  if (manifest && manifest.getAttribute('href') !== href) {
    manifest.setAttribute('href', href);
  }
  document.querySelector('meta[name="apple-mobile-web-app-title"]')
    ?.setAttribute('content', `KaraokeDock ${app}`);
}
