import { create } from 'zustand'

function applyTheme(dark) {
  if (dark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

const stored = (() => {
  try {
    const v = localStorage.getItem('musharaka_theme')
    if (v === 'dark') return true
    if (v === 'light') return false
    // Default: respect OS preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch { return false }
})()

applyTheme(stored)

export const useThemeStore = create(set => ({
  dark: stored,
  toggle() {
    set(s => {
      const next = !s.dark
      applyTheme(next)
      try { localStorage.setItem('musharaka_theme', next ? 'dark' : 'light') } catch {}
      return { dark: next }
    })
  },
}))
