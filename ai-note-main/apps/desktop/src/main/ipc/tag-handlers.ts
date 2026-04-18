import { ipcMain } from 'electron'
import { TagService } from '../services/tag-service'
import { logger } from '../utils/logger'

export function registerTagHandlers(tagService: TagService): void {
  ipcMain.handle('tag:get-all', async () => {
    return tagService.getAllTags()
  })

  ipcMain.handle('tag:get-notes', async (_event, tagName: string) => {
    return tagService.getNotesByTag(tagName)
  })

  ipcMain.handle('tag:update', async (_event, filePath: string, tags: string[]) => {
    await tagService.updateNoteTags(filePath, tags)
  })

  ipcMain.handle('tag:rename', async (_event, oldName: string, newName: string) => {
    await tagService.renameTag(oldName, newName)
  })

  logger.info('Tag IPC handlers registered')
}

export function unregisterTagHandlers(): void {
  ipcMain.removeHandler('tag:get-all')
  ipcMain.removeHandler('tag:get-notes')
  ipcMain.removeHandler('tag:update')
  ipcMain.removeHandler('tag:rename')
}
