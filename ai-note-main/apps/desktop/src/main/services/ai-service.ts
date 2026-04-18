import { BrowserWindow } from 'electron'
import Anthropic from '@anthropic-ai/sdk'
import { logger } from '../utils/logger'

export class AiService {
  private mainWindow: BrowserWindow | null = null
  private abortController: AbortController | null = null

  setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win
  }

  async send(prompt: string, apiKey: string): Promise<void> {
    this.cancel()

    const win = this.mainWindow
    if (!win || win.isDestroyed()) {
      logger.error('AiService: no main window')
      return
    }

    this.abortController = new AbortController()

    try {
      const client = new Anthropic({ apiKey })

      logger.info('AiService: starting streaming request')

      const stream = await client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: 'You are a helpful AI assistant for note-taking and learning. Respond in the same language as the user\'s message. Be concise and well-structured. Use markdown formatting.',
        messages: [{ role: 'user', content: prompt }],
      }, { signal: this.abortController.signal })

      for await (const event of stream) {
        if (win.isDestroyed()) break

        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          win.webContents.send('ai:stream-chunk', { content: event.delta.text })
        }
      }

      if (!win.isDestroyed()) {
        win.webContents.send('ai:stream-end')
      }
    } catch (err: any) {
      this.abortController = null
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        if (!win.isDestroyed()) {
          win.webContents.send('ai:stream-end')
        }
        return
      }
      logger.error('AiService error:', err?.message || err)
      if (!win.isDestroyed()) {
        win.webContents.send('ai:stream-error', {
          message: err?.message || 'AI request failed'
        })
      }
    } finally {
      this.abortController = null
    }
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  dispose(): void {
    this.cancel()
  }
}
