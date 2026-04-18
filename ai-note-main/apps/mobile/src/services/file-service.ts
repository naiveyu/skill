import * as FileSystem from 'expo-file-system'
import type { FileNode } from '@ai-note/shared-types'
import { CONFIG_DIR, TRASH_DIR } from '@ai-note/shared-types'

class FileService {
  private workspacePath = ''

  initialize(workspacePath: string) {
    this.workspacePath = workspacePath
  }

  getWorkspacePath(): string {
    return this.workspacePath
  }

  async readFile(relativePath: string): Promise<string> {
    this.validatePath(relativePath)
    const fullPath = this.resolvePath(relativePath)
    return await FileSystem.readAsStringAsync(fullPath)
  }

  async writeFile(relativePath: string, content: string): Promise<void> {
    this.validatePath(relativePath)
    const fullPath = this.resolvePath(relativePath)
    await FileSystem.writeAsStringAsync(fullPath, content)
  }

  async createFile(dirPath: string, fileName: string): Promise<string> {
    const name = fileName.endsWith('.md') ? fileName : `${fileName}.md`
    const relativePath = dirPath ? `${dirPath}/${name}` : name
    this.validatePath(relativePath)

    const fullPath = this.resolvePath(relativePath)
    const now = new Date().toISOString()
    const title = name.replace('.md', '')
    const content = `---\ntitle: ${title}\ncreated: ${now}\nupdated: ${now}\ntags: []\n---\n\n`

    await FileSystem.writeAsStringAsync(fullPath, content)
    return relativePath
  }

  async deleteFile(relativePath: string): Promise<void> {
    this.validatePath(relativePath)
    const fullPath = this.resolvePath(relativePath)

    // Soft delete: move to trash
    const trashDir = `${this.workspacePath}/${CONFIG_DIR}/${TRASH_DIR}`
    const trashInfo = await FileSystem.getInfoAsync(trashDir)
    if (!trashInfo.exists) {
      await FileSystem.makeDirectoryAsync(trashDir, { intermediates: true })
    }

    const fileName = relativePath.split('/').pop() || relativePath
    const trashPath = `${trashDir}/${Date.now()}_${fileName}`
    await FileSystem.moveAsync({ from: fullPath, to: trashPath })
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    this.validatePath(oldPath)
    this.validatePath(newPath)
    const fullOldPath = this.resolvePath(oldPath)
    const fullNewPath = this.resolvePath(newPath)
    await FileSystem.moveAsync({ from: fullOldPath, to: fullNewPath })
  }

  async createFolder(parentPath: string, folderName: string): Promise<string> {
    const relativePath = parentPath ? `${parentPath}/${folderName}` : folderName
    this.validatePath(relativePath)
    const fullPath = this.resolvePath(relativePath)
    await FileSystem.makeDirectoryAsync(fullPath, { intermediates: true })
    return relativePath
  }

  async getFileTree(): Promise<FileNode[]> {
    return await this.buildTree(this.workspacePath, '')
  }

  private async buildTree(dirPath: string, relativePath: string): Promise<FileNode[]> {
    const entries = await FileSystem.readDirectoryAsync(dirPath)
    const nodes: FileNode[] = []

    // Separate folders and files, sort alphabetically
    const folders: string[] = []
    const files: string[] = []

    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules') continue
      const fullPath = `${dirPath}/${entry}`
      const info = await FileSystem.getInfoAsync(fullPath)
      if (info.isDirectory) {
        folders.push(entry)
      } else if (entry.endsWith('.md')) {
        files.push(entry)
      }
    }

    folders.sort()
    files.sort()

    // Build folder nodes with children
    for (const folder of folders) {
      const folderRelPath = relativePath ? `${relativePath}/${folder}` : folder
      const children = await this.buildTree(`${dirPath}/${folder}`, folderRelPath)
      nodes.push({
        id: folderRelPath,
        name: folder,
        type: 'folder',
        path: folderRelPath,
        children,
      })
    }

    // Build file nodes
    for (const file of files) {
      const fileRelPath = relativePath ? `${relativePath}/${file}` : file
      nodes.push({
        id: fileRelPath,
        name: file,
        type: 'file',
        path: fileRelPath,
      })
    }

    return nodes
  }

  private resolvePath(relativePath: string): string {
    return `${this.workspacePath}/${relativePath}`
  }

  private validatePath(relativePath: string): void {
    if (relativePath.includes('..')) {
      throw new Error('Path traversal not allowed')
    }
    if (relativePath.startsWith(CONFIG_DIR)) {
      throw new Error('Cannot access config directory')
    }
  }
}

export const fileService = new FileService()
