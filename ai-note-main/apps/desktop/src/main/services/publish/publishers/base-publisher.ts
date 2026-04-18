import type { Page } from 'puppeteer-core'
import type { PublishOptions, PublishResult } from '@ai-note/shared-types'

// Extended publish options with pre-transformed content
export interface TransformedPublishOptions extends PublishOptions {
  html: string       // markdown converted to HTML
  plainText: string  // markdown converted to plain text
  images: string[]   // absolute paths to images referenced in the markdown
}

// Login check result
export interface LoginStatus {
  isLoggedIn: boolean
  username?: string
}

// Progress callback: (step, percent) => void
export type ProgressCallback = (step: string, percent: number) => void

// All platform publishers must implement this interface
export interface Publisher {
  platform: string

  // Navigate to site and check if user is logged in (may navigate)
  checkLoginStatus(page: Page): Promise<LoginStatus>

  // Lightweight poll: check current page URL/DOM without navigating (for login polling)
  pollLoginStatus(page: Page): Promise<LoginStatus>

  // Navigate to login page for manual user login
  openLoginPage(page: Page): Promise<void>

  // Publish content to the platform
  publish(page: Page, options: TransformedPublishOptions, onProgress: ProgressCallback): Promise<PublishResult>
}
