// App theme (dark/light). Default dark. Persisted to localStorage and applied as a
// `data-theme` attribute on <html>, which drives the CSS variables in theme.css.

import { createSignal } from 'solid-js'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'gcashmall_theme'

const readTheme = (): Theme => {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* ignore */
  }
  return 'dark'
}

const applyTheme = (theme: Theme) => {
  try {
    document.documentElement.setAttribute('data-theme', theme)
  } catch {
    /* SSR / no document */
  }
}

const [theme, setThemeSignal] = createSignal<Theme>(readTheme())

// Reactive accessor for components (e.g. the top-bar toggle icon)
export const currentTheme = theme

export const themeStoreActions = {
  set: (next: Theme) => {
    setThemeSignal(next)
    applyTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  },
  toggle: () => themeStoreActions.set(theme() === 'dark' ? 'light' : 'dark'),
}

// Apply the stored theme to <html> on startup (call before render to avoid a flash)
export const initTheme = () => applyTheme(theme())
