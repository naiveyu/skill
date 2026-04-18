import { EventEmitter } from 'events'
import path from 'path'
import fs from 'fs/promises'
import { randomUUID } from 'crypto'
import type {
  SyncTransportType,
  SyncStatus,
  SyncDevice,
  SyncConfig,
  PairingInfo,
  AuthToken,
  NoteManifest,
  SyncDelta,
  SyncConflict,
  SyncResult,
  SyncProgress
} from '@ai-note/shared-types'
import { CONFIG_DIR, SYNC_CONFLICTS_DIR } from '@shared/constants'
import { FileService } from '../file-service'
import { GitService } from '../git-service'
import { ConfigService } from '../config-service'
import { buildManifest, computeDelta, computeContentHash } from './sync-protocol'
import {
  createPairingInfo,
  validatePIN,
  createAuthToken,
  validateToken
} from './sync-auth'
import { logger } from '../../utils/logger'

export interface SyncTransport {
  readonly type: SyncTransportType
  start(): Promise<void>
  stop(): Promise<void>
  isRunning(): boolean
}

export class SyncService extends EventEmitter {
  private workspacePath: string
  private fileService: FileService
  private gitService: GitService
  private configService: ConfigService
  private transports: Map<SyncTransportType, SyncTransport> = new Map()
  private syncStatus: SyncStatus = 'idle'
  private connectedDevices: Map<string, SyncDevice> = new Map()
  private currentPairing: PairingInfo | null = null
  private currentPairingPin: string | null = null
  private deviceId: string
  private syncConfig: SyncConfig | null = null

  constructor(
    workspacePath: string,
    fileService: FileService,
    gitService: GitService,
    configService: ConfigService
  ) {
    super()
    this.workspacePath = workspacePath
    this.fileService = fileService
    this.gitService = gitService
    this.configService = configService
    this.deviceId = randomUUID()
  }

  // ---- Lifecycle ----

  async initialize(): Promise<void> {
    this.syncConfig = this.configService.get('sync') as SyncConfig
    if (!this.syncConfig) {
      logger.info('No sync config found, sync disabled')
      return
    }

    // Ensure sync-conflicts dir exists
    const conflictsDir = path.join(this.workspacePath, CONFIG_DIR, SYNC_CONFLICTS_DIR)
    await fs.mkdir(conflictsDir, { recursive: true })

    if (this.syncConfig.enabled) {
      await this.startSync()
    }

    logger.info('SyncService initialized')
  }

  async startSync(): Promise<void> {
    for (const [type, transport] of this.transports) {
      if (!transport.isRunning()) {
        try {
          await transport.start()
          logger.info(`${type} transport started`)
        } catch (err) {
          logger.error(`Failed to start ${type} transport:`, err)
        }
      }
    }
    this.setStatus('idle')
  }

  async stopSync(): Promise<void> {
    for (const [type, transport] of this.transports) {
      if (transport.isRunning()) {
        try {
          await transport.stop()
          logger.info(`${type} transport stopped`)
        } catch (err) {
          logger.error(`Failed to stop ${type} transport:`, err)
        }
      }
    }
    this.connectedDevices.clear()
    this.setStatus('idle')
  }

  async dispose(): Promise<void> {
    await this.stopSync()
    this.removeAllListeners()
    logger.info('SyncService disposed')
  }

  // ---- Transport Management ----

  registerTransport(transport: SyncTransport): void {
    this.transports.set(transport.type, transport)
  }

  getTransport(type: SyncTransportType): SyncTransport | undefined {
    return this.transports.get(type)
  }

  // ---- Pairing ----

  generatePairing(ip: string, port: number, serviceName: string): PairingInfo {
    const pairing = createPairingInfo(this.deviceId, ip, port, serviceName)
    this.currentPairing = pairing
    this.currentPairingPin = pairing.pin
    return pairing
  }

  validatePairing(
    deviceId: string,
    pin: string,
    deviceName: string
  ): AuthToken | null {
    if (!this.currentPairing || !this.currentPairingPin) {
      return null
    }

    if (!validatePIN(pin, this.currentPairingPin, this.currentPairing.expiresAt)) {
      return null
    }

    // Pairing successful, create token
    const token = createAuthToken(deviceId, deviceName)

    // Save to config
    const config = this.getSyncConfig()
    config.pairedDevices.push(token)
    this.configService.set('sync.pairedDevices', config.pairedDevices)

    // Clear pairing state
    this.currentPairing = null
    this.currentPairingPin = null

    logger.info(`Device paired: ${deviceName} (${deviceId})`)
    return token
  }

