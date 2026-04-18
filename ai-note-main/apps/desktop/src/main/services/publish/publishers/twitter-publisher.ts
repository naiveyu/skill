import type { Page } from 'puppeteer-core'
import type { PublishResult } from '@ai-note/shared-types'
import type { Publisher, LoginStatus, TransformedPublishOptions, ProgressCallback } from './base-publisher'
import { logger } from '../../../utils/logger'

const X_URL = 'https://x.com'
const TIMEOUT = 15000
const TWEET_MAX_LENGTH = 280

export class TwitterPublisher implements Publisher {
  platform = 'twitter'

  async checkLoginStatus(page: Page): Promise<LoginStatus> {
    await page.goto(`${X_URL}/home`, { waitUntil: 'networkidle2', timeout: TIMEOUT })
    return this.pollLoginStatus(page)
  }

  // Lightweight check: only inspect current URL/DOM, no navigation
  async pollLoginStatus(page: Page): Promise<LoginStatus> {
    const url = page.url()

    if (url.includes('/login') || url.includes('/i/flow/login')) {
      return { isLoggedIn: false }
    }

    try {
      const username = await page.$eval(
        '[data-testid="SideNav_AccountSwitcher_Button"] span, [data-testid="UserAvatar-Container"] a',
        (el) => {
          const href = el.getAttribute('href')
          if (href) return href.replace('/', '')
          return el.textContent?.trim() || ''
        }
      )
      if (username) {
        return { isLoggedIn: true, username }
      }
    } catch {
      // element not found
    }

    if (url.includes('/home')) {
      return { isLoggedIn: true }
    }

    return { isLoggedIn: false }
  }

  async openLoginPage(page: Page): Promise<void> {
    await page.goto(`${X_URL}/i/flow/login`, { waitUntil: 'networkidle2', timeout: TIMEOUT })
  }

  async publish(page: Page, options: TransformedPublishOptions, onProgress: ProgressCallback): Promise<PublishResult> {
    try {
      const text = options.plainText
      const isLong = text.length > TWEET_MAX_LENGTH

      if (isLong) {
        return await this.publishThread(page, options, onProgress)
      } else {
        return await this.publishTweet(page, text, onProgress)
      }
    } catch (err: any) {
      logger.error('Twitter publish failed:', err)
      return {
        platform: 'twitter',
        success: false,
        error: err.message || 'Twitter publish failed',
      }
    }
  }

  // Single tweet
  private async publishTweet(page: Page, text: string, onProgress: ProgressCallback): Promise<PublishResult> {
    // Navigate to compose
    onProgress('navigating', 40)
    await page.goto(`${X_URL}/compose/post`, { waitUntil: 'networkidle2', timeout: TIMEOUT })

    // Wait for the tweet compose box
    onProgress('filling-content', 55)
    const editorSelector = '[data-testid="tweetTextarea_0"], [role="textbox"][data-testid*="tweetTextarea"]'
    await page.waitForSelector(editorSelector, { timeout: TIMEOUT })

    // Type the content
    await page.click(editorSelector)
    await page.keyboard.type(text, { delay: 10 })

    // Click post button
    onProgress('publishing', 80)
    const postBtn = await page.waitForSelector(
      '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]',
      { timeout: 5000 }
    )
    if (postBtn) {
      await postBtn.click()
      // Wait for post to complete
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }

    onProgress('done', 100)

    return {
      platform: 'twitter',
      success: true,
      url: page.url(),
      publishedAt: new Date().toISOString(),
    }
  }

  // Thread (multiple tweets for long content)
  private async publishThread(page: Page, options: TransformedPublishOptions, onProgress: ProgressCallback): Promise<PublishResult> {
    const chunks = this.splitIntoChunks(options.plainText, TWEET_MAX_LENGTH)

    onProgress('navigating', 30)
    await page.goto(`${X_URL}/compose/post`, { waitUntil: 'networkidle2', timeout: TIMEOUT })

    const editorSelector = '[data-testid="tweetTextarea_0"], [role="textbox"][data-testid*="tweetTextarea"]'
    await page.waitForSelector(editorSelector, { timeout: TIMEOUT })

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const threadLabel = chunks.length > 1 ? ` (${i + 1}/${chunks.length})` : ''
      const percent = 30 + Math.round(((i + 1) / chunks.length) * 55)

      onProgress(`filling-tweet-${i + 1}`, percent)

      // Type into the current tweet box
      const currentEditor = `[data-testid="tweetTextarea_${i}"], [role="textbox"]`
      try {
        await page.waitForSelector(currentEditor, { timeout: 5000 })
        await page.click(currentEditor)
        await page.keyboard.type(chunk + threadLabel, { delay: 10 })
      } catch {
        // Fallback: just type into whatever is focused
        await page.keyboard.type(chunk + threadLabel, { delay: 10 })
      }

      // If not the last chunk, add a new tweet in the thread
      if (i < chunks.length - 1) {
        try {
          const addBtn = await page.$('[data-testid="addButton"], [aria-label="Add post"]')
          if (addBtn) {
            await addBtn.click()
            await new Promise((resolve) => setTimeout(resolve, 500))
          }
        } catch {
          logger.warn('Twitter: could not add thread tweet')
        }
      }
    }

    // Post the thread
    onProgress('publishing', 90)
    const postBtn = await page.waitForSelector(
      '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]',
      { timeout: 5000 }
    )
    if (postBtn) {
      await postBtn.click()
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }

    onProgress('done', 100)

    return {
      platform: 'twitter',
      success: true,
      url: page.url(),
      publishedAt: new Date().toISOString(),
    }
  }

  // Split text into chunks respecting word boundaries
  private splitIntoChunks(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) return [text]

    const chunks: string[] = []
    const paragraphs = text.split('\n\n')
    let current = ''

    for (const paragraph of paragraphs) {
      if ((current + '\n\n' + paragraph).trim().length <= maxLength - 10) {
        // -10 for thread label
        current = current ? current + '\n\n' + paragraph : paragraph
      } else {
        if (current) chunks.push(current.trim())
        // If a single paragraph exceeds max, split by sentences
        if (paragraph.length > maxLength - 10) {
          const sentences = paragraph.split(/(?<=[。！？.!?])\s*/)
          current = ''
          for (const sentence of sentences) {
            if ((current + sentence).length <= maxLength - 10) {
              current += sentence
            } else {
              if (current) chunks.push(current.trim())
              current = sentence
            }
          }
        } else {
          current = paragraph
        }
      }
    }
    if (current.trim()) chunks.push(current.trim())

    return chunks
  }
}
