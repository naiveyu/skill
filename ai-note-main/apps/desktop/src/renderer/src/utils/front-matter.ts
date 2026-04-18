/**
 * Separate YAML front matter from markdown body.
 */
export function splitFrontMatter(content: string): {
  frontMatter: string | null
  body: string
} {
  const match = content.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n?)/)
  if (match) {
    return {
      frontMatter: match[1],
      body: content.slice(match[1].length)
    }
  }
  return { frontMatter: null, body: content }
}

/**
 * Re-join front matter and body.
 */
export function joinFrontMatter(frontMatter: string | null, body: string): string {
  if (!frontMatter) return body
  const normalized = frontMatter.endsWith('\n') ? frontMatter : frontMatter + '\n'
  return normalized + body
}