  revokePairing(deviceId: string): void {
    const config = this.getSyncConfig()
    config.pairedDevices = config.pairedDevices.filter(
      (t) => t.deviceId !== deviceId
    )
    this.configService.set('sync.pairedDevices', config.pairedDevices)

    // Disconnect if connected
    this.connectedDevices.delete(deviceId)
    this.emit('device-disconnected', deviceId)

    logger.info(`Device revoked: ${deviceId}`)
  }

  getPairedDevices(): AuthToken[] {
    return this.getSyncConfig().pairedDevices
  }

  // ---- Auth ----

  validateToken(token: string): AuthToken | null {
    const config = this.getSyncConfig()
    return validateToken(token, config.pairedDevices)
  }

  // ---- Device Management ----

  addConnectedDevice(device: SyncDevice): void {
    this.connectedDevices.set(device.id, device)
    this.emit('device-connected', device)
  }

  removeConnectedDevice(deviceId: string): void {
    this.connectedDevices.delete(deviceId)
    this.emit('device-disconnected', deviceId)
  }

  getConnectedDevices(): SyncDevice[] {
    return Array.from(this.connectedDevices.values())
  }

  // ---- Sync Protocol ----

  async buildManifest(): Promise<NoteManifest> {
    return buildManifest(this.workspacePath)
  }

  computeDelta(localManifest: NoteManifest, remoteManifest: NoteManifest): SyncDelta {
    return computeDelta(localManifest, remoteManifest)
  }

  async getNoteContent(relativePath: string): Promise<string> {
    return this.fileService.readFile(relativePath)
  }

  async applyRemoteNote(
    relativePath: string,
    content: string
  ): Promise<void> {
    await this.fileService.writeFile(relativePath, content)
    logger.info(`Applied remote note: ${relativePath}`)
  }

  async deleteNote(relativePath: string): Promise<void> {
    await this.fileService.deleteFile(relativePath)
    logger.info(`Deleted note via sync: ${relativePath}`)
  }

  // ---- Conflict Resolution ----

  async resolveConflict(
    conflict: SyncConflict,
    strategy: 'local' | 'remote' | 'both',
    remoteContent?: string
  ): Promise<void> {
    const config = this.getSyncConfig()
    const effectiveStrategy = strategy || config.conflictStrategy

    switch (effectiveStrategy) {
      case 'local':
        // Keep local, backup remote if content provided
        if (remoteContent) {
          await this.backupConflictFile(conflict.path, remoteContent, 'remote')
        }
        break

      case 'remote':
        if (remoteContent) {
          // Backup local first
          try {
            const localContent = await this.fileService.readFile(conflict.path)
            await this.backupConflictFile(conflict.path, localContent, 'local')
          } catch {
            // Local file might not exist
          }
          // Apply remote
          await this.applyRemoteNote(conflict.path, remoteContent)
        }
        break

      case 'both': {
        // Keep both - save remote as .conflict.md
        if (remoteContent) {
          const ext = path.extname(conflict.path)
          const base = conflict.path.slice(0, -ext.length)
          const conflictPath = `${base}.conflict${ext}`
          await this.applyRemoteNote(conflictPath, remoteContent)
        }
        break
      }
    }
  }

  private async backupConflictFile(
    relativePath: string,
    content: string,
    source: string
  ): Promise<string> {
    const conflictsDir = path.join(
      this.workspacePath,
      CONFIG_DIR,
      SYNC_CONFLICTS_DIR
    )
    const timestamp = Date.now()
    const fileName = `${timestamp}_${source}_${path.basename(relativePath)}`
    const backupPath = path.join(conflictsDir, fileName)

    await fs.writeFile(backupPath, content, 'utf-8')
    logger.info(`Conflict backup: ${backupPath}`)
    return backupPath
  }

  // ---- Status ----

  getStatus(): SyncStatus {
    return this.syncStatus
  }

  setStatus(status: SyncStatus): void {
    if (this.syncStatus !== status) {
      this.syncStatus = status
      this.emit('status-changed', status)
    }
  }

  emitProgress(progress: SyncProgress): void {
    this.emit('sync-progress', progress)
  }

  emitSyncComplete(result: SyncResult): void {
    this.emit('sync-complete', result)
  }

  getSyncConfig(): SyncConfig {
    return (this.configService.get('sync') as SyncConfig) || {
      enabled: false,
      lanPort: 18923,
      lanEnabled: true,
      bleEnabled: false,
      conflictStrategy: 'last-write-wins' as const,
      autoSync: false,
      pairedDevices: []
    }
  }

  getDeviceId(): string {
    return this.deviceId
  }

  getWorkspacePath(): string {
    return this.workspacePath
  }
}
