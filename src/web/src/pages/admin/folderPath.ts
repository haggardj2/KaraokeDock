// Folder paths from the server are POSIX (/media/Karaoke) or Windows (D:\Karaoke, \\server\share).
// The folder browser uses '' for its starting view, the list of media folders.

const DRIVE_ROOT = /^[A-Za-z]:$/

function isWindowsPath(folder: string) {
  return /^[A-Za-z]:([\\/]|$)/.test(folder) || folder.startsWith('\\\\')
}

/** The parent folder, or '' at a drive or filesystem root (back to the media folders). */
export function parentFolder(folder: string): string {
  if (!folder) return ''
  if (!isWindowsPath(folder)) {
    if (folder === '/') return ''
    const trimmed = folder.replace(/\/+$/, '')
    return trimmed.slice(0, trimmed.lastIndexOf('/')) || '/'
  }

  const trimmed = folder.replace(/[\\/]+$/, '')
  if (DRIVE_ROOT.test(trimmed)) return ''
  // \\server\share is the root of a network share.
  if (trimmed.startsWith('\\\\') && trimmed.slice(2).split(/[\\/]/).length <= 2) return ''
  const parent = trimmed.slice(0, Math.max(trimmed.lastIndexOf('\\'), trimmed.lastIndexOf('/')))
  return DRIVE_ROOT.test(parent) ? `${parent}\\` : parent
}

/** Each step from the root down to the folder, for the breadcrumb. */
export function folderCrumbs(folder: string): { label: string; path: string }[] {
  if (!folder) return []
  if (!isWindowsPath(folder)) {
    const parts = folder.split('/').filter(Boolean)
    return [{ label: '/', path: '/' }, ...parts.map((part, index) => ({
      label: part,
      path: `/${parts.slice(0, index + 1).join('/')}`,
    }))]
  }

  const parts = folder.split(/[\\/]+/).filter(Boolean)
  const unc = folder.startsWith('\\\\')
  const rootParts = unc ? parts.slice(0, 2) : parts.slice(0, 1)
  const root = unc ? `\\\\${rootParts.join('\\')}` : `${rootParts[0]}\\`
  const crumbs = [{ label: unc ? root : rootParts[0], path: root }]
  let current = root
  for (const part of parts.slice(rootParts.length)) {
    current = current.endsWith('\\') ? `${current}${part}` : `${current}\\${part}`
    crumbs.push({ label: part, path: current })
  }
  return crumbs
}
