export type ThemePreference = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'finance-theme'

const PREFERENCES: ThemePreference[] = ['light', 'dark', 'system']

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveIsDark(preference: ThemePreference) {
  if (preference === 'dark') return true
  if (preference === 'light') return false
  return systemPrefersDark()
}

export function applyThemeClass(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
}

export function useTheme() {
  const preference = useState<ThemePreference>('theme-preference', () => 'dark')
  const isDark = useState('theme-is-dark', () => true)

  function setTheme(next: ThemePreference) {
    preference.value = next
    const dark = resolveIsDark(next)
    isDark.value = dark
    if (import.meta.client) {
      applyThemeClass(dark)
      localStorage.setItem(THEME_STORAGE_KEY, next)
    }
  }

  function cycleTheme() {
    const index = PREFERENCES.indexOf(preference.value)
    setTheme(PREFERENCES[(index + 1) % PREFERENCES.length])
  }

  onMounted(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    setTheme(isThemePreference(stored) ? stored : 'dark')

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = () => {
      if (preference.value === 'system') setTheme('system')
    }
    media.addEventListener('change', onSystemChange)
    onBeforeUnmount(() => media.removeEventListener('change', onSystemChange))
  })

  return {
    preference,
    isDark,
    setTheme,
    cycleTheme,
  }
}
