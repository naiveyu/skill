import path from 'path'
import fs from 'fs/promises'
import { app, BrowserWindow, screen, shell, protocol, net } from 'electron'
import { CONFIG_DIR, APP_NAME } from '@shared/constants'
import { WorkspaceInfo } from '@shared/types/ipc'
import { DbService } from './services/db-service'
import { FileService } from './services/file-service'
import { GitService } from './services/git-service'
import { SearchService } from './services/search-service'
import { TagService } from './services/tag-service'
import { PdfMetaService } from './services/pdf-meta-service'
import { ConfigService } from './services/config-service'
import { SyncService } from './services/sync/sync-service'
import { LanSyncTransport } from './services/sync/lan-sync-transport'
import { BleSyncTransport } from './services/sync/ble-sync-transport'
import { registerAllHandlers, unregisterAllHandlers, Services } from './ipc/index'
import { registerWorkspaceHandlers, unregisterWorkspaceHandlers } from './ipc/workspace-handlers'
import { registerConfigHandlers, unregisterConfigHandlers } from './ipc/config-handlers'
import { AuthService } from './services/auth-service'
import { PublishService } from './services/publish/publish-service'
import { registerAuthHandlers } from './ipc/auth-handlers'
import { registerPublishHandlers } from './ipc/publish-handlers'
import { registerFeedbackHandlers } from './ipc/feedback-handlers'
import { registerUpdateHandlers } from './ipc/update-handlers'
import { AiService } from './services/ai-service'
import { registerAiHandlers, setAiConfigService } from './ipc/ai-handlers'
import { registerVideoHandlers } from './ipc/video-handlers'
import { logger } from './utils/logger'

// Suppress EPIPE errors from crashing the app
process.stdout?.on?.('error', () => {})
process.stderr?.on?.('error', () => {})
import crypto from 'crypto'

// ---- Analytics reporting ----
let appStartTime = Date.now()
let cachedDeviceId: string | null = null

async function getOrCreateDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId
  const deviceIdPath = path.join(app.getPath('userData'), 'device-id')
  try {
    cachedDeviceId = (await fs.readFile(deviceIdPath, 'utf-8')).trim()
  } catch {
    cachedDeviceId = crypto.randomUUID()
    await fs.writeFile(deviceIdPath, cachedDeviceId, 'utf-8')
  }
  return cachedDeviceId
}

