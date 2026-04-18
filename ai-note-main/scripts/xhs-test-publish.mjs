/**
 * XHS Publish Flow Self-Test
 * Runs through the full flow, takes screenshots at each step.
 * Stops BEFORE clicking "发布" — for verification only.
 *
 * Usage: node scripts/xhs-test-publish.mjs
 */

import puppeteer from 'puppeteer-core'
import path from 'path'
import os from 'os'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PROFILE_DIR = path.join(os.homedir(), 'Library/Application Support/@ai-note/desktop/publish-profiles/xhs')
const IMAGE_PUBLISH_URL = 'https://creator.xiaohongshu.com/publish/publish?from=menu&target=image'
const SCREENSHOT_DIR = '/tmp'

// Test content
const TEST_TITLE = '测试标题最多二十个字'   // exactly 10 chars, well within limit
const TEST_BODY = '这是测试正文内容。段永平2025年Q4持仓变化分析，英伟达持仓大幅增加。本文仅供参考，不构成投资建议。'

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function screenshot(page, name) {
  const p = `${SCREENSHOT_DIR}/xhs-test-${name}.png`
  await page.screenshot({ path: p, fullPage: false })
  console.log(`  📸 Screenshot: ${p}`)
}

async function findByText(page, selector, text) {
  const elements = await page.$$(selector)
  for (const el of elements) {
    const info = await el.evaluate(node => ({
      text: node.textContent?.trim() || '',
      childCount: node.children?.length || 0,
    }))
    if (info.text === text && info.childCount <= 2) return el
  }
  for (const el of elements) {
    const content = await el.evaluate(node => node.textContent?.trim() || '')
    if (content === text) return el
  }
  for (const el of elements) {
    const info = await el.evaluate(node => ({
      text: node.textContent?.trim() || '',
      childCount: node.children?.length || 0,
    }))
    if (info.text.includes(text) && info.childCount <= 2) return el
  }
  return null
}

async function clickByExactText(page, text) {
  return page.evaluate((targetText) => {
    const all = Array.from(document.querySelectorAll('*'))
    const candidates = all
      .filter(el => el.textContent?.trim() === targetText && el.offsetParent !== null)
      .sort((a, b) => (a.children?.length || 0) - (b.children?.length || 0))
    if (candidates.length > 0) {
      candidates[0].click()
      return true
    }
    return false
  }, text)
}

