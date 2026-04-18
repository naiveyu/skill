import { create } from 'zustand'
import { Appearance } from 'react-native'
import type { AppConfig } from '@ai-note/shared-types'
import { configService } from '@/services/config-service'

interface SettingsState {
  config: AppConfig | null
  theme: 'light' | 'dark'
  loadConfig: () => Promise<void>
  updateConfig: (key: string, value: any) => Promise<void>
}

function resolveTheme(appearance: AppConfig['appearance']): 'light' | 'dark' {
  if (appearance.theme === 'system') {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
  }
  return appearance.theme
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  config: null,
  theme: Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',

  loadConfig: async () => {
    const config = await configService.getAll()
    set({
      config,
      theme: resolveTheme(config.appearance),
    })
  },

  updateConfig: async (key, value) => {
    await configService.set(key, value)
    const config = await configService.getAll()
    set({
      config,
      theme: resolveTheme(config.appearance),
    })
  },
}))
