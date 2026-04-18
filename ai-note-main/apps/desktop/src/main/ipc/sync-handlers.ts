import { ipcMain, BrowserWindow } from 'electron'
import { SyncService } from '../services/sync/sync-service'
import { LanSyncTransport } from '../services/sync/lan-sync-transport'
import { SYNC_SERVICE_NAME } from '@shared/constants'
import { logger } from '../utils/logger'

export function registerSyncHandlers(
  syncService: SyncService,
  mainWindow: BrowserWindow
): void {
  ipcMain.handle('sync:start', async () => {
    await syncService.startSync()
  })

  ipcMain.handle('sync:stop', async () => {
    await syncService.stopSync()
  })

  ipcMain.handle('sync:get-status', async () => {
    return {
      status: syncService.getStatus(),
      devices: syncService.getConnectedDevices()
    }
  })

  ipcMain.handle('sync:generate-pairing', async () => {
    const lanTransport = syncService.getTransport('lan') as LanSyncTransport | undefined
    const ip = lanTransport?.getLocalIP() || '127.0.0.1'
    const port = lanTransport?.getPort() || 18923
    return syncService.generatePairing(ip, port, SYNC_SERVICE_NAME)
  })

  ipcMain.handle('sync:revoke-device', async (_event, deviceId: string) => {
    syncService.revokePairing(deviceId)
  })

  ipcMain.handle('sync:get-paired-devices', async () => {
    return syncService.getPairedDevices()
  })

  ipcMain.handle('sync:trigger', async () => {
    syncService.setStatus('syncing')
    // Actual sync is initiated by the mobile side via REST/WS
  })

  ipcMain.handle(
    'sync:resolve-conflict',
    async (_event, filePath: string, resolution: 'local' | 'remote' | 'both') => {
      await syncService.resolveConflict(
        { path: filePath, localEntry: {} as any, remoteEntry: {} as any },
        resolution
      )
    }
  )

  ipcMain.handle('sync:get-config', async () => {
    return syncService.getSyncConfig()
  })

  ipcMain.handle('sync:set-config', async (_event, key: string, value: any) => {
    const configService = (syncService as any).configService
    await configService.set(`sync.${key}`, value)
  })

  // Forward SyncService events to renderer
  const forwardEvent = (channel: string) => {
    return (data: any) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, data)
      }
    }
  }

  syncService.on('status-changed', forwardEvent('sync:status-changed'))
  syncService.on('device-connected', forwardEvent('sync:device-connected'))
  syncService.on('device-disconnected', forwardEvent('sync:device-disconnected'))
  syncService.on('sync-progress', forwardEvent('sync:progress'))
  syncService.on('conflict-detected', forwardEvent('sync:conflict'))

  logger.info('Sync IPC handlers registered')
}

export function unregisterSyncHandlers(): void {
  ipcMain.removeHandler('sync:start')
  ipcMain.removeHandler('sync:stop')
  ipcMain.removeHandler('sync:get-status')
  ipcMain.removeHandler('sync:generate-pairing')
  ipcMain.removeHandler('sync:revoke-device')
  ipcMain.removeHandler('sync:get-paired-devices')
  ipcMain.removeHandler('sync:trigger')
  ipcMain.removeHandler('sync:resolve-conflict')
  ipcMain.removeHandler('sync:get-config')
  ipcMain.removeHandler('sync:set-config')
  logger.info('Sync IPC handlers unregistered')
}
