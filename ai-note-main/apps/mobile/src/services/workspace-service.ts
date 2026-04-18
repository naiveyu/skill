import * as FileSystem from 'expo-file-system'
import * as DocumentPicker from 'expo-document-picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { WorkspaceInfo } from '@ai-note/shared-types'
import { CONFIG_DIR } from '@ai-note/shared-types'
import { fileService } from './file-service'
import { dbService } from './db-service'
import { configService } from './config-service'
import { searchService } from './search-service'
import { tagService } from './tag-service'
import { gitService } from './git-service'

const RECENT_KEY = 'ai-note:recent-workspaces'
const CURRENT_KEY = 'ai-note:current-workspace'

class WorkspaceService {
  async open(folderPath?: string): Promise<string | null> {
    let workspacePath = folderPath

    if (!workspacePath) {
      // Use document directory as default workspace on mobile
      workspacePath = FileSystem.documentDirectory + 'workspace'
    }

    // Ensure workspace directory exists
    const info = await FileSystem.getInfoAsync(workspacePath)
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(workspacePath, { intermediates: true })
    }

    // Ensure .ai-note config directory exists
    const configDir = workspacePath + '/' + CONFIG_DIR
    const configInfo = await FileSystem.getInfoAsync(configDir)
    if (!configInfo.exists) {
      await FileSystem.makeDirectoryAsync(configDir, { intermediates: true })
    }

    // Initialize services
    await this.initializeServices(workspacePath)

    // Save as current and add to recent
    await AsyncStorage.setItem(CURRENT_KEY, workspacePath)
    await this.addToRecent(workspacePath)

    return workspacePath
  }

  async getRecent(): Promise<WorkspaceInfo[]> {
    try {
      const data = await AsyncStorage.getItem(RECENT_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  async getCurrent(): Promise<string | null> {
    return await AsyncStorage.getItem(CURRENT_KEY)
  }

  private async addToRecent(path: string): Promise<void> {
    const recent = await this.getRecent()
    const name = path.split('/').pop() || 'workspace'
    const filtered = recent.filter((w) => w.path !== path)
    filtered.unshift({ path, name, lastOpened: Date.now() })
    // Keep only 10 recent workspaces
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, 10)))
  }

  private async initializeServices(workspacePath: string): Promise<void> {
    fileService.initialize(workspacePath)
    await dbService.initialize(workspacePath)
    await configService.load(workspacePath)
    await gitService.initialize(workspacePath)
    await searchService.buildIndex(workspacePath)
    await tagService.initialize(workspacePath)
  }
}

export const workspaceService = new WorkspaceService()
