import type { SyncConfig } from './sync'

export type AiProvider = 'kimi' | 'doubao' | 'openai' | 'anthropic'

export interface AiProviderConfig {
  apiKey: string
  model: string
  baseUrl?: string
}

export interface AiConfig {
  activeProvider: AiProvider
  activeModel: string
  providers: Partial<Record<AiProvider, AiProviderConfig>>
  setupToken?: string
}

export interface AppConfig {
  version: number
  editor: {
    defaultMode: 'wysiwyg' | 'source'
    autoSaveDelay: number
    fontSize: number
    fontFamily: string
    maxWidth: number
  }
  git: {
    autoCommit: boolean
    autoCommitInterval: number
    autoCommitStrategy: 'immediate' | 'interval' | 'manual'
  }
  appearance: {
    theme: 'light' | 'dark' | 'system'
    locale: 'en' | 'zh' | 'system'
    sidebarWidth: number
  }
  search: { debounceDelay: number }
  session: {
    openFiles: string[]
    activeFile: string | null
  }
  sync: SyncConfig
  ai: AiConfig
}
