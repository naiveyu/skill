import { create } from 'zustand'
import type { FileNode } from '@shared/types/ipc'

interface ClipboardState {
  path: string
  op: 'copy' | 'cut'
}

interface FileState {
  tree: FileNode[]
  selectedFileId: string | null
  expandedFolders: Set<string>
  clipboard: ClipboardState | null

  loadFileTree: () => Promise<void>
  selectFile: (id: string) => void
  revealInSidebar: (filePath: string) => void
  toggleFolder: (id: string) => void
  createFile: (parentId: string, name: string) => Promise<void>
  createFolder: (parentId: string, name: string) => Promise<void>
  deleteFile: (id: string) => Promise<void>
  renameFile: (id: string, newName: string) => Promise<void>
  moveFile: (sourcePath: string, targetFolderPath: string) => Promise<void>
  copyToClipboard: (filePath: string) => void
  cutToClipboard: (filePath: string) => void
  pasteFiles: (targetDir: string) => Promise<string[]>
  importExternalFiles: (absolutePaths: string[], targetDir: string) => Promise<string[]>
}

// Helper to find a node by id (path) in the tree
function findNode(tree: FileNode[], id: string): FileNode | null {
  for (const node of tree) {
    if (node.id === id || node.path === id) return node
    if (node.children) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

// Helper to get parent directory path from a file path
function getParentPath(filePath: string): string {
  const parts = filePath.split('/')
  parts.pop()
  return parts.join('/')
}

export const useFileStore = create<FileState>((set, get) => ({
  tree: [],
  selectedFileId: null,
  expandedFolders: new Set<string>(),
  clipboard: null,

  loadFileTree: async () => {
    try {
      const tree = await window.electronAPI.file.getFileTree()
      set({ tree })
    } catch (error) {
      console.error('Failed to load file tree:', error)
    }
  },

  selectFile: (id: string) => {
    set({ selectedFileId: id })
  },

  revealInSidebar: (filePath: string) => {
    // Expand all parent folders leading to the file, then select it
    const parts = filePath.split('/')
    const { expandedFolders } = get()
    const next = new Set(expandedFolders)
    let current = ''
    for (let i = 0; i < parts.length - 1; i++) {
      current = current ? `${current}/${parts[i]}` : parts[i]
      next.add(current)
    }
    set({ expandedFolders: next, selectedFileId: filePath })
  },

  toggleFolder: (id: string) => {
    const { expandedFolders } = get()
    const next = new Set(expandedFolders)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    set({ expandedFolders: next })
  },

  createFile: async (parentId: string, name: string) => {
    try {
      await window.electronAPI.file.createFile(parentId, name)
      await get().loadFileTree()
    } catch (error) {
      console.error('Failed to create file:', error)
    }
  },

  createFolder: async (parentId: string, name: string) => {
    try {
      await window.electronAPI.file.createFolder(parentId, name)
      await get().loadFileTree()
    } catch (error) {
      console.error('Failed to create folder:', error)
    }
  },

  deleteFile: async (id: string) => {
    try {
      const node = findNode(get().tree, id)
      if (!node) return
      await window.electronAPI.file.deleteFile(node.path)
      // Clear selection if the deleted file was selected
      if (get().selectedFileId === id) {
        set({ selectedFileId: null })
      }
      await get().loadFileTree()
    } catch (error) {
      console.error('Failed to delete file:', error)
    }
  },

  renameFile: async (id: string, newName: string) => {
    try {
      const node = findNode(get().tree, id)
      if (!node) return
      const parentPath = getParentPath(node.path)
      const newPath = parentPath ? `${parentPath}/${newName}` : newName
      await window.electronAPI.file.renameFile(node.path, newPath)
      await get().loadFileTree()
    } catch (error) {
      console.error('Failed to rename file:', error)
    }
  },

  moveFile: async (sourcePath: string, targetFolderPath: string) => {
    try {
      const fileName = sourcePath.split('/').pop()
      if (!fileName) return
      const newPath = targetFolderPath ? `${targetFolderPath}/${fileName}` : fileName
      if (sourcePath === newPath) return
      await window.electronAPI.file.renameFile(sourcePath, newPath)
      await get().loadFileTree()
    } catch (error) {
      console.error('Failed to move file:', error)
    }
  },

  copyToClipboard: (filePath: string) => {
    set({ clipboard: { path: filePath, op: 'copy' } })
  },

  cutToClipboard: (filePath: string) => {
    set({ clipboard: { path: filePath, op: 'cut' } })
  },

  pasteFiles: async (targetDir: string) => {
    const { clipboard } = get()

    // Internal clipboard takes priority
    if (clipboard) {
      try {
        if (clipboard.op === 'copy') {
          await window.electronAPI.file.copyWithin(clipboard.path, targetDir)
        } else {
          // Cut = move
          const fileName = clipboard.path.split('/').pop()
          if (fileName) {
            const newPath = targetDir ? `${targetDir}/${fileName}` : fileName
            if (clipboard.path !== newPath) {
              await window.electronAPI.file.renameFile(clipboard.path, newPath)
            }
          }
          set({ clipboard: null }) // Clear after cut
        }
        await get().loadFileTree()
        return [clipboard.path]
      } catch (error) {
        console.error('Failed to paste file:', error)
        return []
      }
    }

    // Fallback: system clipboard
    try {
      const pasted = await window.electronAPI.file.pasteFromClipboard(targetDir)
      await get().loadFileTree()
      return pasted
    } catch (error) {
      console.error('Failed to paste files:', error)
      return []
    }
  },

  importExternalFiles: async (absolutePaths: string[], targetDir: string) => {
    try {
      const imported = await window.electronAPI.file.importExternalFiles(absolutePaths, targetDir)
      await get().loadFileTree()
      return imported
    } catch (error) {
      console.error('Failed to import external files:', error)
      return []
    }
  }
}))
