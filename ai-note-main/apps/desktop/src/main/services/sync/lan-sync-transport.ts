import path from 'path'
import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fastifyWebsocket from '@fastify/websocket'
import fastifyCors from '@fastify/cors'
import { Bonjour, Service } from 'bonjour-service'
import { WebSocket } from 'ws'
import { networkInterfaces } from 'os'
import type {
  SyncTransportType,
  SyncDevice,
  SyncStatus,
  NoteManifest,
  FileChangeEvent
} from '@ai-note/shared-types'
import { APP_NAME, SYNC_SERVICE_NAME } from '@shared/constants'
import type { SyncTransport, SyncService } from './sync-service'
import { logger } from '../../utils/logger'

interface AuthenticatedRequest extends FastifyRequest {
  deviceId?: string
  deviceName?: string
}

export class LanSyncTransport implements SyncTransport {
  readonly type: SyncTransportType = 'lan'
  private server: FastifyInstance | null = null
  private bonjour: Bonjour | null = null
  private bonjourService: Service | null = null
  private syncService: SyncService
  private port: number
  private running = false
  private authenticatedSockets: Map<string, WebSocket> = new Map()

  constructor(syncService: SyncService, port: number) {
    this.syncService = syncService
    this.port = port
  }

  async start(): Promise<void> {
    if (this.running) return

    this.server = Fastify({ logger: false })

    await this.server.register(fastifyCors, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    })

    await this.server.register(fastifyWebsocket)

    this.setupRoutes()
    this.setupWebSocket()

    // Try the configured port, fallback to port+1..+10
    let listenPort = this.port
    for (let i = 0; i <= 10; i++) {
      try {
        await this.server.listen({ port: listenPort, host: '0.0.0.0' })
        this.port = listenPort
        break
      } catch (err: any) {
        if (err.code === 'EADDRINUSE' && i < 10) {
          listenPort = this.port + i + 1
          continue
        }
        throw err
      }
    }

