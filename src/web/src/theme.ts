// Shared colour themes. Pages call applyTheme() on mount and clearTheme() on unmount;
// every colour a page needs should come from one of these CSS custom properties.

export type ThemeId = 'midnight' | 'stage' | 'daylight'

export interface ThemeDefinition {
  id: ThemeId
  label: string
  scheme: 'dark' | 'light'
  tokens: Record<string, string>
}

export const THEME_STORAGE_KEY = 'karaokedock.theme'
// Singer's own override on the Requests page; 'venue' follows the host's choice.
export const REQUEST_THEME_STORAGE_KEY = 'karaokedock.requestTheme'
export const DEFAULT_THEME_ID: ThemeId = 'midnight'

export const THEMES: ThemeDefinition[] = [
  {
    id: 'midnight',
    label: 'Midnight',
    scheme: 'dark',
    tokens: {
      'bg-primary': '#0a0a0f',
      'bg-secondary': '#16161d',
      'bg-card': '#1d1d27',
      'bg-hover': '#252533',
      'bg-elevated': 'rgba(22, 22, 29, 0.92)',
      'bg-gradient': 'linear-gradient(135deg, #0a0a0f 0%, #16161d 100%)',
      'accent': '#6366f1',
      'accent-hover': '#7c7ff3',
      'accent-2': '#8b5cf6',
      'accent-soft': 'rgba(99, 102, 241, 0.15)',
      'accent-text': '#c7d2fe',
      'on-accent': '#ffffff',
      'success': '#10b981',
      'success-soft': 'rgba(16, 185, 129, 0.12)',
      'success-border': 'rgba(16, 185, 129, 0.55)',
      'warning': '#facc15',
      'danger': '#ef4444',
      'danger-soft': 'rgba(239, 68, 68, 0.14)',
      'text-primary': '#ffffff',
      'text-secondary': '#a1a1aa',
      'text-muted': '#71717a',
      'border': 'rgba(255, 255, 255, 0.08)',
      'border-strong': 'rgba(255, 255, 255, 0.16)',
      'border-focus': 'rgba(99, 102, 241, 0.5)',
      'shadow': 'rgba(0, 0, 0, 0.35)',
      'overlay': 'rgba(0, 0, 0, 0.8)',
    },
  },
  {
    id: 'stage',
    label: 'Stage',
    scheme: 'dark',
    tokens: {
      'bg-primary': '#0d0710',
      'bg-secondary': '#1a0f1f',
      'bg-card': '#211428',
      'bg-hover': '#2e1c37',
      'bg-elevated': 'rgba(26, 15, 31, 0.92)',
      'bg-gradient': 'radial-gradient(circle at 15% 0%, #2a0f2e 0%, #0d0710 55%)',
      'accent': '#ec4899',
      'accent-hover': '#f472b6',
      'accent-2': '#f59e0b',
      'accent-soft': 'rgba(236, 72, 153, 0.16)',
      'accent-text': '#fbcfe8',
      'on-accent': '#ffffff',
      'success': '#22d3ee',
      'success-soft': 'rgba(34, 211, 238, 0.12)',
      'success-border': 'rgba(34, 211, 238, 0.55)',
      'warning': '#fbbf24',
      'danger': '#f43f5e',
      'danger-soft': 'rgba(244, 63, 94, 0.15)',
      'text-primary': '#fdf4ff',
      'text-secondary': '#c4b5c9',
      'text-muted': '#8b7a91',
      'border': 'rgba(255, 255, 255, 0.09)',
      'border-strong': 'rgba(255, 255, 255, 0.18)',
      'border-focus': 'rgba(236, 72, 153, 0.5)',
      'shadow': 'rgba(0, 0, 0, 0.45)',
      'overlay': 'rgba(5, 0, 8, 0.82)',
    },
  },
  {
    id: 'daylight',
    label: 'Daylight',
    scheme: 'light',
    tokens: {
      'bg-primary': '#f4f4f7',
      'bg-secondary': '#ebebf0',
      'bg-card': '#ffffff',
      'bg-hover': '#e2e2ea',
      'bg-elevated': 'rgba(255, 255, 255, 0.94)',
      'bg-gradient': 'linear-gradient(135deg, #f7f7fa 0%, #ececf2 100%)',
      'accent': '#4f46e5',
      'accent-hover': '#4338ca',
      'accent-2': '#7c3aed',
      'accent-soft': 'rgba(79, 70, 229, 0.1)',
      'accent-text': '#4338ca',
      'on-accent': '#ffffff',
      'success': '#047857',
      'success-soft': 'rgba(4, 120, 87, 0.08)',
      'success-border': 'rgba(4, 120, 87, 0.45)',
      'warning': '#b45309',
      'danger': '#dc2626',
      'danger-soft': 'rgba(220, 38, 38, 0.08)',
      'text-primary': '#18181b',
      'text-secondary': '#52525b',
      'text-muted': '#71717a',
      'border': 'rgba(24, 24, 27, 0.1)',
      'border-strong': 'rgba(24, 24, 27, 0.2)',
      'border-focus': 'rgba(79, 70, 229, 0.45)',
      'shadow': 'rgba(24, 24, 27, 0.12)',
      'overlay': 'rgba(24, 24, 27, 0.45)',
    },
  },
]

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value)
}

export function getTheme(id: ThemeId): ThemeDefinition {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]
}

export function themeCssText(id: ThemeId): string {
  const theme = getTheme(id)
  const vars = Object.entries(theme.tokens).map(([name, value]) => `--color-${name}: ${value};`)
  return [...vars, `color-scheme: ${theme.scheme};`].join('\n')
}

export function loadThemeId(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage, key = THEME_STORAGE_KEY): ThemeId {
  try {
    const stored = storage?.getItem(key)
    return isThemeId(stored) ? stored : DEFAULT_THEME_ID
  } catch {
    return DEFAULT_THEME_ID
  }
}

export function saveThemeId(id: string, storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage, key = THEME_STORAGE_KEY) {
  try {
    storage?.setItem(key, id)
  } catch {
    // Private mode or blocked storage: the theme still applies for this visit.
  }
}

export type RequestThemeChoice = ThemeId | 'venue'

export function loadRequestThemeChoice(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): RequestThemeChoice {
  try {
    const stored = storage?.getItem(REQUEST_THEME_STORAGE_KEY)
    return isThemeId(stored) ? stored : 'venue'
  } catch {
    return 'venue'
  }
}

export function resolveRequestTheme(choice: RequestThemeChoice, venueTheme: unknown): ThemeId {
  if (choice !== 'venue') return choice
  return isThemeId(venueTheme) ? venueTheme : DEFAULT_THEME_ID
}

export function applyTheme(id: ThemeId) {
  const theme = getTheme(id)
  document.documentElement.style.cssText = themeCssText(id)
  document.documentElement.dataset.theme = theme.id
  document.body.style.cssText = `
    background: ${theme.tokens['bg-gradient']};
    background-attachment: fixed;
    color: ${theme.tokens['text-primary']};
    margin: 0;
    padding: 0;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  `
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.tokens['bg-primary'])
}

export function clearTheme() {
  document.documentElement.style.cssText = ''
  delete document.documentElement.dataset.theme
  document.body.style.cssText = ''
}
