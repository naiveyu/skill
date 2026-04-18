import { ipcMain, app } from 'electron'
import { FeedbackSDK } from '@AInote/feedback-sdk'
import { AuthService } from '../services/auth-service'
import { logger } from '../utils/logger'

export function registerFeedbackHandlers(authService: AuthService): void {
  ipcMain.handle('feedback:submit', async (_event, data: {
    type: 'bug' | 'feature'
    title: string
    description: string
    images?: string[]
  }) => {
    try {
      const serverUrl = authService.getServerUrl()
      const authState = authService.getAuthState()

      const sdk = new FeedbackSDK({
        endpoint: serverUrl,
        productId: 'ai-note',
      })

      const result = await sdk.submit({
        type: data.type,
        title: data.title,
        content: data.description,
        images: data.images,
        metadata: {
          userEmail: authState.user?.email,
          userName: authState.user?.username,
          appVersion: app.getVersion(),
          platform: `${process.platform} ${process.arch}`,
        },
      })

      return { success: true, id: result.id }
    } catch (err: any) {
      logger.error('Failed to submit feedback:', err)
      return { success: false, error: err.message || 'Network error' }
    }
  })
}
