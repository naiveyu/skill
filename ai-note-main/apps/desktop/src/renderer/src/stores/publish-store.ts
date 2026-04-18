import { create } from 'zustand'
import type {
  PublishPlatform,
  PlatformAuthStatus,
  PublishOptions,
  PublishResult,
  PublishProgress,
  PublishHistoryEntry
} from '@ai-note/shared-types'

interface PublishState {
  // Platform auth states
  platformStatuses: Map<PublishPlatform, PlatformAuthStatus>
  // Current publish progress per platform
  progressMap: Map<PublishPlatform, PublishProgress>
  // Results of current publish session
  results: PublishResult[]
  // Publish history
  history: PublishHistoryEntry[]
  // UI state
  isPublishing: boolean
  error: string | null

  // Actions
  checkAuthStatus: (platform: PublishPlatform) => Promise<void>
  checkAllAuthStatuses: () => Promise<void>
  login: (platform: PublishPlatform) => Promise<void>
  publish: (options: PublishOptions) => Promise<PublishResult[]>
  cancel: () => Promise<void>
  loadHistory: () => Promise<void>
  clearResults: () => void

  // Internal setters for event listeners
  setProgress: (progress: PublishProgress) => void
  addResult: (result: PublishResult) => void
}

const PLATFORMS: PublishPlatform[] = ['wechat', 'xhs', 'twitter']

export const usePublishStore = create<PublishState>((set, get) => ({
  platformStatuses: new Map(),
  progressMap: new Map(),
  results: [],
  history: [],
  isPublishing: false,
  error: null,

  checkAuthStatus: async (platform: PublishPlatform) => {
    try {
      const status = await window.electronAPI.publish.getAuthStatus(platform)
      const statuses = new Map(get().platformStatuses)
      statuses.set(platform, status)
      set({ platformStatuses: statuses, error: null })
    } catch (error) {
      console.error(`Failed to check auth for ${platform}:`, error)
    }
  },

  checkAllAuthStatuses: async () => {
    for (const platform of PLATFORMS) {
      await get().checkAuthStatus(platform)
    }
  },

  login: async (platform: PublishPlatform) => {
    try {
      const status = await window.electronAPI.publish.login(platform)
      const statuses = new Map(get().platformStatuses)
      statuses.set(platform, status)
      set({ platformStatuses: statuses, error: null })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  publish: async (options: PublishOptions) => {
    set({ isPublishing: true, results: [], progressMap: new Map(), error: null })
    try {
      const results = await window.electronAPI.publish.publish(options)
      set({ isPublishing: false, results })
      return results
    } catch (error) {
      set({ isPublishing: false, error: String(error) })
      return []
    }
  },

  cancel: async () => {
    try {
      await window.electronAPI.publish.cancel()
      set({ isPublishing: false })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  loadHistory: async () => {
    try {
      const history = await window.electronAPI.publish.getHistory()
      set({ history })
    } catch (error) {
      console.error('Failed to load publish history:', error)
    }
  },

  clearResults: () => set({ results: [], progressMap: new Map(), error: null }),

  setProgress: (progress: PublishProgress) => {
    const progressMap = new Map(get().progressMap)
    progressMap.set(progress.platform, progress)
    set({ progressMap })
  },

  addResult: (result: PublishResult) => {
    set({ results: [...get().results, result] })
  }
}))
