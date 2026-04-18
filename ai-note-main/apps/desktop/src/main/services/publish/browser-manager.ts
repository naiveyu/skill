import puppeteer, { type Browser } from 'puppeteer-core'
import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { logger } from '../../utils/logger'
import type { PublishPlatform } from '@ai-note/shared-types'

// Common Chrome paths by platform
const CHROME_PATHS: Record<string, string[]> = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ],
}

export class BrowserManager {
  private browsers: Map<string, Browser> = new Map()
  private browserHeadless: Map<string, boolean> = new Map() // track headless mode per browser
  private launching: Map<string, Promise<Browser>> = new Map()
  private profilesDir: string

  constructor() {
    this.profilesDir = path.join(app.getPath('userData'), 'publish-profiles')
  }

  // Find Chrome executable on the system
  async findChromePath(): Promise<string> {
    const candidates = CHROME_PATHS[process.platform] || CHROME_PATHS.linux
    for (const p of candidates) {
      try {
        await fs.access(p)
        return p
      } catch {
        // not found, try next
      }
    }
    throw new Error('Chrome not found. Please install Google Chrome to use the publish feature.')
  }

  // Get user data dir for a specific platform
  private getProfileDir(platform: PublishPlatform): string {
    return path.join(this.profilesDir, platform)
  }

  // Launch a browser for a platform (with per-platform lock to prevent concurrent launches)
  async launch(platform: PublishPlatform, options?: { headless?: boolean }): Promise<Browser> {
    const headless = options?.headless ?? true

    // Reuse existing browser if available AND headless mode matches
    const existing = this.browsers.get(platform)
    if (existing && existing.connected) {
      const existingHeadless = this.browserHeadless.get(platform) ?? true
      if (existingHeadless === headless) {
        return existing
      }
      // Headless mode mismatch — close old browser first
      logger.info(`Closing ${platform} browser (headless=${existingHeadless}) to relaunch as headless=${headless}`)
      await this.close(platform)
    }

    // Wait for pending launch if another call is already launching for this platform
    const pending = this.launching.get(platform)
    if (pending) {
      return pending
    }

    const launchPromise = this.doLaunch(platform, options)
    this.launching.set(platform, launchPromise)

    try {
      const browser = await launchPromise
      return browser
    } finally {
      this.launching.delete(platform)
    }
  }

  private async doLaunch(platform: PublishPlatform, options?: { headless?: boolean }): Promise<Browser> {
    const headless = options?.headless ?? true

    // Double-check after acquiring "lock"
    const existing = this.browsers.get(platform)
    if (existing && existing.connected) {
      const existingHeadless = this.browserHeadless.get(platform) ?? true
      if (existingHeadless === headless) {
        return existing
      }
      // Mismatch — close old browser
      await this.close(platform)
      // Brief delay to ensure Chrome releases profile lock
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    const chromePath = await this.findChromePath()
    const profileDir = this.getProfileDir(platform)
    await fs.mkdir(profileDir, { recursive: true })

    // Clean up stale Chrome lock files from previous crashes
    await this.cleanStaleLockFiles(profileDir)

    logger.info(`Launching Chrome for ${platform} (headless=${headless})`)

    const browser = await puppeteer.launch({
      executablePath: chromePath,
      userDataDir: profileDir,
      headless,
      defaultViewport: headless ? { width: 1280, height: 800 } : null,
      args: [
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-infobars',
      ],
    })

    this.browsers.set(platform, browser)
    this.browserHeadless.set(platform, headless)

    // Inject anti-detection stealth into every new page
    browser.on('targetcreated', async (target) => {
      try {
        const page = await target.page()
        if (page) {
          await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false })
          })
        }
      } catch {
        // target may not be a page (e.g. service worker)
      }
    })

    // Cleanup on disconnect
    browser.on('disconnected', () => {
      this.browsers.delete(platform)
      this.browserHeadless.delete(platform)
      logger.info(`Browser disconnected for ${platform}`)
    })

    return browser
  }

  // Remove stale lock/port files that prevent Chrome from launching
  // These can be left behind if Chrome crashes or is killed without cleanup
  private async cleanStaleLockFiles(profileDir: string): Promise<void> {
    const staleFiles = ['SingletonLock', 'SingletonSocket', 'SingletonCookie', 'DevToolsActivePort']
    for (const file of staleFiles) {
      try {
        await fs.unlink(path.join(profileDir, file))
        logger.info(`Removed stale Chrome file: ${file}`)
      } catch {
        // file doesn't exist, that's fine
      }
    }
  }

  // Close browser for a specific platform
  async close(platform: PublishPlatform): Promise<void> {
    const browser = this.browsers.get(platform)
    if (browser) {
      try {
        await browser.close()
      } catch {
        // already closed
      }
      this.browsers.delete(platform)
      this.browserHeadless.delete(platform)
    }
    // Clean up stale lock files after close
    const profileDir = this.getProfileDir(platform)
    await this.cleanStaleLockFiles(profileDir)
  }

  // Close all browsers
  async closeAll(): Promise<void> {
    for (const [platform] of this.browsers) {
      await this.close(platform as PublishPlatform)
    }
  }
}
