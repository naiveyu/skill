import { ipcMain, BrowserWindow, app, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import https from 'https'
import http from 'http'
import { logger } from '../utils/logger'

const SERVER_URL = 'https://sspprriinngg.cn'

function sendToRenderer(channel: string, data: any): void {
  const wins = BrowserWindow.getAllWindows()
  wins.forEach((w) => w.webContents.send(channel, data))
}

interface UpdateCheckResult {
  hasUpdate: boolean
  version?: string
  releaseNotes?: string
  fileSize?: number
  downloadUrl?: string
}

async function checkForUpdateFromServer(): Promise<UpdateCheckResult> {
  const currentVersion = app.getVersion()
  const platform = process.platform // 'darwin' | 'win32' | 'linux'

  const url = `${SERVER_URL}/api/updates/check?version=${currentVersion}&platform=${platform}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`Server returned ${res.status}`)
  return res.json()
}

function downloadFile(
  url: string,
  destPath: string,
  onProgress: (percent: number, bytesPerSecond: number, transferred: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    protocol.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Follow redirect
        const redirectUrl = res.headers.location
        if (redirectUrl) {
          downloadFile(redirectUrl, destPath, onProgress).then(resolve).catch(reject)
          return
        }
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Download failed: HTTP ${res.statusCode}`))
        return
      }

      const total = parseInt(res.headers['content-length'] || '0', 10)
      let transferred = 0
      let lastTime = Date.now()
      let lastTransferred = 0

      const file = fs.createWriteStream(destPath)
      res.on('data', (chunk: Buffer) => {
        transferred += chunk.length
        file.write(chunk)

        const now = Date.now()
        const elapsed = (now - lastTime) / 1000
        if (elapsed >= 0.5) {
          const bytesPerSecond = Math.round((transferred - lastTransferred) / elapsed)
          const percent = total > 0 ? Math.round((transferred / total) * 100) : 0
          onProgress(percent, bytesPerSecond, transferred, total)
          lastTime = now
          lastTransferred = transferred
        }
      })

      res.on('end', () => {
        file.end()
        onProgress(100, 0, transferred, total)
        resolve()
      })

      res.on('error', (err) => {
        file.close()
        try { fs.unlinkSync(destPath) } catch {}
        reject(err)
      })
    }).on('error', reject)
  })
}

export function registerUpdateHandlers(): void {
  let downloadedFilePath: string | null = null
  let latestUpdateInfo: UpdateCheckResult | null = null

  // Check for updates via server API
  ipcMain.handle('update:check', async () => {
    try {
      sendToRenderer('update:status', { status: 'checking' })

      const result = await checkForUpdateFromServer()
      latestUpdateInfo = result

      if (result.hasUpdate) {
        sendToRenderer('update:status', {
          status: 'available',
          version: result.version,
          releaseNotes: result.releaseNotes,
          fileSize: result.fileSize,
          downloadUrl: result.downloadUrl,
        })
      } else {
        sendToRenderer('update:status', { status: 'not-available' })
      }

      return result
    } catch (err: any) {
      logger.warn('Update check failed:', err?.message)
      sendToRenderer('update:status', { status: 'error', error: err?.message })
      return null
    }
  })

  // Download update file from CDN
  ipcMain.handle('update:download', async () => {
    if (!latestUpdateInfo?.downloadUrl) {
      sendToRenderer('update:status', { status: 'error', error: 'No update available' })
      return
    }

    try {
      const url = latestUpdateInfo.downloadUrl
      const filename = url.split('/').pop() || 'update-file'
      const destPath = path.join(app.getPath('downloads'), filename)

      sendToRenderer('update:status', {
        status: 'downloading',
        percent: 0,
        bytesPerSecond: 0,
        transferred: 0,
        total: latestUpdateInfo.fileSize || 0,
      })

      await downloadFile(url, destPath, (percent, bytesPerSecond, transferred, total) => {
        sendToRenderer('update:status', {
          status: 'downloading',
          percent,
          bytesPerSecond,
          transferred,
          total,
        })
      })

      downloadedFilePath = destPath
      sendToRenderer('update:status', { status: 'downloaded' })

      logger.info(`Update downloaded to: ${destPath}`)
    } catch (err: any) {
      logger.error('Update download failed:', err?.message)
      sendToRenderer('update:status', { status: 'error', error: err?.message })
    }
  })

  // Open downloaded file for manual install (since we can't auto-install without electron-updater signing)
  ipcMain.handle('update:install', () => {
    if (downloadedFilePath && fs.existsSync(downloadedFilePath)) {
      shell.openPath(downloadedFilePath)
      // Quit after a short delay to let the installer start
      setTimeout(() => app.quit(), 1000)
    }
  })

  logger.info('Update IPC handlers registered (server API mode)')
}