    this.startMdnsAdvertisement()
    this.running = true
    logger.info(`LAN sync server listening on port ${this.port}`)
  }

  async stop(): Promise<void> {
    if (!this.running) return

    this.stopMdnsAdvertisement()

    // Close all WebSocket connections
    for (const [, ws] of this.authenticatedSockets) {
      ws.close(1000, 'Server shutting down')
    }
    this.authenticatedSockets.clear()

    if (this.server) {
      await this.server.close()
      this.server = null
    }

    this.running = false
    logger.info('LAN sync server stopped')
  }

  isRunning(): boolean {
    return this.running
  }

  getPort(): number {
    return this.port
  }

  getLocalIP(): string {
    const interfaces = networkInterfaces()
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address
        }
      }
    }
    return '127.0.0.1'
  }

  // ---- mDNS ----

  private startMdnsAdvertisement(): void {
    try {
      this.bonjour = new Bonjour()
      this.bonjourService = this.bonjour.publish({
        name: `${APP_NAME}-${this.syncService.getDeviceId().slice(0, 8)}`,
        type: SYNC_SERVICE_NAME.replace(/^_/, '').replace(/\._tcp$/, ''),
        port: this.port,
        txt: {
          deviceId: this.syncService.getDeviceId(),
          version: '1'
        }
      })
      logger.info('mDNS service advertised')
    } catch (err) {
      logger.error('Failed to start mDNS:', err)
    }
  }

  private stopMdnsAdvertisement(): void {
    if (this.bonjourService) {
      this.bonjourService.stop()
      this.bonjourService = null
    }
    if (this.bonjour) {
      this.bonjour.destroy()
      this.bonjour = null
    }
  }

  // ---- Auth middleware ----

  private authMiddleware(
    request: AuthenticatedRequest,
    reply: FastifyReply
  ): void {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Missing or invalid authorization header' })
      return
    }

    const token = authHeader.slice(7)
    const authToken = this.syncService.validateToken(token)
    if (!authToken) {
      reply.code(401).send({ error: 'Invalid token' })
      return
    }

    request.deviceId = authToken.deviceId
    request.deviceName = authToken.deviceName
  }

  // ---- Routes ----

  private setupRoutes(): void {
    if (!this.server) return

    // Public endpoints (no auth)

    this.server.get('/api/sync/status', async () => {
      return {
        deviceId: this.syncService.getDeviceId(),
        deviceName: APP_NAME,
        appVersion: '0.1.0',
        syncEnabled: true,
        requiresPairing: true,
        workspaceName: path.basename(this.syncService.getWorkspacePath())
      }
    })

    this.server.post<{ Body: { deviceId: string; pin: string; deviceName: string } }>(
      '/api/sync/pair',
      async (request, reply) => {
        const { deviceId, pin, deviceName } = request.body || {}
        if (!deviceId || !pin || !deviceName) {
          return reply.code(400).send({ error: 'Missing deviceId, pin, or deviceName' })
        }

        const token = this.syncService.validatePairing(deviceId, pin, deviceName)
        if (!token) {
          return reply.code(401).send({ error: 'Invalid PIN or pairing expired' })
        }

        return { token: token.token, expiresAt: null }
      }
    )

    // Authenticated endpoints

    this.server.get('/api/sync/manifest', {
      preHandler: (req, reply, done) => {
        this.authMiddleware(req as AuthenticatedRequest, reply)
        done()
      },
      handler: async () => {
        return await this.syncService.buildManifest()
      }
    })

    this.server.post<{ Body: { remoteManifest: NoteManifest } }>('/api/sync/delta', {
      preHandler: (req, reply, done) => {
        this.authMiddleware(req as AuthenticatedRequest, reply)
        done()
      },
      handler: async (request) => {
        const { remoteManifest } = request.body || {}
        if (!remoteManifest) {
          return { error: 'Missing remoteManifest' }
        }
        const localManifest = await this.syncService.buildManifest()
        return this.syncService.computeDelta(localManifest, remoteManifest)
      }
    })

    this.server.get<{ Params: { '*': string } }>('/api/notes/*', {
      preHandler: (req, reply, done) => {
        this.authMiddleware(req as AuthenticatedRequest, reply)
        done()
      },
      handler: async (request, reply) => {
        const notePath = (request.params as any)['*']
        if (!notePath) {
          return reply.code(400).send({ error: 'Missing note path' })
        }
        try {
          const content = await this.syncService.getNoteContent(notePath)
          return { path: notePath, content }
        } catch {
          return reply.code(404).send({ error: 'Note not found' })
        }
      }
    })

    this.server.put<{ Params: { '*': string }; Body: { content: string } }>('/api/notes/*', {
      preHandler: (req, reply, done) => {
        this.authMiddleware(req as AuthenticatedRequest, reply)
        done()
      },
      handler: async (request, reply) => {
        const notePath = (request.params as any)['*']
        const { content } = request.body || {}
        if (!notePath || content === undefined) {
          return reply.code(400).send({ error: 'Missing note path or content' })
        }
        await this.syncService.applyRemoteNote(notePath, content)
        return { success: true }
      }
    })

    this.server.delete<{ Params: { '*': string } }>('/api/notes/*', {
      preHandler: (req, reply, done) => {
        this.authMiddleware(req as AuthenticatedRequest, reply)
        done()
      },
      handler: async (request, reply) => {
        const notePath = (request.params as any)['*']
        if (!notePath) {
          return reply.code(400).send({ error: 'Missing note path' })
        }
        try {
          await this.syncService.deleteNote(notePath)
          return { success: true }
        } catch {
          return reply.code(404).send({ error: 'Note not found' })
        }
      }
    })

    this.server.post('/api/sync/complete', {
      preHandler: (req, reply, done) => {
        this.authMiddleware(req as AuthenticatedRequest, reply)
        done()
      },
      handler: async () => {
        this.syncService.setStatus('idle')
        return { success: true, timestamp: Date.now() }
      }
    })
  }

  // ---- WebSocket ----

  private setupWebSocket(): void {
    if (!this.server) return

    this.server.register(async (fastify) => {
      fastify.get('/ws', { websocket: true }, (socket, _req) => {
        let authenticated = false
        let deviceId: string | null = null

        // Expect auth message within 10 seconds
        const authTimeout = setTimeout(() => {
          if (!authenticated) {
            socket.close(4001, 'Authentication timeout')
          }
        }, 10000)

        socket.on('message', (data) => {
          try {
            const msg = JSON.parse(data.toString())

            if (!authenticated) {
              if (msg.type === 'auth' && msg.token) {
                const authToken = this.syncService.validateToken(msg.token)
                if (authToken) {
                  authenticated = true
                  deviceId = authToken.deviceId
                  clearTimeout(authTimeout)
                  this.authenticatedSockets.set(deviceId, socket)

                  // Register as connected device
                  const device: SyncDevice = {
                    id: deviceId,
                    name: authToken.deviceName,
                    type: 'mobile',
                    transport: 'lan',
                    lastSeen: Date.now(),
                    isPaired: true,
                    isConnected: true
                  }
                  this.syncService.addConnectedDevice(device)

                  socket.send(JSON.stringify({ type: 'auth-success' }))
                } else {
                  socket.close(4003, 'Invalid token')
                }
              } else {
                socket.close(4002, 'Expected auth message')
              }
              return
            }

            // Handle authenticated messages
            if (msg.type === 'request-sync') {
              this.syncService.setStatus('syncing')
            }
          } catch {
            // Ignore malformed messages
          }
        })

        socket.on('close', () => {
          clearTimeout(authTimeout)
          if (deviceId) {
            this.authenticatedSockets.delete(deviceId)
            this.syncService.removeConnectedDevice(deviceId)
          }
        })
      })
    })
  }

  // ---- Broadcast ----

  broadcastFileChange(event: FileChangeEvent): void {
    const message = JSON.stringify({
      type: 'file-changed',
      data: event
    })
    for (const [, ws] of this.authenticatedSockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message)
      }
    }
  }

  broadcastSyncStatus(status: SyncStatus): void {
    const message = JSON.stringify({
      type: 'sync-status',
      data: { status }
    })
    for (const [, ws] of this.authenticatedSockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message)
      }
    }
  }
}
