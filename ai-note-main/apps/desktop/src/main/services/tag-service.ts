import path from 'path'
import fs from 'fs/promises'
import matter from 'gray-matter'
import { Tag } from '@shared/types/ipc'
import { DbService } from './db-service'
import { PdfMetaService } from './pdf-meta-service'
import { logger } from '../utils/logger'

export class TagService {
  private workspacePath: string
  private dbService: DbService
  private pdfMetaService: PdfMetaService

  constructor(workspacePath: string, dbService: DbService) {
    this.workspacePath = workspacePath
    this.dbService = dbService
    this.pdfMetaService = new PdfMetaService(workspacePath)
  }

  async initialize(): Promise<void> {
    const mdFiles = await this.scanMarkdownFiles(this.workspacePath)

    for (const filePath of mdFiles) {
      await this.syncFileTags(filePath)
    }

    // Scan PDF sidecar files for tags
    const pdfFiles = await this.pdfMetaService.scanPdfMetaFiles(this.workspacePath)
    for (const pdfRelPath of pdfFiles) {
      await this.syncPdfTags(pdfRelPath)
    }

    logger.info(`Tags synced from ${mdFiles.length} md files, ${pdfFiles.length} pdf files`)
  }

  async syncPdfTags(relativePdfPath: string): Promise<void> {
    try {
      const meta = await this.pdfMetaService.readMeta(relativePdfPath)
      const tags = meta.tags || []
      const title = meta.title || path.basename(relativePdfPath, '.pdf')
      const now = Date.now()

      this.dbService.upsertNote(relativePdfPath, title, now, now, '')
      this.dbService.updateNoteTags(relativePdfPath, tags)
    } catch (err) {
      logger.error('Failed to sync PDF tags:', relativePdfPath, err)
    }
  }

  private async scanMarkdownFiles(dirPath: string): Promise<string[]> {
    const files: string[] = []
    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue

      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        const subFiles = await this.scanMarkdownFiles(fullPath)
        files.push(...subFiles)
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath)
      }
    }

    return files
  }

  async syncFileTags(absolutePath: string): Promise<void> {
    try {
      const content = await fs.readFile(absolutePath, 'utf-8')
      const { data } = matter(content)
      const relativePath = path.relative(this.workspacePath, absolutePath)

      const tags: string[] = Array.isArray(data.tags) ? data.tags : []
      const title = (data.title as string) || path.basename(absolutePath, '.md')
      const now = Date.now()

      this.dbService.upsertNote(relativePath, title, now, now, '')
      this.dbService.updateNoteTags(relativePath, tags)
    } catch (err) {
      logger.error('Failed to sync tags for:', absolutePath, err)
    }
  }

  async getAllTags(): Promise<Tag[]> {
    return this.dbService.getAllTags()
  }

  async getNotesByTag(tagName: string): Promise<string[]> {
    return this.dbService.getNotesByTag(tagName)
  }

  async updateNoteTags(relativePath: string, tags: string[]): Promise<void> {
    // PDF files: update sidecar JSON instead of front matter
    if (relativePath.endsWith('.pdf')) {
      try {
        const meta = await this.pdfMetaService.readMeta(relativePath)
        meta.tags = tags
        meta.updatedAt = Date.now()
        await this.pdfMetaService.writeMeta(relativePath, meta)
        this.dbService.updateNoteTags(relativePath, tags)
        logger.info('Updated PDF tags for:', relativePath, tags)
      } catch (err) {
        logger.error('Failed to update PDF tags:', err)
        throw err
      }
      return
    }

    const fullPath = path.join(this.workspacePath, relativePath)

    try {
      const content = await fs.readFile(fullPath, 'utf-8')
      const parsed = matter(content)

      parsed.data.tags = tags
      parsed.data.updated = new Date().toISOString()

      const updated = matter.stringify(parsed.content, parsed.data)
      await fs.writeFile(fullPath, updated, 'utf-8')

      // Update DB
      this.dbService.updateNoteTags(relativePath, tags)
      logger.info('Updated tags for:', relativePath, tags)
    } catch (err) {
      logger.error('Failed to update tags:', err)
      throw err
    }
  }

  async renameTag(oldName: string, newName: string): Promise<void> {
    const noteIds = this.dbService.getNotesByTag(oldName)

    for (const noteId of noteIds) {
      const fullPath = path.join(this.workspacePath, noteId)

      try {
        const content = await fs.readFile(fullPath, 'utf-8')
        const parsed = matter(content)

        if (Array.isArray(parsed.data.tags)) {
          parsed.data.tags = parsed.data.tags.map((tag: string) =>
            tag === oldName ? newName : tag
          )
          parsed.data.updated = new Date().toISOString()

          const updated = matter.stringify(parsed.content, parsed.data)
          await fs.writeFile(fullPath, updated, 'utf-8')

          this.dbService.updateNoteTags(noteId, parsed.data.tags)
        }
      } catch (err) {
        logger.error('Failed to rename tag in file:', noteId, err)
      }
    }

    logger.info('Renamed tag:', oldName, '->', newName)
  }
}
