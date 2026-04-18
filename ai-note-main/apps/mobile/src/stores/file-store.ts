import { create } from 'zustand'
import type { FileNode } from '@ai-note/shared-types'
import { fileService } from '@/services/file-service'

interface FileState {
  tree: FileNode[]
  selectedFileId: string | null
  expandedFolders: Set<string>
  loadFileTree: () => Promise<void>
  selectFile: (id: string) => void
  toggleFolder: (id: string) => void
  createFile: (dirPath: string, fileName: string) => Promise<string>
  createFolder: (parentPath: string, folderName: string) => Promise<string>
  deleteFile: (relativePath: string) => Promise<void>
  renameFile: (oldPath: string, newPath: string) => Promise<void>
}

export const useFileStore = create<FileState>((set, get) => ({
  tree: [],
  selectedFileId: null,
  expandedFolders: new Set<string>(),

  loadFileTree: async () => {
    const tree = await fileService.getFileTree()
    set({ tree })
  },

  selectFile: (id) => set({ selectedFileId: id }),

  toggleFolder: (id) => {
    const folders = new Set(get().expandedFolders)
    if (folders.has(id)) {
      folders.delete(id)
    } else {
      folders.add(id)
    }
    set({ expandedFolders: folders })
  },

  createFile: async (dirPath, fileName) => {
    const path = await fileService.createFile(dirPath, fileName)
    await get().loadFileTree()
    return path
  },

  createFolder: async (parentPath, folderName) => {
    const path = await fileService.createFolder(parentPath, folderName)
    await get().loadFileTree()
    return path
  },

  deleteFile: async (relativePath) => {
    await fileService.deleteFile(relativePath)
    const { selectedFileId, loadFileTree } = get()
    if (selectedFileId === relativePath) {
      set({ selectedFileId: null })
    }
    await loadFileTree()
  },

  renameFile: async (oldPath, newPath) => {
    await fileService.renameFile(oldPath, newPath)
    await get().loadFileTree()
  },
}))
