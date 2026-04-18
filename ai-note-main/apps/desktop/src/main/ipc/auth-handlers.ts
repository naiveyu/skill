import { ipcMain } from 'electron'
import type { AuthRegisterData, AuthCredentials } from '@ai-note/shared-types'
import { AuthService } from '../services/auth-service'
import { logger } from '../utils/logger'

export function registerAuthHandlers(authService: AuthService): void {
  ipcMain.handle('auth:register', async (_event, data: AuthRegisterData) => {
    return authService.register(data)
  })

  ipcMain.handle('auth:login', async (_event, credentials: AuthCredentials) => {
    return authService.login(credentials)
  })

  ipcMain.handle('auth:validate', async () => {
    return authService.validateToken()
  })

  ipcMain.handle('auth:get-state', async () => {
    return authService.getAuthState()
  })

  ipcMain.handle('auth:logout', async () => {
    return authService.logout()
  })

  ipcMain.handle('auth:update-profile', async (_event, data: { username?: string; password?: string }) => {
    return authService.updateProfile(data)
  })

  ipcMain.handle('auth:get-server-url', async () => {
    return authService.getServerUrl()
  })

  ipcMain.handle('auth:set-server-url', async (_event, url: string) => {
    authService.setServerUrl(url)
  })

  logger.info('Auth IPC handlers registered')
}

export function unregisterAuthHandlers(): void {
  ipcMain.removeHandler('auth:register')
  ipcMain.removeHandler('auth:login')
  ipcMain.removeHandler('auth:validate')
  ipcMain.removeHandler('auth:get-state')
  ipcMain.removeHandler('auth:logout')
  ipcMain.removeHandler('auth:update-profile')
  ipcMain.removeHandler('auth:get-server-url')
  ipcMain.removeHandler('auth:set-server-url')
}