async function reportAnalyticsEvent(
  authService: AuthService,
  event: 'app_open' | 'app_close',
  duration?: number
): Promise<void> {
  const deviceId = await getOrCreateDeviceId()
  const authState = authService.getAuthState()
  const serverUrl = authService.getServerUrl()

  const body: Record<string, any> = {
    deviceId,
    userId: authState.user?.id,
    userEmail: authState.user?.email,
    event,
    appVersion: app.getVersion(),
    platform: `${process.platform} ${process.arch}`,
  }
  if (duration !== undefined) body.duration = duration

  await fetch(`${serverUrl}/api/analytics/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ---- Global state ----
let mainWindow: BrowserWindow | null = null
let currentWorkspacePath: string | null = null
let services: Services | null = null
let dbService: DbService | null = null
let recentWorkspaces: WorkspaceInfo[] = []
let publishService: PublishService | null = null
let aiService: AiService | null = null

// ---- Window creation ----
function createWindow(): void {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  mainWindow = new BrowserWindow({
    width: Math.round(screenWidth * 0.8),
    height: Math.round(screenHeight * 0.8),
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: APP_NAME,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// ---- Workspace initialization ----
async function initializeWorkspace(workspacePath: string): Promise<void> {
  // Clean up previous workspace if any
  await cleanupServices()

  // Ensure .ai-note config directory exists
  const configDir = path.join(workspacePath, CONFIG_DIR)
  await fs.mkdir(configDir, { recursive: true })

  // Initialize services
  dbService = new DbService(workspacePath)

  const fileService = new FileService(workspacePath)
  await fileService.initialize()

  const gitService = new GitService(workspacePath)
  await gitService.initialize()

  const searchService = new SearchService(workspacePath)
  await searchService.buildIndex()

  const tagService = new TagService(workspacePath, dbService)
  await tagService.initialize()

  const pdfMetaService = new PdfMetaService(workspacePath)

  const configService = new ConfigService(workspacePath)
  await configService.load()

  // Update AI service config reference for token access
  setAiConfigService(configService)

  // Initialize sync service
  const syncService = new SyncService(workspacePath, fileService, gitService, configService)
  const syncConfig = configService.get('sync')
  if (syncConfig?.lanEnabled) {
    const lanTransport = new LanSyncTransport(syncService, syncConfig.lanPort || 18923)
    syncService.registerTransport(lanTransport)
  }
  if (syncConfig?.bleEnabled) {
    const bleTransport = new BleSyncTransport(syncService)
    syncService.registerTransport(bleTransport)
  }
  await syncService.initialize()

  services = {
    fileService,
    gitService,
    searchService,
    tagService,
    configService,
    syncService,
    pdfMetaService
  }

  currentWorkspacePath = workspacePath

  // Get transport references for broadcasting file changes
  const lanTransport = syncService.getTransport('lan') as LanSyncTransport | undefined
  const bleTransport = syncService.getTransport('ble') as BleSyncTransport | undefined

  // Update file index on file changes
  fileService.onFileChange(async (event) => {
    const absolutePath = path.join(workspacePath, event.path)

    if (event.path.endsWith('.md')) {
      if (event.type === 'add' || event.type === 'change') {
        await searchService.updateFile(absolutePath)
        await tagService.syncFileTags(absolutePath)
      } else if (event.type === 'unlink') {
        await searchService.removeFile(event.path)
        dbService?.deleteNote(event.path)
      }
    }

    // Sync tags when PDF sidecar metadata changes
    if (event.path.endsWith('.pdf.meta.json')) {
      if (event.type === 'add' || event.type === 'change') {
        const pdfRelPath = event.path.replace(/\.meta\.json$/, '')
        await tagService.syncPdfTags(pdfRelPath)
      } else if (event.type === 'unlink') {
        const pdfRelPath = event.path.replace(/\.meta\.json$/, '')
        dbService?.deleteNote(pdfRelPath)
      }
    }

    // Broadcast file changes to connected mobile devices
    lanTransport?.broadcastFileChange(event)
    bleTransport?.broadcastFileChange(event)
  })

  // Update recent workspaces
  updateRecentWorkspaces(workspacePath)

  // Register IPC handlers (unregister early handlers + all service handlers)
  if (mainWindow) {
    unregisterAllHandlers()
    unregisterWorkspaceHandlers()
    unregisterConfigHandlers()
    registerAllHandlers(mainWindow, services, {
      onOpen: initializeWorkspace,
      getRecent: async () => recentWorkspaces,
      getCurrent: () => currentWorkspacePath
    })
  }

  logger.info('Workspace initialized:', workspacePath)

  // DEV: set session config to auto-open a file
  if (process.env.NODE_ENV === 'development' && process.env.DEV_OPEN_FILE) {
    const devFile = process.env.DEV_OPEN_FILE
    services.configService.set('session', { openFiles: [devFile], activeFile: devFile }).catch(() => {})
  }
}

function updateRecentWorkspaces(workspacePath: string): void {
  const name = path.basename(workspacePath)
  const now = Date.now()

  // Remove existing entry if present
  recentWorkspaces = recentWorkspaces.filter((ws) => ws.path !== workspacePath)

  // Add to front
  recentWorkspaces.unshift({ path: workspacePath, name, lastOpened: now })

  // Keep only last 10
  if (recentWorkspaces.length > 10) {
    recentWorkspaces = recentWorkspaces.slice(0, 10)
  }
}

// ---- Cleanup ----
async function cleanupServices(): Promise<void> {
  if (services) {
    await services.syncService.dispose()
    await services.fileService.dispose()
    services.gitService.dispose()
    services = null
  }

  if (dbService) {
    dbService.close()
    dbService = null
  }

  currentWorkspacePath = null
  logger.info('Services cleaned up')
}

// ---- App lifecycle ----
app.whenReady().then(async () => {
  // Register custom protocol to serve workspace files (solves file:// CORS in dev mode)
  protocol.handle('local-asset', (request) => {
    // URL format: local-asset://workspace-file/relative/path
    const url = new URL(request.url)
    const relativePath = decodeURIComponent(url.pathname.replace(/^\//, ''))
    if (!currentWorkspacePath) {
      return new Response('No workspace', { status: 404 })
    }
    const fullPath = path.join(currentWorkspacePath, relativePath)
    // Validate path stays within workspace
    if (!fullPath.startsWith(currentWorkspacePath)) {
      return new Response('Forbidden', { status: 403 })
    }
    return net.fetch(`file://${fullPath}`)
  })

  createWindow()

  // Initialize auth service (global, workspace-independent)
  const authService = new AuthService(app.getPath('userData'))
  await authService.loadCachedAuth()
  registerAuthHandlers(authService)
  registerFeedbackHandlers(authService)
  registerUpdateHandlers()

  // Report app open analytics (non-blocking)
  appStartTime = Date.now()
  reportAnalyticsEvent(authService, 'app_open').then(() => {
    logger.info('Analytics: app_open reported')
  }).catch((err) => {
    logger.warn('Analytics: failed to report app_open', err?.message || err)
  })

  // Report app close with duration on quit
  app.on('before-quit', () => {
    const duration = Math.round((Date.now() - appStartTime) / 1000)
    reportAnalyticsEvent(authService, 'app_close', duration).catch(() => {})
  })

  // Initialize publish service (global, workspace-independent)
  publishService = new PublishService()
  if (mainWindow) {
    registerPublishHandlers(publishService, mainWindow)
  }

  // Initialize AI service (global, workspace-independent)
  aiService = new AiService()
  if (mainWindow) {
    registerAiHandlers(aiService, mainWindow)
    registerVideoHandlers(mainWindow)
  }

  // Register workspace and config handlers early (before workspace is opened)
  if (mainWindow) {
    registerWorkspaceHandlers(mainWindow, {
      onOpen: initializeWorkspace,
      getRecent: async () => recentWorkspaces,
      getCurrent: () => currentWorkspacePath
    })

    // Register config handler with default config for pre-workspace state
    const defaultConfig = new ConfigService(app.getPath('userData'))
    defaultConfig.load().then(() => {
      registerConfigHandlers(defaultConfig)
      setAiConfigService(defaultConfig)
    }).catch(() => {
      // Register with fallback even if load fails
      registerConfigHandlers(defaultConfig)
      setAiConfigService(defaultConfig)
    })
  }

  // Auto-open workspace in dev mode
  if (process.env.NODE_ENV === 'development' && process.env.DEV_WORKSPACE) {
    const devWs = process.env.DEV_WORKSPACE
    logger.info('Dev: auto-opening workspace', devWs)
    setTimeout(() => initializeWorkspace(devWs), 2000)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  await cleanupServices()
  if (publishService) {
    await publishService.dispose()
    publishService = null
  }
  if (aiService) {
    aiService.dispose()
    aiService = null
  }
})
