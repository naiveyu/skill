import { ipcMain, BrowserWindow } from 'electron'
import { VideoService, buildOutputPath } from '../services/video-service'
import { logger } from '../utils/logger'

const videoService = new VideoService()

export function registerVideoHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('video:check-ffmpeg', async () => {
    return videoService.checkFfmpegAvailable()
  })

  ipcMain.handle(
    'video:trim',
    async (_event, inputPath: string, startSec: number, endSec: number, outputPath?: string) => {
      const out = outputPath || buildOutputPath(inputPath, startSec, endSec)

      await videoService.trim(
        inputPath,
        startSec,
        endSec,
        out,
        (percent) => mainWindow.webContents.send('video:trim-progress', percent),
        (outPath) => mainWindow.webContents.send('video:trim-complete', outPath),
        (message) => mainWindow.webContents.send('video:trim-error', message)
      )
    }
  )

  logger.info('Video IPC handlers registered')
}

export function unregisterVideoHandlers(): void {
  ipcMain.removeHandler('video:check-ffmpeg')
  ipcMain.removeHandler('video:trim')
}