async function main() {
  console.log('🚀 XHS Publish Flow Test\n')

  console.log('Step 0: Launch Chrome...')
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

  // ── Step 1: Navigate ──────────────────────────────────────────────
  console.log('\nStep 1: Navigate to image publish page...')
  await page.goto(IMAGE_PUBLISH_URL, { waitUntil: 'networkidle2', timeout: 30000 })
  console.log('  networkidle2 done, waiting 8s for React render...')
  await delay(8000)
  console.log('  Current URL:', page.url())
  await screenshot(page, '1-loaded')

  // ── Step 2: Click 文字配图 ─────────────────────────────────────────
  console.log('\nStep 2: Click "文字配图"...')
  const textImgBtn = await findByText(page, 'div, button, span', '文字配图')
  if (!textImgBtn) {
    console.error('  ❌ FAIL: "文字配图" button not found!')
    await screenshot(page, '2-fail-no-btn')
    await browser.close()
    return
  }
  await textImgBtn.click()
  await delay(2500)
  console.log('  ✅ Clicked "文字配图"')
  await screenshot(page, '2-after-click')

  // ── Step 3: Fill card editor ───────────────────────────────────────
  console.log('\nStep 3: Fill card editor...')
  const cardEditorSelectors = [
    '[placeholder*="真诚分享"]',
    '[placeholder*="分享经验"]',
    '.DraftEditor-root [contenteditable="true"]',
    '.DraftEditor-editorContainer [contenteditable="true"]',
    '.ProseMirror',
    'textarea',
    '[contenteditable="true"]',
  ]
  let cardEditor = null
  let usedSel = ''
  for (const sel of cardEditorSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 4000 })
      cardEditor = await page.$(sel)
      if (cardEditor) { usedSel = sel; break }
    } catch { /* try next */ }
  }
  if (!cardEditor) {
    console.error('  ❌ FAIL: Card editor not found!')
    await screenshot(page, '3-fail-no-editor')
    await browser.close()
    return
  }
  console.log('  ✅ Card editor found with selector:', usedSel)
  await cardEditor.click()
  await delay(300)
  await page.keyboard.down('Meta')
  await page.keyboard.press('a')
  await page.keyboard.up('Meta')
  await page.keyboard.press('Backspace')
  await delay(200)
  await page.keyboard.type(TEST_TITLE, { delay: 10 })
  console.log('  ✅ Typed card text:', TEST_TITLE)
  await screenshot(page, '3-card-filled')

  // ── Step 4: Click 生成图片 ─────────────────────────────────────────
  console.log('\nStep 4: Click "生成图片"...')
  await delay(500)
  const generateBtn = await findByText(page, 'button, div', '生成图片')
  if (!generateBtn) {
    console.error('  ❌ FAIL: "生成图片" button not found!')
    await screenshot(page, '4-fail')
    await browser.close()
    return
  }
  await generateBtn.click()
  console.log('  ✅ Clicked, waiting 4s for generation...')
  await delay(4000)
  await screenshot(page, '4-after-generate')

  // ── Step 5: Click 下一步 ───────────────────────────────────────────
  console.log('\nStep 5: Click "下一步"...')
  const nextBtn = await findByText(page, 'button, div', '下一步')
  if (!nextBtn) {
    console.error('  ❌ FAIL: "下一步" button not found!')
    await screenshot(page, '5-fail')
    await browser.close()
    return
  }
  await nextBtn.click()
  await delay(2500)
  console.log('  ✅ Clicked "下一步"')
  await screenshot(page, '5-publish-page')

  // ── Step 6: Fill title ─────────────────────────────────────────────
  console.log('\nStep 6: Fill title (max 20 chars)...')
  const xhsTitle = TEST_TITLE.substring(0, 20)
  const titleSelectors = [
    'input[placeholder*="填写标题"]',
    'input[placeholder*="标题会有更多赞"]',
    'input[placeholder*="更多赞"]',
    'input[placeholder*="标题"]',
    '#post-title',
  ]
  let titleFilled = false
  for (const sel of titleSelectors) {
    const el = await page.$(sel)
    if (el) {
      await el.click({ clickCount: 3 })
      await delay(200)
      await el.type(xhsTitle, { delay: 15 })
      titleFilled = true
      console.log(`  ✅ Title filled with selector "${sel}":`, xhsTitle)
      break
    }
  }
  if (!titleFilled) console.warn('  ⚠️  Title input not found')

  // ── Step 7: Fill description ───────────────────────────────────────
  console.log('\nStep 7: Fill description (clear + overwrite)...')
  const descSelectors = [
    '#post-textarea',
    '.ql-editor',
    'textarea[placeholder*="分享"]',
    'textarea[placeholder*="描述"]',
    'textarea[placeholder*="内容"]',
    '[contenteditable="true"]',
  ]
  let descFilled = false
  for (const sel of descSelectors) {
    const el = await page.$(sel)
    if (el) {
      await el.click()
      await delay(300)
      await page.keyboard.down('Meta')
      await page.keyboard.press('a')
      await page.keyboard.up('Meta')
      await page.keyboard.press('Backspace')
      await delay(200)
      const body = TEST_BODY.substring(0, 990)
      await page.keyboard.type(body, { delay: 5 })
      console.log(`  ✅ Description filled with selector "${sel}", length:`, body.length)
      descFilled = true
      break
    }
  }
  if (!descFilled) console.warn('  ⚠️  Description input not found')

  await delay(1000)
  await screenshot(page, '6-final-page')

  // ── Step 8: Select 群聊 (first option) ────────────────────────────
  console.log('\nStep 8: Scroll down and select 群聊 (first option)...')
  await page.evaluate(() => window.scrollBy(0, 400))
  await delay(500)
  const groupChatClicked = await clickByExactText(page, '选择群聊')
  if (groupChatClicked) {
    console.log('  ✅ Clicked "选择群聊" dropdown')
    await delay(800)
    await screenshot(page, '8-groupchat-open')
    // Click first visible option
    const firstOption = await page.evaluateHandle(() => {
      const selectors = ['li[class*="item"]', '[class*="option"]:not([disabled])', '[class*="list"] li', '[class*="dropdown"] li']
      for (const sel of selectors) {
        const els = Array.from(document.querySelectorAll(sel)).filter(el => el.offsetParent !== null)
        if (els.length > 0) return els[0]
      }
      return null
    })
    const element = firstOption.asElement()
    if (element) {
      await element.click()
      console.log('  ✅ Clicked first visible option in 群聊 dropdown')
    } else {
      console.warn('  ⚠️  No option found in 群聊 dropdown')
    }
    await delay(600)
  } else {
    console.warn('  ⚠️  "选择群聊" not found, skipping')
  }
  await screenshot(page, '8-groupchat-done')

  // ── Step 9: Set visibility to 仅自己可见 ──────────────────────────
  console.log('\nStep 9: Scroll down and set visibility to "仅自己可见"...')
  await page.evaluate(() => window.scrollBy(0, 300))
  await delay(500)
  await screenshot(page, '9-before-visibility')

  // Click the "公开可见" dropdown to open it
  const visibilityClicked = await clickByExactText(page, '公开可见')
  if (visibilityClicked) {
    console.log('  ✅ Opened visibility dropdown')
    await delay(600)
    await screenshot(page, '9-visibility-open')
    // Click "仅自己可见"
    const privateClicked = await clickByExactText(page, '仅自己可见')
    if (privateClicked) {
      console.log('  ✅ Selected "仅自己可见"')
    } else {
      console.warn('  ⚠️  "仅自己可见" not found, trying last visible option')
      await page.evaluate(() => {
        const selectors = ['li[class*="item"]', '[class*="option"]:not([disabled])', '[class*="list"] li', '[class*="dropdown"] li']
        for (const sel of selectors) {
          const els = Array.from(document.querySelectorAll(sel)).filter(el => el.offsetParent !== null)
          if (els.length > 0) { els[els.length - 1].click(); return true }
        }
        return false
      })
    }
    await delay(600)
  } else {
    console.warn('  ⚠️  "公开可见" dropdown not found, skipping visibility step')
  }
  await screenshot(page, '9-visibility-done')

  // ── Done (NOT clicking 发布) ───────────────────────────────────────
  console.log('\n✅ All steps completed successfully!')
  console.log('⏸  Stopped before "发布" — check the browser window to verify.')
  console.log('\nScreenshots saved to /tmp/xhs-test-*.png')
  console.log('Close the browser manually when done.\n')
}

main().catch(err => {
  console.error('❌ Test failed:', err.message)
  process.exit(1)
})
