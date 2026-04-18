import { create } from 'zustand'
import type { WorkspaceInfo } from '@ai-note/shared-types'
import { workspaceService } from '@/services/workspace-service'

interface WorkspaceState {
  currentPath: string | null
  recentWorkspaces: WorkspaceInfo[]
  isLoading: boolean
  openWorkspace: (folderPath?: string) => Promise<void>
  loadRecent: () => Promise<void>
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentPath: null,
  recentWorkspaces: [],
  isLoading: false,

  openWorkspace: async (folderPath?: string) => {
    set({ isLoading: true })
    try {
      const path = await workspaceService.open(folderPath)
      if (path) {
        set({ currentPath: path })
      }
    } finally {
      set({ isLoading: false })
    }
  },

  loadRecent: async () => {
    const recent = await workspaceService.getRecent()
    set({ recentWorkspaces: recent })
  },
}))
