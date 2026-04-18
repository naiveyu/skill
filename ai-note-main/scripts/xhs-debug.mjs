/**
 * XHS Publisher Debug Script
 * Usage: node scripts/xhs-debug.mjs
 *
 * Opens the XHS creator image-publish page in a visible Chrome window,
 * waits 8 seconds for you to see the page, then dumps:
 *   - All clickable text on the page
 *   - Screenshot saved to /tmp/xhs-debug.png
 *   - All button/tab/div texts
 */

import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'
import os from 'os'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PROFILE_DIR = path.join(os.homedir(), 'Library/Application Support/@ai-note/desktop/publish-profiles/xhs')
const IMAGE_PUBLISH_URL = 'https://creator.xiaohongshu.com/publish/publish?from=menu&target=image'

async function main() {
  console.log('Launching Chrome...')
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    userDataDir: PROFILE_DIR,
    headless: false,
    defaultViewport: null,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
    ],
  })

  const page = await browser.newPage()

  console.log('Navigating to:', IMAGE_PUBLISH_URL)
  await page.goto(IMAGE_PUBLISH_URL, { waitUntil: 'networkidle2', timeout: 30000 })

  console.log('Waiting 8s for React SPA to fully render...')
  await new Promise(r => setTimeout(r, 8000))

  // Screenshot at multiple points
  await page.screenshot({ path: '/tmp/xhs-debug-1.png', fullPage: false })
  console.log('Screenshot 1 saved: /tmp/xhs-debug-1.png')

  const currentUrl = page.url()
  console.log('\n=== Current URL ===')
  console.log(currentUrl)

  // Take screenshot
  const screenshotPath = '/tmp/xhs-debug.png'
  await page.screenshot({ path: screenshotPath, fullPage: false })
  console.log('\n=== Screenshot saved to', screenshotPath)

  // Dump all visible text nodes (short, leaf elements)
  const texts = await page.evaluate(() => {
    const results = []
    const all = document.querySelectorAll('button, [role="tab"], [role="button"], a, div[class*="tab"], span[class*="tab"], div[class*="btn"], span[class*="btn"]')
    for (const el of all) {
      const text = el.textContent?.trim()
      const visible = el.offsetParent !== null
      if (text && text.length < 30 && visible) {
        results.push({
          tag: el.tagName,
          text,
          class: el.className?.toString().substring(0, 60),
        })
      }
    }
    return results
  })

  console.log('\n=== Visible Clickable Elements ===')
  const seen = new Set()
  for (const t of texts) {
    const key = t.tag + ':' + t.text
    if (!seen.has(key)) {
      seen.add(key)
      console.log(`[${t.tag}] "${t.text}" | class: ${t.class}`)
    }
  }

  // Specifically look for any element containing 文字
  const wenziEls = await page.evaluate(() => {
    const results = []
    const all = document.querySelectorAll('*')
    for (const el of all) {
      const text = el.textContent?.trim()
      if (text && text.includes('文字') && el.children.length <= 3 && el.offsetParent !== null) {
        results.push({
          tag: el.tagName,
          text: text.substring(0, 50),
          class: el.className?.toString().substring(0, 80),
        })
      }
    }
    return results.slice(0, 20)
  })

  console.log('\n=== Elements containing "文字" ===')
  for (const e of wenziEls) {
    console.log(`[${e.tag}] "${e.text}" | class: ${e.class}`)
  }

  // Look for "配图" elements
  const peituEls = await page.evaluate(() => {
    const results = []
    const all = document.querySelectorAll('*')
    for (const el of all) {
      const text = el.textContent?.trim()
      if (text && text.includes('配图') && el.children.length <= 3 && el.offsetParent !== null) {
        results.push({
          tag: el.tagName,
          text: text.substring(0, 50),
          class: el.className?.toString().substring(0, 80),
        })
      }
    }
    return results.slice(0, 20)
  })

  console.log('\n=== Elements containing "配图" ===')
  for (const e of peituEls) {
    console.log(`[${e.tag}] "${e.text}" | class: ${e.class}`)
  }

  // All visible text on page (short strings)
  const allText = await page.evaluate(() => {
    const results = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim()
      const parent = node.parentElement
      if (text && text.length > 1 && text.length < 20 && parent && parent.offsetParent !== null) {
        results.push(text)
      }
    }
    return [...new Set(results)]
  })

  console.log('\n=== All visible short text nodes on page ===')
  console.log(allText.join(' | '))

  console.log('\n=== Done. Chrome stays open — close manually when done. ===')
  // Don't close — let user inspect
}

main().catch(console.error)
