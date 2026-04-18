import { create } from 'zustand'
import type { AppConfig } from '@shared/types/ipc'

interface SettingsState {
  config: AppConfig | null
  theme: 'light' | 'dark'

  loadConfig: () => Promise<void>
  updateConfig: (key: string, value: unknown) => Promise<void>
  detectTheme: () => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  config: null,
  theme: 'light',

  loadConfig: async () => {
    try {
      const config = await window.electronAPI.config.getAll()
      set({ config })
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  },

  updateConfig: async (key: string, value: unknown) => {
    try {
      await window.electronAPI.config.set(key, value)
      // Reload config after update
      await get().loadConfig()
    } catch (error) {
      console.error('Failed to update config:', error)
    }
  },

  detectTheme: () => {
    const { config } = get()
    const themeSetting = config?.appearance?.theme ?? 'system'

    let resolvedTheme: 'light' | 'dark'

    if (themeSetting === 'system') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      resolvedTheme = prefersDark ? 'dark' : 'light'
    } else {
      resolvedTheme = themeSetting
    }

    // Apply theme class to document
    if (resolvedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    set({ theme: resolvedTheme })
  }
}))
