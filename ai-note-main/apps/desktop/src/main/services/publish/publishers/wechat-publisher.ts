import type { Page } from 'puppeteer-core'
import type { PublishResult } from '@ai-note/shared-types'
import type { Publisher, LoginStatus, TransformedPublishOptions, ProgressCallback } from './base-publisher'
import { findByText, findFirstMatch } from './selector-utils'
import { logger } from '../../../utils/logger'

const MP_URL = 'https://mp.weixin.qq.com'
const TIMEOUT = 15000

export class WeChatPublisher implements Publisher {
  platform = 'wechat'

  async checkLoginStatus(page: Page): Promise<LoginStatus> {
    await page.goto(MP_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT })
    return this.pollLoginStatus(page)
  }

  // Lightweight check: only inspect current URL/DOM, no navigation
  async pollLoginStatus(page: Page): Promise<LoginStatus> {
    const url = page.url()

    // If on login page, not logged in
    if (url.includes('/cgi-bin/loginpage') || url.includes('/cgi-bin/bizlogin')) {
      return { isLoggedIn: false }
    }

    // Try to find the nickname element
    try {
      const nickname = await page.$eval(
        '.weui-desktop-account__nickname, .nickname, [class*="nickname"]',
        (el) => el.textContent?.trim() || ''
      )
      if (nickname) {
        return { isLoggedIn: true, username: nickname }
      }
    } catch {
      // element not found
    }

    // Check if we're on the main dashboard
    if (url.includes('/cgi-bin/home') || url.includes('/cgi-bin/appmsg')) {
      return { isLoggedIn: true }
    }

    return { isLoggedIn: false }
  }

  async openLoginPage(page: Page): Promise<void> {
    await page.goto(MP_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT })
  }

  async publish(page: Page, options: TransformedPublishOptions, onProgress: ProgressCallback): Promise<PublishResult> {
    let titleSet = false
    let contentSet = false

    try {
      // 1. Navigate to new article page
      onProgress('navigating', 40)
      await page.goto(`${MP_URL}/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&type=77`, {
        waitUntil: 'networkidle2',
        timeout: TIMEOUT,
      })

      // Wait for editor to load
      const titleSelector = '#title, .article-title input, [id*="title"], input[placeholder*="标题"], [name="title"]'
      await page.waitForSelector(titleSelector, { timeout: TIMEOUT })

      // 2. Set title
      onProgress('filling-title', 50)
      try {
        await page.click(titleSelector, { clickCount: 3 })
        await page.type(titleSelector, options.title)
        titleSet = true
      } catch (err) {
        logger.warn('WeChat: failed to set title:', err)
      }

      // 3. Inject HTML content into the editor
      onProgress('injecting-content', 60)
      const editorSelector = [
        '#edui1_contentplaceholder',
        '.edui-body-container',
        '.ProseMirror',
        '[data-testid="editor"]',
        '[contenteditable="true"]',
      ].join(', ')
      await page.waitForSelector(editorSelector, { timeout: TIMEOUT })

      try {
        await page.evaluate(
          (selector: string, html: string) => {
            const editor = document.querySelector(selector)
            if (editor) {
              editor.innerHTML = html
              editor.dispatchEvent(new Event('input', { bubbles: true }))
            }
          },
          editorSelector,
          options.html
        )
        contentSet = true
      } catch (err) {
        logger.warn('WeChat: failed to inject content:', err)
      }

      // 4. Set summary if available
      if (options.summary) {
        onProgress('setting-summary', 70)
        try {
          const digestSelector = '#js_description, textarea[name="digest"], [id*="digest"]'
          const digestEl = await page.$(digestSelector)
          if (digestEl) {
            await digestEl.click({ clickCount: 3 })
            await digestEl.type(options.summary)
          }
        } catch {
          logger.warn('WeChat: could not set summary')
        }
      }

      // 5. Save as draft (safer than direct publish)
      onProgress('saving-draft', 85)
      let saved = false
      try {
        await page.waitForSelector('#js_send, .weui-desktop-btn_primary, .weui-desktop-btn_default, button', { timeout: 5000 })

        // Prefer "save draft" button
        let draftBtn = await page.$('.weui-desktop-btn_default')
        if (!draftBtn) {
          draftBtn = await findByText(page, 'button', '保存草稿')
        }
        if (draftBtn) {
          await draftBtn.click()
          saved = true
        } else {
          // Fallback: try any save/publish button
          const saveBtn = await findFirstMatch(page, ['#js_send', '.weui-desktop-btn_primary'])
            || await findByText(page, 'button', '保存')
            || await findByText(page, 'button', '发表')
          if (saveBtn) {
            await saveBtn.click()
            saved = true
          }
        }
      } catch {
        logger.warn('WeChat: save button not found, article may still be in editor')
      }

      onProgress('done', 100)

      // Only report success if critical steps succeeded
      if (!contentSet) {
        return {
          platform: 'wechat',
          success: false,
          error: 'Failed to inject article content into editor',
        }
      }

      const finalUrl = page.url()
      return {
        platform: 'wechat',
        success: true,
        url: finalUrl,
        publishedAt: new Date().toISOString(),
      }
    } catch (err: any) {
      logger.error('WeChat publish failed:', err)
      return {
        platform: 'wechat',
        success: false,
        error: err.message || 'WeChat publish failed',
      }
    }
  }
}
