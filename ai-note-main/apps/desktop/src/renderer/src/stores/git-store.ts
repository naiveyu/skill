import { create } from 'zustand'
import type { GitCommit } from '@shared/types/ipc'

interface VersionState {
  versions: GitCommit[]
  selectedSha: string | null
  versionContent: string | null
  isLoadingContent: boolean
  isSaving: boolean

  loadVersions: (filePath: string) => Promise<void>
  selectVersion: (sha: string, filePath: string) => Promise<void>
  clearSelection: () => void
  saveVersion: (filePath: string, description: string) => Promise<void>
  restoreVersion: (filePath: string, sha: string) => Promise<void>
}

export const useVersionStore = create<VersionState>((set) => ({
  versions: [],
  selectedSha: null,
  versionContent: null,
  isLoadingContent: false,
  isSaving: false,

  loadVersions: async (filePath: string) => {
    try {
      const versions = await window.electronAPI.git.getHistory(filePath)
      set({ versions, selectedSha: null, versionContent: null })
    } catch (error) {
      console.error('Failed to load versions:', error)
      set({ versions: [], selectedSha: null, versionContent: null })
    }
  },

  selectVersion: async (sha: string, filePath: string) => {
    set({ selectedSha: sha, isLoadingContent: true, versionContent: null })
    try {
      const content = await window.electronAPI.git.getFileContent(sha, filePath)
      set({ versionContent: content, isLoadingContent: false })
    } catch (error) {
      console.error('Failed to load version content:', error)
      set({ versionContent: null, isLoadingContent: false })
    }
  },

  clearSelection: () => {
    set({ selectedSha: null, versionContent: null })
  },

  saveVersion: async (filePath: string, description: string) => {
    set({ isSaving: true })
    try {
      await window.electronAPI.git.saveVersion(filePath, description)
      const versions = await window.electronAPI.git.getHistory(filePath)
      set({ versions, isSaving: false })
    } catch (error) {
      console.error('Failed to save version:', error)
      set({ isSaving: false })
      throw error
    }
  },

  restoreVersion: async (filePath: string, sha: string) => {
    try {
      await window.electronAPI.git.restoreFile(filePath, sha)
    } catch (error) {
      console.error('Failed to restore version:', error)
      throw error
    }
  }
}))
