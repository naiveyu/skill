/**
 * One-shot: connect to running Chrome, click the first visible item in any open dropdown
 */
import puppeteer from 'puppeteer-core'

const browser = await puppeteer.connect({ browserURL: 'http://localhost:9223', defaultViewport: null })
const pages = await browser.pages()
const page = pages[pages.length - 1]

const result = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('*'))
  // Find visible dropdown/popup containers
  const containers = all.filter(el => {
    if (!el.offsetParent) return false
    const cls = (el.className || '') + ''
    return cls.includes('dropdown') || cls.includes('popper') || cls.includes('popup') || cls.includes('option-list') || cls.includes('select-panel')
  })
  for (const c of containers) {
    const items = Array.from(c.querySelectorAll('li, [class*="item"]:not([class*="container"])'))
      .filter(el => el.offsetParent !== null)
    if (items.length > 0) {
      items[0].click()
      return { found: true, text: items[0].textContent.trim().substring(0, 30) }
    }
  }
  return { found: false }
})

await new Promise(r => setTimeout(r, 600))
await page.screenshot({ path: '/tmp/xhs-screen.png' })
console.log(JSON.stringify(result))
await browser.disconnect()
