import path from 'path'
import fs from 'fs/promises'
import { watch, type FSWatcher } from 'chokidar'
import { CONFIG_DIR } from '@shared/constants'
import { FileNode, FileChangeEvent } from '@shared/types/ipc'
import { logger } from '../utils/logger'

type FileChangeCallback = (event: FileChangeEvent) => void

export class FileService {
  private workspacePath: string
  private watcher: FSWatcher | null = null
  private callbacks: Set<FileChangeCallback> = new Set()

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath
  }

  getWorkspacePath(): string {
    return this.workspacePath
  }

  async initialize(): Promise<void> {
    this.watcher = watch(this.workspacePath, {
      ignored: [
        /(^|[/\\])\../, // hidden files/folders starting with .
        path.join(this.workspacePath, CONFIG_DIR, '**'),
        '**/node_modules/**'
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    })

    const eventTypes: Array<FileChangeEvent['type']> = [
      'add',
      'change',
      'unlink',
      'addDir',
      'unlinkDir'
    ]

    for (const eventType of eventTypes) {
      this.watcher.on(eventType, (filePath: string) => {
        const relativePath = path.relative(this.workspacePath, filePath)
        const event: FileChangeEvent = { type: eventType, path: relativePath }
        for (const cb of this.callbacks) {
          try {
            cb(event)
          } catch (err) {
            logger.error('File change callback error:', err)
          }
        }
      })
    }

    logger.info('File watcher initialized for', this.workspacePath)
  }

  async readFile(relativePath: string): Promise<string> {
    const fullPath = path.join(this.workspacePath, relativePath)
    this.validatePath(fullPath)
    return fs.readFile(fullPath, 'utf-8')
  }

  async readBinaryFile(relativePath: string): Promise<Buffer> {
    const fullPath = path.join(this.workspacePath, relativePath)
    this.validatePath(fullPath)
    return fs.readFile(fullPath)
  }

  async writeFile(relativePath: string, content: string): Promise<void> {
    const fullPath = path.join(this.workspacePath, relativePath)
    this.validatePath(fullPath)
    const dir = path.dirname(fullPath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(fullPath, content, 'utf-8')
  }

  async createFile(dirPath: string, fileName: string): Promise<string> {
    const dir = path.join(this.workspacePath, dirPath)
    this.validatePath(dir)
    await fs.mkdir(dir, { recursive: true })

    const fullPath = path.join(dir, fileName)
    this.validatePath(fullPath)

    const ext = path.extname(fileName).toLowerCase()
    const isMd = ext === '.md' || ext === '.markdown'

    if (isMd) {
      // Create markdown file with front matter template
      const title = path.basename(fileName, ext)
      const now = new Date().toISOString()
      const frontMatter = `---
title: "${title}"
created: ${now}
updated: ${now}
tags: []
---

`
      await fs.writeFile(fullPath, frontMatter, 'utf-8')
    } else {
      // Create empty file for non-markdown formats
      await fs.writeFile(fullPath, '', 'utf-8')
    }

    return path.relative(this.workspacePath, fullPath)
  }

  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = path.join(this.workspacePath, relativePath)
    this.validatePath(fullPath)

    // Move to trash instead of permanently deleting
    const trashDir = path.join(this.workspacePath, CONFIG_DIR, 'trash')
    await fs.mkdir(trashDir, { recursive: true })

    const timestamp = Date.now()
    const trashName = `${timestamp}_${path.basename(relativePath)}`
    const trashPath = path.join(trashDir, trashName)

    await fs.rename(fullPath, trashPath)
    logger.info('Moved to trash:', relativePath)
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    const fullOldPath = path.join(this.workspacePath, oldPath)
    const fullNewPath = path.join(this.workspacePath, newPath)
    this.validatePath(fullOldPath)
    this.validatePath(fullNewPath)

    const dir = path.dirname(fullNewPath)
    await fs.mkdir(dir, { recursive: true })
    await fs.rename(fullOldPath, fullNewPath)
  }

  async createFolder(parentPath: string, folderName: string): Promise<string> {
    const fullPath = path.join(this.workspacePath, parentPath, folderName)
    this.validatePath(fullPath)
    await fs.mkdir(fullPath, { recursive: true })
    return path.relative(this.workspacePath, fullPath)
  }

  async getFileTree(): Promise<FileNode[]> {
    return this.buildFileTree(this.workspacePath, '')
  }

  private async buildFileTree(dirPath: string, relativePath: string): Promise<FileNode[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const nodes: FileNode[] = []

    // Sort: folders first, then files, both alphabetically
    const sorted = entries
      .filter((entry) => {
        // Skip hidden files/folders, config dir, and PDF sidecar files
        if (entry.name.startsWith('.')) return false
        if (entry.name === 'node_modules') return false
        if (entry.name.endsWith('.pdf.meta.json')) return false
        return true
      })
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1
        if (!a.isDirectory() && b.isDirectory()) return 1
        return a.name.localeCompare(b.name)
      })

    for (const entry of sorted) {
      const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name

      if (entry.isDirectory()) {
        const children = await this.buildFileTree(
          path.join(dirPath, entry.name),
          entryRelativePath
        )
        nodes.push({
          id: entryRelativePath,
          name: entry.name,
          type: 'folder',
          path: entryRelativePath,
          children
        })
      } else {
        nodes.push({
          id: entryRelativePath,
          name: entry.name,
          type: 'file',
          path: entryRelativePath
        })
      }
    }

    return nodes
  }

  onFileChange(callback: FileChangeCallback): () => void {
    this.callbacks.add(callback)
    return () => {
      this.callbacks.delete(callback)
    }
  }

  async importExternalFiles(absolutePaths: string[], targetDir: string): Promise<string[]> {
    const fullTargetDir = path.join(this.workspacePath, targetDir)
    this.validatePath(fullTargetDir)
    await fs.mkdir(fullTargetDir, { recursive: true })

    const imported: string[] = []
    for (const srcPath of absolutePaths) {
      try {
        const fileName = path.basename(srcPath)
        let destPath = path.join(fullTargetDir, fileName)

        // Avoid overwriting: append suffix if needed
        try {
          await fs.access(destPath)
          const ext = path.extname(fileName)
          const base = fileName.slice(0, -ext.length || undefined)
          let i = 1
          while (true) {
            const candidate = path.join(fullTargetDir, ext ? `${base}_${i}${ext}` : `${fileName}_${i}`)
            try {
              await fs.access(candidate)
              i++
            } catch {
              destPath = candidate
              break
            }
          }
        } catch {
          // File doesn't exist, use as-is
        }

        const stat = await fs.stat(srcPath)
        if (stat.isDirectory()) {
          await fs.cp(srcPath, destPath, { recursive: true })
        } else {
          await fs.copyFile(srcPath, destPath)
        }
        const rel = path.relative(this.workspacePath, destPath)
        imported.push(rel)
        logger.info('Imported external file:', srcPath, '→', rel)
      } catch (err) {
        logger.error('Failed to import file:', srcPath, err)
      }
    }
    return imported
  }

  validatePath(fullPath: string): void {
    const resolved = path.resolve(fullPath)
    const workspaceResolved = path.resolve(this.workspacePath)

    if (!resolved.startsWith(workspaceResolved)) {
      throw new Error(`Path traversal detected: ${fullPath} is outside workspace`)
    }
  }

  async dispose(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
    }
    this.callbacks.clear()
    logger.info('File service disposed')
  }
}
