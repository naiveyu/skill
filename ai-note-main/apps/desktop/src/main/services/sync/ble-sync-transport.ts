import { gzip, gunzip } from 'zlib'
import { promisify } from 'util'
import type {
  SyncTransportType,
  SyncDevice,
  SyncStatus,
  NoteManifest,
  FileChangeEvent
} from '@ai-note/shared-types'
import {
  APP_NAME,
  BLE_SERVICE_UUID,
  BLE_DEVICE_INFO_UUID,
  BLE_SYNC_CONTROL_UUID,
  BLE_SYNC_DATA_UUID,
  BLE_PREFERRED_MTU,
  BLE_COMPRESS_THRESHOLD
} from '@shared/constants'
import type { SyncTransport, SyncService } from './sync-service'
import { logger } from '../../utils/logger'

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)

// Chunk packet types (first byte)
const PACKET_START = 0x01
const PACKET_DATA = 0x02
const PACKET_END = 0x03

// Control message types
type ControlCommand =
  | { type: 'auth'; token: string }
  | { type: 'request-manifest' }
  | { type: 'request-file'; path: string }
  | { type: 'send-file-start'; path: string; size: number; compressed: boolean }
  | { type: 'send-file-end'; path: string }
  | { type: 'delete-file'; path: string }
  | { type: 'sync-complete' }

type ControlResponse =
  | { type: 'auth-ok'; deviceId: string }
  | { type: 'auth-fail' }
  | { type: 'manifest-ready'; chunks: number }
  | { type: 'file-ready'; path: string; chunks: number; compressed: boolean }
  | { type: 'ack' }
  | { type: 'error'; message: string }

// Per-connection state
interface BleConnection {
  authenticated: boolean
  deviceId: string | null
  deviceName: string | null
  mtu: number
  receiveBuffer: Buffer[]
  expectedChunks: number
  receivedChunks: number
  currentTransfer: string | null // 'manifest' | file path
}

/**
 * BLE Sync Transport using @abandonware/bleno.
 *
 * The desktop acts as a BLE Peripheral. The mobile app (Central) discovers
 * this service, connects, authenticates, and exchanges sync data.
 *
 * GATT Service layout:
 * - DEVICE_INFO (Read): JSON device metadata
 * - SYNC_CONTROL (Write + Notify): Command/response channel
 * - SYNC_DATA (Write + Notify): Chunked data transfer (manifest & files)
 *
 * Data > BLE_COMPRESS_THRESHOLD is gzip-compressed before chunking.
 */
export class BleSyncTransport implements SyncTransport {
  readonly type: SyncTransportType = 'ble'
  private syncService: SyncService
  private running = false
  private bleno: any = null
  private connection: BleConnection | null = null

  // Characteristic update callbacks (set by bleno on subscribe)
  private controlNotify: ((data: Buffer) => void) | null = null
  private dataNotify: ((data: Buffer) => void) | null = null

  constructor(syncService: SyncService) {
    this.syncService = syncService
  }

