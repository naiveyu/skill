import * as FileSystem from 'expo-file-system'
import type { AppConfig } from '@ai-note/shared-types'
import { CONFIG_DIR, CONFIG_FILE } from '@ai-note/shared-types'

const DEFAULT_CONFIG: AppConfig = {
  version: 1,
  editor: {
    defaultMode: 'wysiwyg',
    autoSaveDelay: 1000,
    fontSize: 16,
    fontFamily: 'monospace',
    maxWidth: 800,
  },
  git: {
    autoCommit: true,
    autoCommitInterval: 300000,
    autoCommitStrategy: 'immediate',
  },
  appearance: {
    theme: 'system',
    locale: 'zh',
    sidebarWidth: 260,
  },
  search: {
    debounceDelay: 300,
  },
}

function deepMerge(target: any, source: any): any {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(target[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

class ConfigService {
  private config: AppConfig = { ...DEFAULT_CONFIG }
  private configPath = ''

  async load(workspacePath: string): Promise<void> {
    this.configPath = `${workspacePath}/${CONFIG_DIR}/${CONFIG_FILE}`
    try {
      const info = await FileSystem.getInfoAsync(this.configPath)
      if (info.exists) {
        const data = await FileSystem.readAsStringAsync(this.configPath)
        const loaded = JSON.parse(data)
        this.config = deepMerge(DEFAULT_CONFIG, loaded)
      } else {
        this.config = { ...DEFAULT_CONFIG }
        await this.save()
      }
    } catch {
      this.config = { ...DEFAULT_CONFIG }
    }
  }

  async save(): Promise<void> {
    if (!this.configPath) return
    await FileSystem.writeAsStringAsync(
      this.configPath,
      JSON.stringify(this.config, null, 2)
    )
  }

  get(key: string): any {
    const keys = key.split('.')
    let value: any = this.config
    for (const k of keys) {
      if (value == null) return undefined
      value = value[k]
    }
    return value
  }

  async set(key: string, value: any): Promise<void> {
    const keys = key.split('.')
    let target: any = this.config
    for (let i = 0; i < keys.length - 1; i++) {
      if (target[keys[i]] == null) target[keys[i]] = {}
      target = target[keys[i]]
    }
    target[keys[keys.length - 1]] = value
    await this.save()
  }

  getAll(): AppConfig {
    return { ...this.config }
  }
}

export const configService = new ConfigService()
