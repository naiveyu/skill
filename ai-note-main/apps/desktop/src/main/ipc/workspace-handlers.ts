import path from 'path'
import { ipcMain, dialog, BrowserWindow } from 'electron'
import { logger } from '../utils/logger'

interface WorkspaceCallbacks {
  onOpen: (folderPath: string) => Promise<void>
  getRecent: () => Promise<{ path: string; name: string; lastOpened: number }[]>
  getCurrent: () => string | null
}

export function registerWorkspaceHandlers(
  mainWindow: BrowserWindow,
  callbacks: WorkspaceCallbacks
): void {
  ipcMain.handle('workspace:open', async (_event, folderPath?: string) => {
    let selectedPath = folderPath

    if (!selectedPath) {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Open Workspace Folder'
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      selectedPath = result.filePaths[0]
    }

    try {
      await callbacks.onOpen(selectedPath)
      return selectedPath
    } catch (err) {
      logger.error('Failed to open workspace:', err)
      throw err
    }
  })

  ipcMain.handle('workspace:get-recent', async () => {
    return callbacks.getRecent()
  })

  ipcMain.handle('workspace:get-current', async () => {
    return callbacks.getCurrent()
  })

  logger.info('Workspace IPC handlers registered')
}

export function unregisterWorkspaceHandlers(): void {
  ipcMain.removeHandler('workspace:open')
  ipcMain.removeHandler('workspace:get-recent')
  ipcMain.removeHandler('workspace:get-current')
}
