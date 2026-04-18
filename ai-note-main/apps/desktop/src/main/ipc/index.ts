import { BrowserWindow } from 'electron'
import { FileService } from '../services/file-service'
import { GitService } from '../services/git-service'
import { SearchService } from '../services/search-service'
import { TagService } from '../services/tag-service'
import { ConfigService } from '../services/config-service'
import { SyncService } from '../services/sync/sync-service'
import { registerFileHandlers, unregisterFileHandlers } from './file-handlers'
import { registerGitHandlers, unregisterGitHandlers } from './git-handlers'
import { registerSearchHandlers, unregisterSearchHandlers } from './search-handlers'
import { registerTagHandlers, unregisterTagHandlers } from './tag-handlers'
import { registerConfigHandlers, unregisterConfigHandlers } from './config-handlers'
import { registerWorkspaceHandlers, unregisterWorkspaceHandlers } from './workspace-handlers'
import { registerSyncHandlers, unregisterSyncHandlers } from './sync-handlers'
import { PdfMetaService } from '../services/pdf-meta-service'
import { registerPdfMetaHandlers, unregisterPdfMetaHandlers } from './pdf-meta-handlers'
import { logger } from '../utils/logger'

export interface Services {
  fileService: FileService
  gitService: GitService
  searchService: SearchService
  tagService: TagService
  configService: ConfigService
  syncService: SyncService
  pdfMetaService: PdfMetaService
}

interface WorkspaceCallbacks {
  onOpen: (folderPath: string) => Promise<void>
  getRecent: () => Promise<{ path: string; name: string; lastOpened: number }[]>
  getCurrent: () => string | null
}

export function registerAllHandlers(
  mainWindow: BrowserWindow,
  services: Services,
  workspaceCallbacks: WorkspaceCallbacks
): void {
  registerFileHandlers(services.fileService, mainWindow)
  registerGitHandlers(services.gitService)
  registerSearchHandlers(services.searchService)
  registerTagHandlers(services.tagService)
  registerConfigHandlers(services.configService)
  registerWorkspaceHandlers(mainWindow, workspaceCallbacks)
  registerSyncHandlers(services.syncService, mainWindow)
  registerPdfMetaHandlers(services.pdfMetaService)
  // Publish handlers are global (workspace-independent), registered once at startup in main/index.ts
  logger.info('All IPC handlers registered')
}

export function unregisterAllHandlers(): void {
  unregisterFileHandlers()
  unregisterGitHandlers()
  unregisterSearchHandlers()
  unregisterTagHandlers()
  unregisterConfigHandlers()
  unregisterWorkspaceHandlers()
  unregisterSyncHandlers()
  unregisterPdfMetaHandlers()
  // Publish handlers are NOT unregistered here — they are global and persist across workspace switches
  logger.info('All IPC handlers unregistered')
}
