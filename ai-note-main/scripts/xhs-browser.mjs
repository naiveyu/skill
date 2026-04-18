/**
 * XHS Browser Controller — stateless multi-command Puppeteer driver.
 *
 * Each invocation connects to an existing Chrome instance (via remote-debugging-port)
 * OR starts a fresh one. Chrome stays alive between invocations (disconnect, not close).
 *
 * Usage:
 *   node scripts/xhs-browser.mjs <command> [args...]
 *
 * Commands:
 *   navigate <url>             Navigate to URL, wait networkidle2 + 8s
 *   screenshot                 Take screenshot → /tmp/xhs-screen.png
 *   click-text <text>          Find visible element with exact text and click it
 *   click-selector <sel>       Click first element matching CSS selector
 *   click-first-visible <sel>  Click first visible element matching selector
 *   click-last-visible <sel>   Click last visible element matching selector
 *   type <text...>             Type text (args joined with space)
 *   type-file <path>           Type content read from a file (safe for long/special text)
 *   select-all                 Cmd+A (macOS) / Ctrl+A (other)
 *   key <key>                  Press a single key (e.g. Backspace, Enter, Tab)
 *   scroll <pixels>            Scroll page down by N pixels (negative = up)
 *   close                      Close Chrome
 *
 * Output: JSON to stdout — { ok, screenshot?, url?, error? }
 */

import puppeteer from 'puppeteer-core'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'

