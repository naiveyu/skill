import { ipcMain } from 'electron'
import { ConfigService } from '../services/config-service'
import { logger } from '../utils/logger'

export function registerConfigHandlers(configService: ConfigService): void {
  ipcMain.handle('config:get', async (_event, key: string) => {
    return configService.get(key)
  })

  ipcMain.handle('config:set', async (_event, key: string, value: any) => {
    await configService.set(key, value)
  })

  ipcMain.handle('config:get-all', async () => {
    return configService.getAll()
  })

  logger.info('Config IPC handlers registered')
}

export function unregisterConfigHandlers(): void {
  ipcMain.removeHandler('config:get')
  ipcMain.removeHandler('config:set')
  ipcMain.removeHandler('config:get-all')
}
