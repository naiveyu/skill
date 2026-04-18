import { ipcMain } from 'electron'
import { GitService } from '../services/git-service'
import { SearchOptions } from '@shared/types/ipc'
import { logger } from '../utils/logger'

export function registerGitHandlers(gitService: GitService): void {
  ipcMain.handle('git:history', async (_event, filePath: string, limit?: number) => {
    return gitService.getHistory(filePath, limit)
  })

  ipcMain.handle(
    'git:diff',
    async (_event, sha1: string, sha2: string, filePath: string) => {
      return gitService.getDiff(sha1, sha2, filePath)
    }
  )

  ipcMain.handle('git:file-content', async (_event, sha: string, filePath: string) => {
    return gitService.getFileContent(sha, filePath)
  })

  ipcMain.handle('git:restore', async (_event, filePath: string, sha: string) => {
    await gitService.restoreFile(filePath, sha)
  })

  ipcMain.handle('git:commit', async (_event, message: string, files?: string[]) => {
    return gitService.commit(message, files)
  })

  ipcMain.handle('git:save-version', async (_event, filePath: string, description: string) => {
    return gitService.saveVersion(filePath, description)
  })

  ipcMain.handle('git:status', async () => {
    return gitService.getStatus()
  })

  logger.info('Git IPC handlers registered')
}

export function unregisterGitHandlers(): void {
  ipcMain.removeHandler('git:history')
  ipcMain.removeHandler('git:diff')
  ipcMain.removeHandler('git:file-content')
  ipcMain.removeHandler('git:restore')
  ipcMain.removeHandler('git:commit')
  ipcMain.removeHandler('git:save-version')
  ipcMain.removeHandler('git:status')
}
