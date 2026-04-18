import { create } from 'zustand'
import type { WorkspaceInfo } from '@shared/types/ipc'

interface WorkspaceState {
  currentPath: string | null
  recentWorkspaces: WorkspaceInfo[]
  isLoading: boolean

  openWorkspace: () => Promise<void>
  loadRecent: () => Promise<void>
  loadCurrent: () => Promise<void>
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentPath: null,
  recentWorkspaces: [],
  isLoading: false,

  openWorkspace: async () => {
    set({ isLoading: true })
    try {
      const path = await window.electronAPI.workspace.open()
      if (path) {
        set({ currentPath: path })
      }
    } catch (error) {
      console.error('Failed to open workspace:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  loadRecent: async () => {
    try {
      const recent = await window.electronAPI.workspace.getRecent()
      set({ recentWorkspaces: recent })
    } catch (error) {
      console.error('Failed to load recent workspaces:', error)
    }
  },

  loadCurrent: async () => {
    set({ isLoading: true })
    try {
      const current = await window.electronAPI.workspace.getCurrent()
      set({ currentPath: current })
    } catch (error) {
      console.error('Failed to load current workspace:', error)
    } finally {
      set({ isLoading: false })
    }
  }
}))
