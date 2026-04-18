import { create } from 'zustand'
import type { GitCommit } from '@ai-note/shared-types'
import { gitService } from '@/services/git-service'

interface VersionState {
  versions: GitCommit[]
  selectedSha: string | null
  versionContent: string | null
  isLoadingContent: boolean
  isSaving: boolean

  loadVersions: (relativePath: string) => Promise<void>
  selectVersion: (sha: string, relativePath: string) => Promise<void>
  clearSelection: () => void
  saveVersion: (relativePath: string, description: string) => Promise<void>
  restoreVersion: (relativePath: string, sha: string) => Promise<void>
}

export const useVersionStore = create<VersionState>((set) => ({
  versions: [],
  selectedSha: null,
  versionContent: null,
  isLoadingContent: false,
  isSaving: false,

  loadVersions: async (relativePath: string) => {
    try {
      const versions = await gitService.getHistory(relativePath)
      set({ versions, selectedSha: null, versionContent: null })
    } catch (error) {
      console.error('Failed to load versions:', error)
      set({ versions: [], selectedSha: null, versionContent: null })
    }
  },

  selectVersion: async (sha: string, relativePath: string) => {
    set({ selectedSha: sha, isLoadingContent: true, versionContent: null })
    try {
      const content = await gitService.getFileContent(sha, relativePath)
      set({ versionContent: content, isLoadingContent: false })
    } catch (error) {
      console.error('Failed to load version content:', error)
      set({ versionContent: null, isLoadingContent: false })
    }
  },

  clearSelection: () => {
    set({ selectedSha: null, versionContent: null })
  },

  saveVersion: async (relativePath: string, description: string) => {
    set({ isSaving: true })
    try {
      await gitService.saveVersion(relativePath, description)
      const versions = await gitService.getHistory(relativePath)
      set({ versions, isSaving: false })
    } catch (error) {
      console.error('Failed to save version:', error)
      set({ isSaving: false })
      throw error
    }
  },

  restoreVersion: async (relativePath: string, sha: string) => {
    try {
      await gitService.restoreFile(relativePath, sha)
    } catch (error) {
      console.error('Failed to restore version:', error)
      throw error
    }
  },
}))
