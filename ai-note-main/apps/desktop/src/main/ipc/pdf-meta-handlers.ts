import { ipcMain } from 'electron'
import { PdfMetaService } from '../services/pdf-meta-service'
import { PdfSidecarMeta } from '@shared/types/pdf-meta'
import { logger } from '../utils/logger'

export function registerPdfMetaHandlers(pdfMetaService: PdfMetaService): void {
  ipcMain.handle('pdf-meta:read', async (_event, relativePdfPath: string) => {
    return pdfMetaService.readMeta(relativePdfPath)
  })

  ipcMain.handle(
    'pdf-meta:write',
    async (_event, relativePdfPath: string, meta: PdfSidecarMeta) => {
      await pdfMetaService.writeMeta(relativePdfPath, meta)
    }
  )

  logger.info('PDF meta IPC handlers registered')
}

export function unregisterPdfMetaHandlers(): void {
  ipcMain.removeHandler('pdf-meta:read')
  ipcMain.removeHandler('pdf-meta:write')
}
