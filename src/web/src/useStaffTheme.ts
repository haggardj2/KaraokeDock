import { useCallback, useEffect, useState } from 'react'
import { loadThemeId, saveThemeId, type ThemeId } from './theme'

// The Host and Admin pages share one theme preference; the account menu in the
// top nav changes it, so every mounted user of this hook is told about the change.
const STAFF_THEME_EVENT = 'karaokedock:staff-theme'

export function useStaffTheme(): [ThemeId, (id: ThemeId) => void] {
  const [themeId, setThemeIdState] = useState<ThemeId>(() => loadThemeId())

  useEffect(() => {
    const onChange = (event: Event) => setThemeIdState((event as CustomEvent<ThemeId>).detail)
    window.addEventListener(STAFF_THEME_EVENT, onChange)
    return () => window.removeEventListener(STAFF_THEME_EVENT, onChange)
  }, [])

  const setThemeId = useCallback((id: ThemeId) => {
    saveThemeId(id)
    window.dispatchEvent(new CustomEvent<ThemeId>(STAFF_THEME_EVENT, { detail: id }))
  }, [])

  return [themeId, setThemeId]
}
