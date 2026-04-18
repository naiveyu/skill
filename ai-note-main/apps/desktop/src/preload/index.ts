import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '@shared/types/ipc'

const electronAPI: ElectronAPI = {
  file: {
    readFile(filePath: string) {
      return ipcRenderer.invoke('file:read', filePath)
    },
    readBinaryFile(filePath: string) {
      return ipcRenderer.invoke('file:read-binary', filePath)
    },
    getAbsolutePath(relativePath: string) {
      return ipcRenderer.invoke('file:get-absolute-path', relativePath)
    },
    writeFile(filePath: string, content: string) {
      return ipcRenderer.invoke('file:write', filePath, content)
    },
    deleteFile(filePath: string) {
      return ipcRenderer.invoke('file:delete', filePath)
    },
    renameFile(oldPath: string, newPath: string) {
      return ipcRenderer.invoke('file:rename', oldPath, newPath)
    },
    createFile(dirPath: string, fileName: string) {
      return ipcRenderer.invoke('file:create', dirPath, fileName)
    },
    createFolder(parentPath: string, folderName: string) {
      return ipcRenderer.invoke('file:create-folder', parentPath, folderName)
    },
    getFileTree() {
      return ipcRenderer.invoke('file:get-tree')
    },
    openExternal(filePath: string) {
      return ipcRenderer.invoke('file:open-external', filePath)
    },
    pasteFromClipboard(targetDir: string) {
      return ipcRenderer.invoke('file:paste-from-clipboard', targetDir)
    },
    saveImageFromClipboard(targetDir: string) {
      return ipcRenderer.invoke('file:save-image-from-clipboard', targetDir)
    },
    saveDroppedImages(absolutePaths: string[], targetDir: string) {
      return ipcRenderer.invoke('file:save-dropped-images', absolutePaths, targetDir)
    },
    importExternalFiles(absolutePaths: string[], targetDir: string) {
      return ipcRenderer.invoke('file:import-external', absolutePaths, targetDir)
    },
    copyWithin(sourcePath: string, targetDir: string) {
      return ipcRenderer.invoke('file:copy-within', sourcePath, targetDir)
    },
    createDrawing(assetsDir: string) {
      return ipcRenderer.invoke('file:create-drawing', assetsDir)
    },
    readDrawing(relativePath: string) {
      return ipcRenderer.invoke('file:read-drawing', relativePath)
    },
    saveDrawing(relativePath: string, data: string) {
      return ipcRenderer.invoke('file:save-drawing', relativePath, data)
    },
    deleteDrawing(relativePath: string) {
      return ipcRenderer.invoke('file:delete-drawing', relativePath)
    },
    saveDrawingThumbnail(relativePath: string, svgString: string) {
      return ipcRenderer.invoke('file:save-drawing-thumbnail', relativePath, svgString)
    },
    onFileChange(callback) {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => {
        callback(data)
      }
      ipcRenderer.on('file:changed', handler)
      return () => {
        ipcRenderer.removeListener('file:changed', handler)
      }
    }
  },

  git: {
    getHistory(filePath: string, limit?: number) {
      return ipcRenderer.invoke('git:history', filePath, limit)
    },
    getDiff(sha1: string, sha2: string, filePath: string) {
      return ipcRenderer.invoke('git:diff', sha1, sha2, filePath)
    },
    getFileContent(sha: string, filePath: string) {
      return ipcRenderer.invoke('git:file-content', sha, filePath)
    },
    restoreFile(filePath: string, sha: string) {
      return ipcRenderer.invoke('git:restore', filePath, sha)
    },
    commit(message: string, files?: string[]) {
      return ipcRenderer.invoke('git:commit', message, files)
    },
    saveVersion(filePath: string, description: string) {
      return ipcRenderer.invoke('git:save-version', filePath, description)
    },
    getStatus() {
      return ipcRenderer.invoke('git:status')
    }
  },

  search: {
    query(query: string, options?: any) {
      return ipcRenderer.invoke('search:query', query, options)
    },
    rebuildIndex() {
      return ipcRenderer.invoke('search:rebuild')
    }
  },

  tag: {
    getAllTags() {
      return ipcRenderer.invoke('tag:get-all')
    },
    getNotesByTag(tagName: string) {
      return ipcRenderer.invoke('tag:get-notes', tagName)
    },
    updateNoteTags(filePath: string, tags: string[]) {
      return ipcRenderer.invoke('tag:update', filePath, tags)
    },
    renameTag(oldName: string, newName: string) {
      return ipcRenderer.invoke('tag:rename', oldName, newName)
    }
  },

  config: {
    get(key: string) {
      return ipcRenderer.invoke('config:get', key)
    },
    set(key: string, value: any) {
      return ipcRenderer.invoke('config:set', key, value)
    },
    getAll() {
      return ipcRenderer.invoke('config:get-all')
    }
  },

  workspace: {
    open(folderPath?: string) {
      return ipcRenderer.invoke('workspace:open', folderPath)
    },
    getRecent() {
      return ipcRenderer.invoke('workspace:get-recent')
    },
    getCurrent() {
      return ipcRenderer.invoke('workspace:get-current')
    }
  },

  auth: {
    register(data: any) {
      return ipcRenderer.invoke('auth:register', data)
    },
    login(credentials: any) {
      return ipcRenderer.invoke('auth:login', credentials)
    },
    validate() {
      return ipcRenderer.invoke('auth:validate')
    },
    getState() {
      return ipcRenderer.invoke('auth:get-state')
    },
    logout() {
      return ipcRenderer.invoke('auth:logout')
    },
    updateProfile(data: { username?: string; password?: string }) {
      return ipcRenderer.invoke('auth:update-profile', data)
    },
    getServerUrl() {
      return ipcRenderer.invoke('auth:get-server-url')
    },
    setServerUrl(url: string) {
      return ipcRenderer.invoke('auth:set-server-url', url)
    }
  },

  pdfMeta: {
    readMeta(relativePdfPath: string) {
      return ipcRenderer.invoke('pdf-meta:read', relativePdfPath)
    },
    writeMeta(relativePdfPath: string, meta: any) {
      return ipcRenderer.invoke('pdf-meta:write', relativePdfPath, meta)
    }
  },

  feedback: {
    submit(data: any) {
      return ipcRenderer.invoke('feedback:submit', data)
    }
  },

  publish: {
    getAuthStatus(platform: string) {
      return ipcRenderer.invoke('publish:get-auth-status', platform)
    },
    login(platform: string) {
      return ipcRenderer.invoke('publish:login', platform)
    },
    publish(options: any) {
      return ipcRenderer.invoke('publish:publish', options)
    },
    getHistory() {
      return ipcRenderer.invoke('publish:get-history')
    },
    cancel() {
      return ipcRenderer.invoke('publish:cancel')
    },
    onProgress(callback: (progress: any) => void) {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
      ipcRenderer.on('publish:progress', handler)
      return () => ipcRenderer.removeListener('publish:progress', handler)
    },
    onResult(callback: (result: any) => void) {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
      ipcRenderer.on('publish:result', handler)
      return () => ipcRenderer.removeListener('publish:result', handler)
    }
  },

  ai: {
    saveToken(token: string) {
      return ipcRenderer.invoke('ai:save-token', token)
    },
    getTokenStatus() {
      return ipcRenderer.invoke('ai:get-token-status')
    },
    send(prompt: string) {
      return ipcRenderer.invoke('ai:send', prompt)
    },
    cancel() {
      return ipcRenderer.invoke('ai:cancel')
    },
    onStreamChunk(callback: (data: { content: string }) => void) {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
      ipcRenderer.on('ai:stream-chunk', handler)
      return () => ipcRenderer.removeListener('ai:stream-chunk', handler)
    },
    onStreamEnd(callback: () => void) {
      const handler = () => callback()
      ipcRenderer.on('ai:stream-end', handler)
      return () => ipcRenderer.removeListener('ai:stream-end', handler)
    },
    onStreamError(callback: (error: { message: string }) => void) {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
      ipcRenderer.on('ai:stream-error', handler)
      return () => ipcRenderer.removeListener('ai:stream-error', handler)
    }
  },

  update: {
    check() {
      return ipcRenderer.invoke('update:check')
    },
    download() {
      return ipcRenderer.invoke('update:download')
    },
    install() {
      return ipcRenderer.invoke('update:install')
    },
    onStatus(callback: (data: any) => void) {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
      ipcRenderer.on('update:status', handler)
      return () => ipcRenderer.removeListener('update:status', handler)
    }
  },

  sync: {
    start() {
      return ipcRenderer.invoke('sync:start')
    },
    stop() {
      return ipcRenderer.invoke('sync:stop')
    },
    getStatus() {
      return ipcRenderer.invoke('sync:get-status')
    },
    generatePairing() {
      return ipcRenderer.invoke('sync:generate-pairing')
    },
    revokeDevice(deviceId: string) {
      return ipcRenderer.invoke('sync:revoke-device', deviceId)
    },
    getPairedDevices() {
      return ipcRenderer.invoke('sync:get-paired-devices')
    },
    triggerSync(deviceId?: string) {
      return ipcRenderer.invoke('sync:trigger', deviceId)
    },
    resolveConflict(filePath: string, resolution: 'local' | 'remote' | 'both') {
      return ipcRenderer.invoke('sync:resolve-conflict', filePath, resolution)
    },
    getConfig() {
      return ipcRenderer.invoke('sync:get-config')
    },
    setConfig(key: string, value: any) {
      return ipcRenderer.invoke('sync:set-config', key, value)
    },
    onStatusChanged(callback: (status: any) => void) {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
      ipcRenderer.on('sync:status-changed', handler)
      return () => ipcRenderer.removeListener('sync:status-changed', handler)
    },
    onDeviceConnected(callback: (device: any) => void) {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
      ipcRenderer.on('sync:device-connected', handler)
      return () => ipcRenderer.removeListener('sync:device-connected', handler)
    },
    onDeviceDisconnected(callback: (deviceId: string) => void) {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
      ipcRenderer.on('sync:device-disconnected', handler)
      return () => ipcRenderer.removeListener('sync:device-disconnected', handler)
    },
    onProgress(callback: (progress: any) => void) {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
      ipcRenderer.on('sync:progress', handler)
      return () => ipcRenderer.removeListener('sync:progress', handler)
    },
    onConflict(callback: (conflicts: any[]) => void) {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
      ipcRenderer.on('sync:conflict', handler)
      return () => ipcRenderer.removeListener('sync:conflict', handler)
    }
  },

  video: {
    checkFfmpeg() {
      return ipcRenderer.invoke('video:check-ffmpeg')
    },
    trim(inputPath: string, startSec: number, endSec: number, outputPath: string) {
      return ipcRenderer.invoke('video:trim', inputPath, startSec, endSec, outputPath)
    },
    onTrimProgress(cb: (percent: number) => void) {
      const handler = (_event: Electron.IpcRendererEvent, data: number) => cb(data)
      ipcRenderer.on('video:trim-progress', handler)
      return () => ipcRenderer.removeListener('video:trim-progress', handler)
    },
    onTrimComplete(cb: (outputPath: string) => void) {
      const handler = (_event: Electron.IpcRendererEvent, data: string) => cb(data)
      ipcRenderer.on('video:trim-complete', handler)
      return () => ipcRenderer.removeListener('video:trim-complete', handler)
    },
    onTrimError(cb: (message: string) => void) {
      const handler = (_event: Electron.IpcRendererEvent, data: string) => cb(data)
      ipcRenderer.on('video:trim-error', handler)
      return () => ipcRenderer.removeListener('video:trim-error', handler)
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
