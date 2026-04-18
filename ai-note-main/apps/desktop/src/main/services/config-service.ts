import path from 'path'
import fs from 'fs/promises'
import { CONFIG_DIR, CONFIG_FILE, SYNC_PORT } from '@shared/constants'
import { AppConfig } from '@shared/types/ipc'
import { logger } from '../utils/logger'

const DEFAULT_CONFIG: AppConfig = {
  version: 1,
  editor: {
    defaultMode: 'wysiwyg',
    autoSaveDelay: 1000,
    fontSize: 16,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: 800
  },
  git: {
    autoCommit: true,
    autoCommitInterval: 300000, // 5 minutes
    autoCommitStrategy: 'interval'
  },
  appearance: {
    theme: 'system',
    sidebarWidth: 260
  },
  search: {
    debounceDelay: 300
  },
  session: {
    openFiles: [],
    activeFile: null
  },
  sync: {
    enabled: false,
    lanPort: SYNC_PORT,
    lanEnabled: true,
    bleEnabled: false,
    conflictStrategy: 'last-write-wins',
    autoSync: false,
    pairedDevices: []
  },
  ai: {
    activeProvider: 'kimi',
    activeModel: 'moonshot-v1-128k',
    providers: {}
  }
}

export class ConfigService {
  private configPath: string
  private config: AppConfig

  constructor(workspacePath: string) {
    this.configPath = path.join(workspacePath, CONFIG_DIR, CONFIG_FILE)
    this.config = { ...DEFAULT_CONFIG }
  }

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.configPath, 'utf-8')
      const loaded = JSON.parse(raw) as Partial<AppConfig>
      this.config = this.deepMerge(DEFAULT_CONFIG, loaded) as AppConfig
      logger.info('Config loaded from', this.configPath)
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        logger.info('No config file found, using defaults')
        await this.save()
      } else {
        logger.error('Failed to load config:', err)
        this.config = { ...DEFAULT_CONFIG }
      }
    }
  }

  async save(): Promise<void> {
    try {
      const dir = path.dirname(this.configPath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8')
      logger.info('Config saved')
    } catch (err) {
      logger.error('Failed to save config:', err)
    }
  }

  get(key: string): any {
    const keys = key.split('.')
    let current: any = this.config
    for (const k of keys) {
      if (current == null || typeof current !== 'object') {
        return undefined
      }
      current = current[k]
    }
    return current
  }

  async set(key: string, value: any): Promise<void> {
    const keys = key.split('.')
    let current: any = this.config

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]
      if (current[k] == null || typeof current[k] !== 'object') {
        current[k] = {}
      }
      current = current[k]
    }

    current[keys[keys.length - 1]] = value
    await this.save()
  }

  getAll(): AppConfig {
    return { ...this.config }
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target }
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        result[key] = this.deepMerge(target[key], source[key])
      } else {
        result[key] = source[key]
      }
    }
    return result
  }
}
