import { ipcMain } from 'electron'
import { SearchService } from '../services/search-service'
import { SearchOptions } from '@shared/types/ipc'
import { logger } from '../utils/logger'

export function registerSearchHandlers(searchService: SearchService): void {
  ipcMain.handle('search:query', async (_event, query: string, options?: SearchOptions) => {
    return searchService.search(query, options)
  })

  ipcMain.handle('search:rebuild', async () => {
    await searchService.buildIndex()
  })

  logger.info('Search IPC handlers registered')
}

export function unregisterSearchHandlers(): void {
  ipcMain.removeHandler('search:query')
  ipcMain.removeHandler('search:rebuild')
}
