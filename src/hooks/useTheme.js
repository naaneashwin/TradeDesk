import { useEffect } from 'react'

// The Obsidian Intelligence Layer is a dark-only design system.
// We still apply the .dark class so any Tailwind dark: variants work.
export function useTheme() {
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])
}
