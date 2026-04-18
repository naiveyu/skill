import path from 'path'
import fs from 'fs/promises'
import { PdfSidecarMeta, createEmptyPdfMeta } from '@shared/types/pdf-meta'
import { logger } from '../utils/logger'

export class PdfMetaService {
  private workspacePath: string

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath
  }

  private getMetaPath(relativePdfPath: string): string {
    return path.join(this.workspacePath, relativePdfPath + '.meta.json')
  }

  async readMeta(relativePdfPath: string): Promise<PdfSidecarMeta> {
    const metaPath = this.getMetaPath(relativePdfPath)
    try {
      const raw = await fs.readFile(metaPath, 'utf-8')
      return JSON.parse(raw) as PdfSidecarMeta
    } catch {
      const title = path.basename(relativePdfPath, '.pdf')
      return createEmptyPdfMeta(title)
    }
  }

  async writeMeta(relativePdfPath: string, meta: PdfSidecarMeta): Promise<void> {
    const metaPath = this.getMetaPath(relativePdfPath)
    meta.updatedAt = Date.now()
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8')
    logger.info('Saved PDF metadata:', metaPath)
  }

  async scanPdfMetaFiles(dirPath: string): Promise<string[]> {
    const files: string[] = []
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
        const fullPath = path.join(dirPath, entry.name)
        if (entry.isDirectory()) {
          const subFiles = await this.scanPdfMetaFiles(fullPath)
          files.push(...subFiles)
        } else if (entry.name.endsWith('.pdf.meta.json')) {
          const pdfRelative = path.relative(
            this.workspacePath,
            fullPath.replace(/\.meta\.json$/, '')
          )
          files.push(pdfRelative)
        }
      }
    } catch (err) {
      logger.error('Failed to scan PDF meta files:', err)
    }
    return files
  }
}