const CDP_PORT = 9223
const CHROME_PATHS = {
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  linux: '/usr/bin/google-chrome-stable',
}
const PROFILE_DIR = path.join(
  os.homedir(),
  process.platform === 'darwin'
    ? 'Library/Application Support/@ai-note/desktop/publish-profiles/xhs'
    : '.config/@ai-note/desktop/publish-profiles/xhs'
)
const SCREENSHOT_PATH = '/tmp/xhs-screen.png'
const ACTION_DELAY = 800

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function connectOrLaunch() {
  // Try to connect to an existing Chrome debug session
  try {
    const browser = await puppeteer.connect({
      browserURL: `http://localhost:${CDP_PORT}`,
      defaultViewport: null,
    })
    return { browser, fresh: false }
  } catch {
    // No existing session — launch a new Chrome
    const executablePath = CHROME_PATHS[process.platform] || CHROME_PATHS.linux
    const browser = await puppeteer.launch({
      executablePath,
      userDataDir: PROFILE_DIR,
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        `--remote-debugging-port=${CDP_PORT}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
      ],
    })
    return { browser, fresh: true }
  }
}

async function getPage(browser) {
  const pages = await browser.pages()
  return pages[pages.length - 1] || (await browser.newPage())
}

async function snap(page) {
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false })
  // Resize to 1600px wide if any dimension exceeds 2000px (macOS sips)
  try {
    const info = execSync(`sips -g pixelWidth -g pixelHeight "${SCREENSHOT_PATH}" 2>/dev/null`).toString()
    const w = parseInt(info.match(/pixelWidth:\s*(\d+)/)?.[1] || '0')
    const h = parseInt(info.match(/pixelHeight:\s*(\d+)/)?.[1] || '0')
    if (w > 2000 || h > 2000) {
      execSync(`sips --resampleWidth 1600 "${SCREENSHOT_PATH}" 2>/dev/null`)
    }
  } catch {
    // sips not available (non-macOS), skip resize
  }
  return SCREENSHOT_PATH
}

// ── Main ─────────────────────────────────────────────────────────────────────

const [, , cmd, ...args] = process.argv

async function main() {
  const { browser } = await connectOrLaunch()
  const page = await getPage(browser)

  try {
    switch (cmd) {
      // ── navigate ────────────────────────────────────────────────────────
      case 'navigate': {
        const url = args[0]
        if (!url) throw new Error('navigate requires a URL argument')
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
        // XHS is a heavy React SPA — wait for full render
        await delay(8000)
        const s = await snap(page)
        console.log(JSON.stringify({ ok: true, screenshot: s, url: page.url() }))
        break
      }

      // ── screenshot ──────────────────────────────────────────────────────
      case 'screenshot': {
        const s = await snap(page)
        console.log(JSON.stringify({ ok: true, screenshot: s, url: page.url() }))
        break
      }

      // ── click-text ──────────────────────────────────────────────────────
      case 'click-text': {
        const text = args.join(' ')
        const clicked = await page.evaluate((t) => {
          const all = Array.from(document.querySelectorAll('*'))
          const candidates = all
            .filter((el) => {
              const visible = el.offsetParent !== null
              const exact = el.textContent?.trim() === t
              return visible && exact
            })
            .sort((a, b) => (a.children?.length || 0) - (b.children?.length || 0))
          if (candidates.length > 0) {
            candidates[0].click()
            return true
          }
          return false
        }, text)
        await delay(ACTION_DELAY)
        const s = await snap(page)
        console.log(JSON.stringify({ ok: clicked, screenshot: s, url: page.url() }))
        break
      }

      // ── click-selector ──────────────────────────────────────────────────
      case 'click-selector': {
        const sel = args[0]
        if (!sel) throw new Error('click-selector requires a CSS selector')
        try {
          await page.waitForSelector(sel, { timeout: 5000 })
          const el = await page.$(sel)
          if (el) {
            await el.evaluate((n) => n.scrollIntoView({ block: 'center' }))
            await delay(200)
            await el.click()
            await delay(ACTION_DELAY)
          }
          const s = await snap(page)
          console.log(JSON.stringify({ ok: !!el, screenshot: s, url: page.url() }))
        } catch (e) {
          const s = await snap(page)
          console.log(JSON.stringify({ ok: false, error: e.message, screenshot: s }))
        }
        break
      }

      // ── type ─────────────────────────────────────────────────────────────
      case 'type': {
        const text = args.join(' ')
        await page.keyboard.type(text, { delay: 10 })
        await delay(300)
        const s = await snap(page)
        console.log(JSON.stringify({ ok: true, screenshot: s }))
        break
      }

      // ── type-file ────────────────────────────────────────────────────────
      // Reads text from a file — avoids shell escaping issues with long/Chinese content
      case 'type-file': {
        const filePath = args[0]
        if (!filePath) throw new Error('type-file requires a file path')
        const text = (await fs.readFile(filePath, 'utf8')).trim()
        await page.keyboard.type(text, { delay: 8 })
        await delay(300)
        const s = await snap(page)
        console.log(JSON.stringify({ ok: true, screenshot: s, length: text.length }))
        break
      }

      // ── select-all ───────────────────────────────────────────────────────
      case 'select-all': {
        const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'
        await page.keyboard.down(modifier)
        await page.keyboard.press('a')
        await page.keyboard.up(modifier)
        await delay(200)
        const s = await snap(page)
        console.log(JSON.stringify({ ok: true, screenshot: s }))
        break
      }

      // ── key ──────────────────────────────────────────────────────────────
      case 'key': {
        const key = args[0]
        if (!key) throw new Error('key requires a key name (e.g. Backspace)')
        await page.keyboard.press(key)
        await delay(300)
        const s = await snap(page)
        console.log(JSON.stringify({ ok: true, screenshot: s }))
        break
      }

      // ── close ────────────────────────────────────────────────────────────
      case 'close': {
        await browser.close()
        console.log(JSON.stringify({ ok: true }))
        return // skip disconnect below
      }

      // ── scroll ───────────────────────────────────────────────────────────
      // scroll <pixels>  — scroll page down by N pixels (negative = up)
      case 'scroll': {
        const px = parseInt(args[0] || '400', 10)
        await page.evaluate((y) => {
          // Try scrolling all scrollable containers, then fallback to window
          const scrolled = Array.from(document.querySelectorAll('*')).filter(el => {
            const st = window.getComputedStyle(el)
            return (st.overflow === 'auto' || st.overflow === 'scroll' ||
                    st.overflowY === 'auto' || st.overflowY === 'scroll') &&
                   el.scrollHeight > el.clientHeight + 10
          })
          if (scrolled.length > 0) {
            // Sort by scroll area size and pick the largest one (likely the main form)
            scrolled.sort((a, b) => b.scrollHeight - a.scrollHeight)
            scrolled[0].scrollBy(0, y)
          } else {
            window.scrollBy(0, y)
          }
        }, px)
        await delay(400)
        const s = await snap(page)
        console.log(JSON.stringify({ ok: true, screenshot: s }))
        break
      }

      // ── click-first-visible ──────────────────────────────────────────────
      // After a dropdown opens, click the first visible item matching selector
      case 'click-first-visible': {
        const sel = args[0]
        if (!sel) throw new Error('click-first-visible requires a CSS selector')
        try {
          await page.waitForSelector(sel, { timeout: 3000 })
          const el = await page.$(sel)
          if (el) {
            await el.evaluate((n) => n.scrollIntoView({ block: 'nearest' }))
            await delay(200)
            await el.click()
            await delay(600)
          }
          const s = await snap(page)
          console.log(JSON.stringify({ ok: !!el, screenshot: s }))
        } catch (e) {
          const s = await snap(page)
          console.log(JSON.stringify({ ok: false, error: e.message, screenshot: s }))
        }
        break
      }

      // ── click-last-visible ───────────────────────────────────────────────
      // After a dropdown opens, click the LAST visible item matching selector
      case 'click-last-visible': {
        const sel = args[0]
        if (!sel) throw new Error('click-last-visible requires a CSS selector')
        try {
          await page.waitForSelector(sel, { timeout: 3000 })
          const el = await page.evaluate((selector) => {
            const all = Array.from(document.querySelectorAll(selector))
            const visible = all.filter((n) => n.offsetParent !== null)
            if (visible.length === 0) return false
            const last = visible[visible.length - 1]
            last.scrollIntoView({ block: 'nearest' })
            last.click()
            return true
          }, sel)
          await delay(600)
          const s = await snap(page)
          console.log(JSON.stringify({ ok: el, screenshot: s }))
        } catch (e) {
          const s = await snap(page)
          console.log(JSON.stringify({ ok: false, error: e.message, screenshot: s }))
        }
        break
      }

      // ── evaluate ─────────────────────────────────────────────────────────
      // evaluate <js>  — evaluate JavaScript expression in page, return result
      case 'evaluate': {
        const js = args.join(' ')
        if (!js) throw new Error('evaluate requires a JavaScript expression')
        try {
          const result = await page.evaluate(new Function(`return (${js})()`))
          await delay(400)
          const s = await snap(page)
          console.log(JSON.stringify({ ok: true, result, screenshot: s }))
        } catch (e) {
          const s = await snap(page)
          console.log(JSON.stringify({ ok: false, error: e.message, screenshot: s }))
        }
        break
      }

      // ── scroll-to-text ───────────────────────────────────────────────────
      // scroll-to-text <text>  — scroll the element containing text into view and click
      case 'scroll-to-text': {
        const text = args.join(' ')
        const clicked = await page.evaluate((t) => {
          const all = Array.from(document.querySelectorAll('*'))
          const el = all.find(el => {
            const ownText = Array.from(el.childNodes)
              .filter(n => n.nodeType === Node.TEXT_NODE)
              .map(n => n.textContent.trim())
              .join('')
            return ownText === t || el.textContent?.trim() === t
          })
          if (el) {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' })
            setTimeout(() => el.click(), 500)
            return true
          }
          return false
        }, text)
        await delay(800)
        const s = await snap(page)
        console.log(JSON.stringify({ ok: clicked, screenshot: s }))
        break
      }

      default:
        console.log(JSON.stringify({ ok: false, error: `Unknown command: ${cmd}` }))
    }
  } finally {
    // Disconnect without killing Chrome — keeps the session alive for next command
    if (cmd !== 'close') {
      try {
        await browser.disconnect()
      } catch {
        // already disconnected
      }
    }
  }
}

main().catch((err) => {
  console.log(JSON.stringify({ ok: false, error: err.message }))
  process.exit(1)
})
