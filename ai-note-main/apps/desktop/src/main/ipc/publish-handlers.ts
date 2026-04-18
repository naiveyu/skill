import { ipcMain, BrowserWindow } from 'electron'
import { PublishService } from '../services/publish/publish-service'
import { logger } from '../utils/logger'
import type { PublishPlatform, PublishOptions } from '@ai-note/shared-types'

export function registerPublishHandlers(publishService: PublishService, mainWindow: BrowserWindow): void {
  publishService.setMainWindow(mainWindow)

  ipcMain.handle('publish:get-auth-status', async (_event, platform: PublishPlatform) => {
    return publishService.getAuthStatus(platform)
  })

  ipcMain.handle('publish:login', async (_event, platform: PublishPlatform) => {
    return publishService.openLoginPage(platform)
  })

  ipcMain.handle('publish:publish', async (_event, options: PublishOptions) => {
    return publishService.publish(options)
  })

  ipcMain.handle('publish:get-history', async () => {
    return publishService.getHistory()
  })

  ipcMain.handle('publish:cancel', async () => {
    publishService.cancel()
  })

  logger.info('Publish IPC handlers registered')
}

export function unregisterPublishHandlers(): void {
  ipcMain.removeHandler('publish:get-auth-status')
  ipcMain.removeHandler('publish:login')
  ipcMain.removeHandler('publish:publish')
  ipcMain.removeHandler('publish:get-history')
  ipcMain.removeHandler('publish:cancel')
}
