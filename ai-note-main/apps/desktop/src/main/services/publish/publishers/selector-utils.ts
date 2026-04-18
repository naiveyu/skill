import type { Page, ElementHandle } from 'puppeteer-core'

/**
 * Find the first element matching a CSS selector whose textContent matches the given text.
 * Prefers leaf elements (fewer children) and exact matches to avoid matching parent containers.
 * Puppeteer-compatible replacement for Playwright's `:has-text()`.
 */
export async function findByText(
  page: Page,
  cssSelector: string,
  text: string
): Promise<ElementHandle<Element> | null> {
  const elements = await page.$$(cssSelector)

  // Pass 1: exact text match on leaf-ish elements (≤2 children)
  for (const el of elements) {
    const info = await el.evaluate((node) => ({
      text: node.textContent?.trim() || '',
      childCount: node.children?.length || 0,
    }))
    if (info.text === text && info.childCount <= 2) return el
  }

  // Pass 2: exact text match on any element
  for (const el of elements) {
    const content = await el.evaluate((node) => node.textContent?.trim() || '')
    if (content === text) return el
  }

  // Pass 3: includes match on leaf-ish elements
  for (const el of elements) {
    const info = await el.evaluate((node) => ({
      text: node.textContent?.trim() || '',
      childCount: node.children?.length || 0,
    }))
    if (info.text.includes(text) && info.childCount <= 2) return el
  }

  return null
}

/**
 * Click an element found by exact text using page.evaluate (most reliable for tabs/nav).
 * Finds the most specific (fewest children) visible element with exact text match.
 */
export async function clickByExactText(page: Page, text: string): Promise<boolean> {
  return page.evaluate((targetText: string) => {
    const all = Array.from(document.querySelectorAll('*'))
    const candidates = all
      .filter((el) => el.textContent?.trim() === targetText && (el as HTMLElement).offsetParent !== null)
      .sort((a, b) => (a.children?.length || 0) - (b.children?.length || 0))
    if (candidates.length > 0) {
      ;(candidates[0] as HTMLElement).click()
      return true
    }
    return false
  }, text)
}

/**
 * Find the first element matching ANY of the given selectors.
 * Tries each selector in order, returns the first match.
 */
export async function findFirstMatch(
  page: Page,
  selectors: string[]
): Promise<ElementHandle<Element> | null> {
  for (const selector of selectors) {
    const el = await page.$(selector)
    if (el) return el
  }
  return null
}
