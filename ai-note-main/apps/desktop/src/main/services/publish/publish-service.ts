import { BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { BrowserManager } from './browser-manager'
import { ContentTransformer } from './content-transformer'
import { WeChatPublisher } from './publishers/wechat-publisher'
import { XhsPublisher } from './publishers/xhs-publisher'
import type { Publisher } from './publishers/base-publisher'
import { logger } from '../../utils/logger'
import type {
  PublishPlatform,
  PlatformAuthStatus,
  PublishOptions,
  PublishResult,
  PublishProgress,
  PublishHistoryEntry,
} from '@ai-note/shared-types'

export class PublishService {
  private browserManager: BrowserManager
  private contentTransformer: ContentTransformer
  private publishers: Map<PublishPlatform, Publisher>
  private mainWindow: BrowserWindow | null = null
  private history: PublishHistoryEntry[] = []
  private cancelled = false
  private checkingAuth: Set<PublishPlatform> = new Set()
  private publishingPlatforms: Set<PublishPlatform> = new Set()

  constructor() {
    this.browserManager = new BrowserManager()
    this.contentTransformer = new ContentTransformer()

    this.publishers = new Map<PublishPlatform, Publisher>([
      ['wechat', new WeChatPublisher()],
      ['xhs', new XhsPublisher()],
    ])
  }

  setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win
  }

  // Emit progress event to renderer
  private emitProgress(progress: PublishProgress): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('publish:progress', progress)
    }
  }

  // Emit result event to renderer
  private emitResult(result: PublishResult): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('publish:result', result)
    }
  }

  // Check login status for a platform
  async getAuthStatus(platform: PublishPlatform): Promise<PlatformAuthStatus> {
    // Skip auth check if a publish is in progress (avoids browser conflicts)
    if (this.publishingPlatforms.has(platform)) {
      logger.info(`Skipping auth check for ${platform}: publish in progress`)
      return { platform, isLoggedIn: true, lastChecked: new Date().toISOString() }
    }

    const publisher = this.publishers.get(platform)
    if (!publisher) {
      return { platform, isLoggedIn: false }
    }

    this.checkingAuth.add(platform)
    try {
      const browser = await this.browserManager.launch(platform, { headless: true })
      const page = await browser.newPage()

      try {
        const status = await publisher.checkLoginStatus(page)
        return { platform, isLoggedIn: status.isLoggedIn, username: status.username, lastChecked: new Date().toISOString() }
      } finally {
        await page.close()
        await this.browserManager.close(platform)
      }
    } catch (err) {
      logger.error(`Failed to check auth status for ${platform}:`, err)
      return { platform, isLoggedIn: false }
    } finally {
      this.checkingAuth.delete(platform)
    }
  }

  // Open browser for manual login
  async openLoginPage(platform: PublishPlatform): Promise<PlatformAuthStatus> {
    const publisher = this.publishers.get(platform)
    if (!publisher) {
      throw new Error(`Unknown platform: ${platform}`)
    }

    // Launch visible browser for login
    const browser = await this.browserManager.launch(platform, { headless: false })
    const page = await browser.newPage()

    await publisher.openLoginPage(page)

    // Poll for login success (check every 3 seconds, max 5 minutes)
    const maxAttempts = 100
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Check if browser was closed by user
      if (!browser.connected) {
        return { platform, isLoggedIn: false }
      }

      try {
        const status = await publisher.pollLoginStatus(page)
        if (status.isLoggedIn) {
          await browser.close()
          this.browserManager.close(platform)
          return { platform, isLoggedIn: true, username: status.username, lastChecked: new Date().toISOString() }
        }
      } catch {
        // page might have navigated, continue polling
      }
    }

    // Timeout
    await browser.close()
    this.browserManager.close(platform)
    return { platform, isLoggedIn: false }
  }

  // Publish to selected platforms
  async publish(options: PublishOptions): Promise<PublishResult[]> {
    this.cancelled = false
    const results: PublishResult[] = []

    for (const platform of options.platforms) {
      if (this.cancelled) {
        results.push({ platform, success: false, error: 'Cancelled' })
        continue
      }

      const publisher = this.publishers.get(platform)
      if (!publisher) {
        results.push({ platform, success: false, error: `Unknown platform: ${platform}` })
        continue
      }

      this.emitProgress({ platform, step: 'opening-browser', percent: 10 })

      try {
        // Wait for any ongoing auth check to finish (avoids userDataDir conflict)
        while (this.checkingAuth.has(platform)) {
          await new Promise((resolve) => setTimeout(resolve, 300))
        }

        this.publishingPlatforms.add(platform)
        const browser = await this.browserManager.launch(platform, { headless: false })
        const page = await browser.newPage()

        this.emitProgress({ platform, step: 'checking-login', percent: 20 })

        const loginStatus = await publisher.checkLoginStatus(page)
        if (!loginStatus.isLoggedIn) {
          // Auto-open login page and wait for user to login
          this.emitProgress({ platform, step: 'waiting-login', percent: 25 })
          await publisher.openLoginPage(page)

          let loggedIn = false
          const maxAttempts = 100 // 5 minutes
          for (let i = 0; i < maxAttempts; i++) {
            if (this.cancelled || !browser.connected) break
            await new Promise((resolve) => setTimeout(resolve, 3000))
            try {
              const pollStatus = await publisher.pollLoginStatus(page)
              if (pollStatus.isLoggedIn) {
                loggedIn = true
                logger.info(`${platform}: login detected via polling`)
                break
              }
            } catch {
              // page navigating, continue
            }
          }

          if (!loggedIn) {
            await page.close()
            const result: PublishResult = { platform, success: false, error: 'Login timeout or cancelled' }
            results.push(result)
            this.emitResult(result)
            continue
          }
        }

        this.emitProgress({ platform, step: 'preparing-content', percent: 30 })

        // Extract local image paths from markdown
        const images = await this.extractImages(options.content, options.filePath)

        // Parse structured sections (## 标题 / ## 正文)
        const sections = this.contentTransformer.parseSections(options.content)

        // Transform content for this platform
        const transformedOptions = {
          ...options,
          title: sections.title || options.title,
          html: this.contentTransformer.toHtml(options.content),
          plainText: sections.body || this.contentTransformer.toPlainText(options.content),
          summary: options.summary || this.contentTransformer.generateSummary(options.content),
          images,
        }

        this.emitProgress({ platform, step: 'filling-content', percent: 50 })

        const result = await publisher.publish(page, transformedOptions, (step, percent) => {
          this.emitProgress({ platform, step, percent })
        })

        // Keep browser open so user can verify the result
        // Browser will be closed on next operation or app quit

        results.push(result)
        this.emitResult(result)
      } catch (err: any) {
        const result: PublishResult = {
          platform,
          success: false,
          error: err.message || 'Unknown error',
        }
        results.push(result)
        this.emitResult(result)
        // Keep browser open on failure too so user can inspect
      } finally {
        this.publishingPlatforms.delete(platform)
      }
    }

    // Save to history
    if (results.some((r) => r.success)) {
      this.history.unshift({
        id: Date.now().toString(),
        filePath: '', // caller can set this
        title: options.title,
        platforms: results,
        publishedAt: new Date().toISOString(),
      })
      // Keep last 50 entries
      if (this.history.length > 50) this.history.length = 50
    }

    return results
  }

  // Cancel ongoing publish
  cancel(): void {
    this.cancelled = true
    this.browserManager.closeAll()
  }

  // Get publish history
  getHistory(): PublishHistoryEntry[] {
    return this.history
  }

  // Extract local image paths from markdown content
  private async extractImages(content: string, filePath?: string): Promise<string[]> {
    if (!filePath) return []

    const dir = path.dirname(filePath)
    const images: string[] = []

    // Match markdown image syntax: ![alt](path)
    const imgRegex = /!\[[^\]]*\]\(([^)]+)\)/g
    let match: RegExpExecArray | null
    while ((match = imgRegex.exec(content)) !== null) {
      const imgPath = match[1].trim()
      // Skip URLs
      if (imgPath.startsWith('http://') || imgPath.startsWith('https://') || imgPath.startsWith('data:')) {
        continue
      }
      const absolutePath = path.resolve(dir, imgPath)
      try {
        await fs.access(absolutePath)
        images.push(absolutePath)
      } catch {
        // file doesn't exist, skip
      }
    }

    // Also scan the note's directory for image files (png/jpg/jpeg/gif/webp)
    // that might not be referenced in markdown but are alongside the note
    try {
      const files = await fs.readdir(dir)
      for (const file of files) {
        if (/\.(png|jpg|jpeg|gif|webp)$/i.test(file)) {
          const absPath = path.join(dir, file)
          if (!images.includes(absPath)) {
            images.push(absPath)
          }
        }
      }
    } catch {
      // directory read failed
    }

    logger.info(`Extracted ${images.length} images from ${filePath}`)
    return images
  }

  // Cleanup
  async dispose(): Promise<void> {
    await this.browserManager.closeAll()
  }
}
