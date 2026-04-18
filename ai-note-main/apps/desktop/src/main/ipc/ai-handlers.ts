import { ipcMain, BrowserWindow } from 'electron'
import { AiService } from '../services/ai-service'
import { ConfigService } from '../services/config-service'
import { logger } from '../utils/logger'

let configServiceRef: ConfigService | null = null

export function registerAiHandlers(
  aiService: AiService,
  mainWindow: BrowserWindow,
  configService?: ConfigService
): void {
  aiService.setMainWindow(mainWindow)
  if (configService) {
    configServiceRef = configService
  }

  ipcMain.handle('ai:save-token', async (_event, token: string) => {
    try {
      if (!configServiceRef) {
        return { success: false }
      }
      await configServiceRef.set('ai.setupToken', token)
      logger.info('AI setup token saved')
      return { success: true }
    } catch (err: any) {
      logger.error('Failed to save AI token:', err)
      return { success: false }
    }
  })

  ipcMain.handle('ai:get-token-status', async () => {
    try {
      if (!configServiceRef) {
        return { configured: false }
      }
      const token = configServiceRef.get('ai.setupToken') as string | undefined
      if (!token) {
        return { configured: false }
      }
      // Mask the token for display: show first 12 chars + **** + last 4 chars
      const preview = token.length > 20
        ? `${token.slice(0, 12)}****...${token.slice(-4)}`
        : '****'
      return { configured: true, preview }
    } catch {
      return { configured: false }
    }
  })

  ipcMain.handle('ai:send', async (_event, prompt: string) => {
    const token = configServiceRef?.get('ai.setupToken') as string | undefined
    if (!token) {
      mainWindow.webContents.send('ai:stream-error', {
        message: 'Setup token not configured. Please configure your token in AI settings.'
      })
      return
    }
    logger.info('ai:send called, prompt length:', prompt.length)
    return aiService.send(prompt, token)
  })

  ipcMain.handle('ai:cancel', async () => {
    aiService.cancel()
  })

  logger.info('AI IPC handlers registered')
}

export function setAiConfigService(configService: ConfigService): void {
  configServiceRef = configService
}

export function unregisterAiHandlers(): void {
  ipcMain.removeHandler('ai:save-token')
  ipcMain.removeHandler('ai:get-token-status')
  ipcMain.removeHandler('ai:send')
  ipcMain.removeHandler('ai:cancel')
}
