import * as FileSystem from 'expo-file-system'
import matter from 'gray-matter'
import type { Tag } from '@ai-note/shared-types'
import { dbService } from './db-service'

class TagService {
  private workspacePath = ''

  async initialize(workspacePath: string): Promise<void> {
    this.workspacePath = workspacePath
    await this.scanAndSync(workspacePath, '')
  }

  private async scanAndSync(dirPath: string, relativePath: string): Promise<void> {
    const entries = await FileSystem.readDirectoryAsync(dirPath)
    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules') continue
      const fullPath = `${dirPath}/${entry}`
      const info = await FileSystem.getInfoAsync(fullPath)

      if (info.isDirectory) {
        const subRelPath = relativePath ? `${relativePath}/${entry}` : entry
        await this.scanAndSync(fullPath, subRelPath)
      } else if (entry.endsWith('.md')) {
        const fileRelPath = relativePath ? `${relativePath}/${entry}` : entry
        await this.syncFileTags(fullPath, fileRelPath)
      }
    }
  }

  async syncFileTags(absolutePath: string, relativePath: string): Promise<void> {
    try {
      const content = await FileSystem.readAsStringAsync(absolutePath)
      const { data } = matter(content)
      const tags: string[] = Array.isArray(data.tags) ? data.tags : []
      const title = data.title || relativePath.split('/').pop()?.replace('.md', '') || ''
      const createdAt = data.created ? new Date(data.created).getTime() : Date.now()
      const updatedAt = data.updated ? new Date(data.updated).getTime() : Date.now()

      // Simple hash of content for change detection
      let hash = 0
      for (let i = 0; i < content.length; i++) {
        hash = (hash << 5) - hash + content.charCodeAt(i)
        hash |= 0
      }

      await dbService.upsertNote(relativePath, title, createdAt, updatedAt, String(hash))
      await dbService.updateNoteTags(relativePath, tags)
    } catch {
      // Skip files that can't be parsed
    }
  }

  async getAllTags(): Promise<Tag[]> {
    return dbService.getAllTags()
  }

  async getNotesByTag(tagName: string): Promise<string[]> {
    return dbService.getNotesByTag(tagName)
  }

  async updateNoteTags(relativePath: string, tags: string[]): Promise<void> {
    const absolutePath = `${this.workspacePath}/${relativePath}`
    const content = await FileSystem.readAsStringAsync(absolutePath)
    const parsed = matter(content)

    parsed.data.tags = tags
    parsed.data.updated = new Date().toISOString()

    const updated = matter.stringify(parsed.content, parsed.data)
    await FileSystem.writeAsStringAsync(absolutePath, updated)
    await dbService.updateNoteTags(relativePath, tags)
  }

  async renameTag(oldName: string, newName: string): Promise<void> {
    const noteIds = await dbService.getNotesByTag(oldName)
    for (const noteId of noteIds) {
      const absolutePath = `${this.workspacePath}/${noteId}`
      try {
        const content = await FileSystem.readAsStringAsync(absolutePath)
        const parsed = matter(content)
        const tags: string[] = Array.isArray(parsed.data.tags) ? parsed.data.tags : []
        const idx = tags.indexOf(oldName)
        if (idx !== -1) {
          tags[idx] = newName
          parsed.data.tags = tags
          parsed.data.updated = new Date().toISOString()
          const updated = matter.stringify(parsed.content, parsed.data)
          await FileSystem.writeAsStringAsync(absolutePath, updated)
        }
        await dbService.updateNoteTags(noteId, tags)
      } catch {
        // Skip files that can't be updated
      }
    }
  }
}

export const tagService = new TagService()