  async start(): Promise<void> {
    if (this.running) return

    // Dynamic import — bleno is an optional native dependency
    try {
      this.bleno = await this.loadBleno()
    } catch (err) {
      logger.error('BLE transport unavailable: bleno module not found.', err)
      throw new Error(
        'BLE transport requires @abandonware/bleno. ' +
        'Install it with: pnpm --filter @ai-note/desktop add @abandonware/bleno && pnpm rebuild'
      )
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('BLE initialization timeout — Bluetooth may be off'))
      }, 15000)

      this.bleno.on('stateChange', (state: string) => {
        logger.info(`BLE adapter state: ${state}`)
        if (state === 'poweredOn') {
          clearTimeout(timeout)
          this.startAdvertising()
            .then(() => {
              this.running = true
              logger.info('BLE sync transport started')
              resolve()
            })
            .catch(reject)
        } else if (state === 'poweredOff') {
          if (this.running) {
            this.running = false
            logger.warn('Bluetooth adapter powered off')
          }
        }
      })
    })
  }

  async stop(): Promise<void> {
    if (!this.running || !this.bleno) return

    this.bleno.stopAdvertising()
    this.bleno.disconnect()
    this.bleno.removeAllListeners()

    if (this.connection?.deviceId) {
      this.syncService.removeConnectedDevice(this.connection.deviceId)
    }
    this.connection = null
    this.controlNotify = null
    this.dataNotify = null
    this.running = false

    logger.info('BLE sync transport stopped')
  }

  isRunning(): boolean {
    return this.running
  }

  // ---- Bleno loading ----

  private async loadBleno(): Promise<any> {
    // bleno is a CommonJS native module; use dynamic require
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@abandonware/bleno')
    return mod
  }

  // ---- Advertising ----

  private async startAdvertising(): Promise<void> {
    const service = this.createGattService()

    return new Promise<void>((resolve, reject) => {
      const deviceId = this.syncService.getDeviceId()
      const advName = `${APP_NAME}-${deviceId.slice(0, 8)}`

      this.bleno.startAdvertising(advName, [BLE_SERVICE_UUID], (err?: Error) => {
        if (err) {
          reject(err)
          return
        }

        this.bleno.setServices([service], (err2?: Error) => {
          if (err2) {
            reject(err2)
            return
          }
          logger.info(`BLE advertising as "${advName}"`)
          resolve()
        })
      })

      this.bleno.on('accept', (clientAddress: string) => {
        logger.info(`BLE client connected: ${clientAddress}`)
        this.connection = {
          authenticated: false,
          deviceId: null,
          deviceName: null,
          mtu: BLE_PREFERRED_MTU,
          receiveBuffer: [],
          expectedChunks: 0,
          receivedChunks: 0,
          currentTransfer: null
        }
      })

      this.bleno.on('disconnect', (clientAddress: string) => {
        logger.info(`BLE client disconnected: ${clientAddress}`)
        if (this.connection?.deviceId) {
          this.syncService.removeConnectedDevice(this.connection.deviceId)
        }
        this.connection = null
        this.controlNotify = null
        this.dataNotify = null
      })

      this.bleno.on('mtuChange', (mtu: number) => {
        if (this.connection) {
          this.connection.mtu = mtu
          logger.info(`BLE MTU negotiated: ${mtu}`)
        }
      })
    })
  }

  // ---- GATT Service ----

  private createGattService(): any {
    const Bleno = this.bleno
    const PrimaryService = Bleno.PrimaryService
    const Characteristic = Bleno.Characteristic

    const deviceInfoChar = this.createDeviceInfoCharacteristic(Characteristic)
    const controlChar = this.createControlCharacteristic(Characteristic)
    const dataChar = this.createDataCharacteristic(Characteristic)

    return new PrimaryService({
      uuid: BLE_SERVICE_UUID,
      characteristics: [deviceInfoChar, controlChar, dataChar]
    })
  }

  // ---- Device Info Characteristic (Read) ----

  private createDeviceInfoCharacteristic(Characteristic: any): any {
    const self = this
    return new Characteristic({
      uuid: BLE_DEVICE_INFO_UUID,
      properties: ['read'],
      onReadRequest(offset: number, callback: (result: number, data?: Buffer) => void) {
        const info = JSON.stringify({
          deviceId: self.syncService.getDeviceId(),
          deviceName: APP_NAME,
          appVersion: '0.1.0',
          syncEnabled: true,
          requiresPairing: true
        })
        const data = Buffer.from(info, 'utf-8')
        callback(Characteristic.RESULT_SUCCESS, data.subarray(offset))
      }
    })
  }

  // ---- Control Characteristic (Write + Notify) ----

  private createControlCharacteristic(Characteristic: any): any {
    const self = this
    return new Characteristic({
      uuid: BLE_SYNC_CONTROL_UUID,
      properties: ['write', 'notify'],
      onWriteRequest(
        data: Buffer,
        offset: number,
        withoutResponse: boolean,
        callback: (result: number) => void
      ) {
        self.handleControlWrite(data, Characteristic)
        callback(Characteristic.RESULT_SUCCESS)
      },
      onSubscribe(maxValueSize: number, updateValueCallback: (data: Buffer) => void) {
        self.controlNotify = updateValueCallback
        logger.info('BLE control channel subscribed')
      },
      onUnsubscribe() {
        self.controlNotify = null
        logger.info('BLE control channel unsubscribed')
      }
    })
  }

  // ---- Data Characteristic (Write + Notify) ----

  private createDataCharacteristic(Characteristic: any): any {
    const self = this
    return new Characteristic({
      uuid: BLE_SYNC_DATA_UUID,
      properties: ['write', 'notify'],
      onWriteRequest(
        data: Buffer,
        offset: number,
        withoutResponse: boolean,
        callback: (result: number) => void
      ) {
        self.handleDataWrite(data)
        callback(Characteristic.RESULT_SUCCESS)
      },
      onSubscribe(maxValueSize: number, updateValueCallback: (data: Buffer) => void) {
        self.dataNotify = updateValueCallback
        logger.info('BLE data channel subscribed')
      },
      onUnsubscribe() {
        self.dataNotify = null
        logger.info('BLE data channel unsubscribed')
      }
    })
  }

  // ---- Control Message Handling ----

  private async handleControlWrite(data: Buffer, Characteristic: any): Promise<void> {
    try {
      const msg: ControlCommand = JSON.parse(data.toString('utf-8'))

      if (!this.connection) {
        this.sendControlResponse({ type: 'error', message: 'No connection' })
        return
      }

      // Auth must be first message
      if (!this.connection.authenticated && msg.type !== 'auth') {
        this.sendControlResponse({ type: 'error', message: 'Not authenticated' })
        return
      }

      switch (msg.type) {
        case 'auth':
          await this.handleAuth(msg.token)
          break
        case 'request-manifest':
          await this.handleRequestManifest()
          break
        case 'request-file':
          await this.handleRequestFile(msg.path)
          break
        case 'send-file-start':
          this.handleSendFileStart(msg.path, msg.size, msg.compressed)
          break
        case 'send-file-end':
          await this.handleSendFileEnd(msg.path)
          break
        case 'delete-file':
          await this.handleDeleteFile(msg.path)
          break
        case 'sync-complete':
          this.syncService.setStatus('idle')
          this.sendControlResponse({ type: 'ack' })
          break
      }
    } catch (err) {
      logger.error('BLE control message error:', err)
      this.sendControlResponse({ type: 'error', message: 'Invalid control message' })
    }
  }

  private async handleAuth(token: string): Promise<void> {
    if (!this.connection) return

    const authToken = this.syncService.validateToken(token)
    if (authToken) {
      this.connection.authenticated = true
      this.connection.deviceId = authToken.deviceId
      this.connection.deviceName = authToken.deviceName

      // Register device
      const device: SyncDevice = {
        id: authToken.deviceId,
        name: authToken.deviceName,
        type: 'mobile',
        transport: 'ble',
        lastSeen: Date.now(),
        isPaired: true,
        isConnected: true
      }
      this.syncService.addConnectedDevice(device)

      this.sendControlResponse({ type: 'auth-ok', deviceId: this.syncService.getDeviceId() })
      logger.info(`BLE device authenticated: ${authToken.deviceName}`)
    } else {
      this.sendControlResponse({ type: 'auth-fail' })
      logger.warn('BLE auth failed: invalid token')
    }
  }

  private async handleRequestManifest(): Promise<void> {
    try {
      const manifest = await this.syncService.buildManifest()
      const payload = JSON.stringify(manifest)
      const { buffer, compressed } = await this.maybeCompress(Buffer.from(payload, 'utf-8'))
      const chunks = this.chunkBuffer(buffer)

      this.sendControlResponse({
        type: 'manifest-ready',
        chunks: chunks.length
      })

      // Send chunks via data channel
      await this.sendChunks(chunks)
    } catch (err) {
      logger.error('BLE manifest request error:', err)
      this.sendControlResponse({ type: 'error', message: 'Failed to build manifest' })
    }
  }

  private async handleRequestFile(filePath: string): Promise<void> {
    try {
      const content = await this.syncService.getNoteContent(filePath)
      const payload = Buffer.from(content, 'utf-8')
      const { buffer, compressed } = await this.maybeCompress(payload)
      const chunks = this.chunkBuffer(buffer)

      this.sendControlResponse({
        type: 'file-ready',
        path: filePath,
        chunks: chunks.length,
        compressed
      })

      await this.sendChunks(chunks)
    } catch (err) {
      logger.error(`BLE file request error (${filePath}):`, err)
      this.sendControlResponse({ type: 'error', message: 'File not found' })
    }
  }

  private handleSendFileStart(filePath: string, size: number, compressed: boolean): void {
    if (!this.connection) return
    this.connection.receiveBuffer = []
    this.connection.expectedChunks = 0 // Will be determined by chunk packets
    this.connection.receivedChunks = 0
    this.connection.currentTransfer = filePath
    this.sendControlResponse({ type: 'ack' })
  }

  private async handleSendFileEnd(filePath: string): Promise<void> {
    if (!this.connection) return

    try {
      const assembled = Buffer.concat(this.connection.receiveBuffer)
      // Try to decompress; if it fails, assume uncompressed
      let content: string
      try {
        const decompressed = await gunzipAsync(assembled)
        content = decompressed.toString('utf-8')
      } catch {
        content = assembled.toString('utf-8')
      }

      await this.syncService.applyRemoteNote(filePath, content)
      this.sendControlResponse({ type: 'ack' })
      logger.info(`BLE received file: ${filePath}`)
    } catch (err) {
      logger.error(`BLE file receive error (${filePath}):`, err)
      this.sendControlResponse({ type: 'error', message: 'Failed to apply file' })
    } finally {
      this.connection.receiveBuffer = []
      this.connection.currentTransfer = null
    }
  }

  private async handleDeleteFile(filePath: string): Promise<void> {
    try {
      await this.syncService.deleteNote(filePath)
      this.sendControlResponse({ type: 'ack' })
    } catch {
      this.sendControlResponse({ type: 'error', message: 'File not found' })
    }
  }

  // ---- Data Channel Handling ----

  private handleDataWrite(data: Buffer): void {
    if (!this.connection || !this.connection.authenticated) return

    if (data.length < 1) return

    const packetType = data[0]

    switch (packetType) {
      case PACKET_START: {
        // Reset receive buffer for new transfer
        this.connection.receiveBuffer = []
        this.connection.receivedChunks = 0
        // Bytes 1-4: total chunks (uint32 BE)
        if (data.length >= 5) {
          this.connection.expectedChunks = data.readUInt32BE(1)
        }
        break
      }

      case PACKET_DATA: {
        // Bytes 1+: raw chunk data
        const chunkData = data.subarray(1)
        this.connection.receiveBuffer.push(Buffer.from(chunkData))
        this.connection.receivedChunks++
        break
      }

      case PACKET_END: {
        // Transfer complete — data is assembled by control handler (send-file-end)
        logger.info(
          `BLE data transfer complete: ${this.connection.receivedChunks}/${this.connection.expectedChunks} chunks`
        )
        break
      }
    }
  }

  // ---- Sending ----

  private sendControlResponse(response: ControlResponse): void {
    if (!this.controlNotify) return
    const data = Buffer.from(JSON.stringify(response), 'utf-8')
    this.controlNotify(data)
  }

  private async sendChunks(chunks: Buffer[]): Promise<void> {
    if (!this.dataNotify) return

    // Send START packet
    const startPacket = Buffer.alloc(5)
    startPacket[0] = PACKET_START
    startPacket.writeUInt32BE(chunks.length, 1)
    this.dataNotify(startPacket)

    // Small delay between packets to avoid BLE congestion
    for (const chunk of chunks) {
      const dataPacket = Buffer.alloc(1 + chunk.length)
      dataPacket[0] = PACKET_DATA
      chunk.copy(dataPacket, 1)
      this.dataNotify(dataPacket)

      // Yield to event loop between chunks
      await new Promise<void>((resolve) => setImmediate(resolve))
    }

    // Send END packet
    const endPacket = Buffer.alloc(1)
    endPacket[0] = PACKET_END
    this.dataNotify(endPacket)
  }

  // ---- Compression & Chunking ----

  private async maybeCompress(
    data: Buffer
  ): Promise<{ buffer: Buffer; compressed: boolean }> {
    if (data.length > BLE_COMPRESS_THRESHOLD) {
      const compressed = await gzipAsync(data)
      // Only use compressed version if it's actually smaller
      if (compressed.length < data.length) {
        return { buffer: compressed, compressed: true }
      }
    }
    return { buffer: data, compressed: false }
  }

  private chunkBuffer(data: Buffer): Buffer[] {
    const mtu = this.connection?.mtu || BLE_PREFERRED_MTU
    // Reserve 1 byte for packet type header
    const chunkSize = mtu - 1
    const chunks: Buffer[] = []

    for (let offset = 0; offset < data.length; offset += chunkSize) {
      chunks.push(data.subarray(offset, offset + chunkSize))
    }

    return chunks
  }

  // ---- Broadcast (file change notifications) ----

  broadcastFileChange(event: FileChangeEvent): void {
    if (!this.connection?.authenticated || !this.controlNotify) return

    const msg = JSON.stringify({
      type: 'file-changed',
      data: event
    })
    this.controlNotify(Buffer.from(msg, 'utf-8'))
  }

  broadcastSyncStatus(status: SyncStatus): void {
    if (!this.connection?.authenticated || !this.controlNotify) return

    const msg = JSON.stringify({
      type: 'sync-status',
      data: { status }
    })
    this.controlNotify(Buffer.from(msg, 'utf-8'))
  }
}
