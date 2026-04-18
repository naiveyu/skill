import type { Page } from 'puppeteer-core'
import type { PublishResult } from '@ai-note/shared-types'
import type { Publisher, LoginStatus, TransformedPublishOptions, ProgressCallback } from './base-publisher'
import { findByText } from './selector-utils'
import { logger } from '../../../utils/logger'
import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'

const CREATOR_URL = 'https://creator.xiaohongshu.com'
const IMAGE_PUBLISH_URL = `${CREATOR_URL}/publish/publish?from=menu&target=image`
const TIMEOUT = 20000

// Save debug screenshot
async function debugScreenshot(page: Page, name: string): Promise<void> {
  try {
    const dir = path.join(app.getPath('userData'), 'publish-debug')
    await fs.mkdir(dir, { recursive: true })
    const file = path.join(dir, `${name}-${Date.now()}.png`)
    await page.screenshot({ path: file })
    logger.info(`XHS debug screenshot: ${file}`)
  } catch {
    // ignore
  }
}

export class XhsPublisher implements Publisher {
  platform = 'xhs'

  async checkLoginStatus(page: Page): Promise<LoginStatus> {
    await page.goto(IMAGE_PUBLISH_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT })
    await new Promise((r) => setTimeout(r, 3000))
    return this.pollLoginStatus(page)
  }

  async pollLoginStatus(page: Page): Promise<LoginStatus> {
    const url = page.url()
    if (url.includes('/login') || url.includes('passport')) {
      return { isLoggedIn: false }
    }
    if (url.includes('creator.xiaohongshu.com')) {
      try {
        const nickname = await page.$eval(
          '.user-name, .username, [class*="userName"], [class*="nickname"]',
          (el) => el.textContent?.trim() || ''
        )
        if (nickname) return { isLoggedIn: true, username: nickname }
      } catch {
        // element not found
      }
      return { isLoggedIn: true }
    }
    return { isLoggedIn: false }
  }

  async openLoginPage(page: Page): Promise<void> {
    await page.goto(CREATOR_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT })
  }

  async publish(page: Page, options: TransformedPublishOptions, onProgress: ProgressCallback): Promise<PublishResult> {
    try {
      // Step 1: Navigate to image publish page
      onProgress('navigating', 5)
      await page.goto(IMAGE_PUBLISH_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT })
      await page.waitForSelector('input[type="file"].upload-input', { timeout: TIMEOUT })
      logger.info('XHS: publish page loaded')

      // Step 2: Click "文字配图" button
      onProgress('opening-editor', 15)
      const textImgBtn = await findByText(page, 'button', '文字配图')
      if (!textImgBtn) {
        await debugScreenshot(page, 'no-text-img-btn')
        return { platform: 'xhs', success: false, error: '"文字配图" button not found' }
      }
      await textImgBtn.click()
      logger.info('XHS: clicked 文字配图')

      // Step 3: Wait for card text editor and type title
      onProgress('filling-card', 25)
      const cardEditorSelector = '.ProseMirror[contenteditable="true"], [contenteditable="true"]'
      await page.waitForSelector(cardEditorSelector, { timeout: 10000 })
      await new Promise((r) => setTimeout(r, 1000))

      const cardEditor = await page.$(cardEditorSelector)
      if (!cardEditor) {
        await debugScreenshot(page, 'no-card-editor')
        return { platform: 'xhs', success: false, error: 'Card text editor not found' }
      }
      await cardEditor.click()
      await new Promise((r) => setTimeout(r, 300))
      await page.keyboard.down('Meta')
      await page.keyboard.press('a')
      await page.keyboard.up('Meta')
      await page.keyboard.press('Backspace')
      await new Promise((r) => setTimeout(r, 200))
      // Type title as card text (becomes the generated image content)
      await page.keyboard.type(options.title, { delay: 10 })
      logger.info('XHS: card text filled:', options.title)
      await debugScreenshot(page, 'card-filled')

      // Step 4: Click "生成图片"
      onProgress('generating-image', 40)
      await new Promise((r) => setTimeout(r, 500))
      const generateBtn = await findByText(page, 'button, div, span', '生成图片')
      if (!generateBtn) {
        await debugScreenshot(page, 'no-generate-btn')
        return { platform: 'xhs', success: false, error: '"生成图片" button not found' }
      }
      await generateBtn.click()
      logger.info('XHS: clicked 生成图片, waiting for image generation...')

      // Wait for image generation to complete — look for "下一步" button to appear
      await new Promise((r) => setTimeout(r, 3000))
      let nextBtn = null
      for (let i = 0; i < 15; i++) {
        nextBtn = await findByText(page, 'button, div, span', '下一步')
        if (nextBtn) break
        await new Promise((r) => setTimeout(r, 2000))
      }
      await debugScreenshot(page, 'after-generate')

      // Step 5: Click "下一步"
      onProgress('preview', 55)
      if (!nextBtn) {
        await debugScreenshot(page, 'no-next-btn')
        return { platform: 'xhs', success: false, error: '"下一步" button not found after image generation' }
      }
      await nextBtn.click()
      logger.info('XHS: clicked 下一步')

      // Step 6: Wait for publish settings page — title input appears
      onProgress('filling-title', 65)
      const titleSelector = 'input[placeholder*="填写标题"]'
      await page.waitForSelector(titleSelector, { timeout: 15000 }).catch(() => {})
      await new Promise((r) => setTimeout(r, 2000))
      await debugScreenshot(page, 'publish-page')

      // Fill title (XHS limit: 20 chars)
      const xhsTitle = options.title.substring(0, 20)
      try {
        const titleInput = await page.$(titleSelector) || await page.$('input.d-text')
        if (titleInput) {
          await titleInput.click({ clickCount: 3 })
          await new Promise((r) => setTimeout(r, 200))
          await titleInput.type(xhsTitle, { delay: 15 })
          logger.info('XHS: title filled:', xhsTitle)
        } else {
          logger.warn('XHS: title input not found')
        }
      } catch (err) {
        logger.warn('XHS: failed to fill title:', err)
      }

      // Step 7: Fill description in ProseMirror editor
      onProgress('filling-description', 75)
      const body = options.plainText.substring(0, 990)
      try {
        const editorSelector = '.ProseMirror[contenteditable="true"]'
        await page.waitForSelector(editorSelector, { timeout: 5000 })
        const editor = await page.$(editorSelector)
        if (editor) {
          await editor.click()
          await new Promise((r) => setTimeout(r, 300))
          await page.keyboard.down('Meta')
          await page.keyboard.press('a')
          await page.keyboard.up('Meta')
          await page.keyboard.press('Backspace')
          await new Promise((r) => setTimeout(r, 200))
          await page.keyboard.type(body, { delay: 5 })
          logger.info('XHS: description filled, length:', body.length)
        }
      } catch {
        logger.warn('XHS: description editor not found')
      }

      // Step 8: Set visibility to "仅自己可见"
      onProgress('setting-visibility', 85)
      try {
        await page.evaluate(() => window.scrollBy(0, 300))
        await new Promise((r) => setTimeout(r, 500))
        const visDropdown = await page.$('.permission-card-select .d-select-main')
        if (visDropdown) {
          await visDropdown.click()
          await new Promise((r) => setTimeout(r, 600))
          const clicked = await page.evaluate(() => {
            const items = document.querySelectorAll('.d-dropdown-content *')
            for (const el of items) {
              if (el.textContent?.trim() === '仅自己可见' && el.children.length <= 2) {
                ;(el as HTMLElement).click()
                return true
              }
            }
            return false
          })
          if (clicked) logger.info('XHS: visibility set to 仅自己可见')
          await new Promise((r) => setTimeout(r, 400))
        }
      } catch (err) {
        logger.warn('XHS: failed to set visibility:', err)
      }

      // Step 9: Click "发布"
      onProgress('submitting', 92)
      await debugScreenshot(page, 'before-publish')
      await new Promise((r) => setTimeout(r, 500))

      let published = false
      const publishBtn = await findByText(page, 'button', '发布')
      if (publishBtn) {
        await publishBtn.click()
        published = true
      }
      if (!published) {
        published = await page.evaluate(() => {
          const btns = document.querySelectorAll('button')
          for (const btn of btns) {
            if (btn.textContent?.trim() === '发布') { btn.click(); return true }
          }
          return false
        })
      }

      if (!published) {
        await debugScreenshot(page, 'publish-btn-not-found')
        return { platform: 'xhs', success: false, error: '"发布" button not found' }
      }

      // Wait and check for toast errors
      await new Promise((r) => setTimeout(r, 3000))
      const toastError = await page.evaluate(() => {
        const toasts = document.querySelectorAll('[class*="toast"], [class*="Toast"]')
        for (const t of toasts) {
          const text = t.textContent?.trim()
          if (text && t.classList.contains('error')) return text
        }
        return null
      })

      await debugScreenshot(page, 'after-publish')

      if (toastError) {
        logger.warn('XHS: publish toast error:', toastError)
        return { platform: 'xhs', success: false, error: toastError }
      }

      logger.info('XHS: published, url:', page.url())
      onProgress('done', 100)
      return {
        platform: 'xhs',
        success: true,
        url: page.url(),
        publishedAt: new Date().toISOString(),
      }
    } catch (err: any) {
      await debugScreenshot(page, 'error')
      logger.error('XHS publish failed:', err)
      return { platform: 'xhs', success: false, error: err.message || 'XHS publish failed' }
    }
  }
}
