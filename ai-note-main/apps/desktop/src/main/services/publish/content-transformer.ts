import { marked } from 'marked'
import matter from 'gray-matter'
import path from 'path'

export class ContentTransformer {
  // Strip YAML front matter, return body only
  stripFrontMatter(markdown: string): string {
    const { content } = matter(markdown)
    return content.trim()
  }

  // Extract front matter data
  extractFrontMatter(markdown: string): { title?: string; tags?: string[] } {
    const { data } = matter(markdown)
    return {
      title: data.title,
      tags: Array.isArray(data.tags) ? data.tags : [],
    }
  }

  // Markdown → HTML (for WeChat)
  toHtml(markdown: string): string {
    const body = this.stripFrontMatter(markdown)
    return marked.parse(body, { async: false }) as string
  }

  // Markdown → plain text (strip markdown syntax)
  toPlainText(markdown: string): string {
    const body = this.stripFrontMatter(markdown)
    return this.markdownToPlain(body)
  }

  // Strip markdown syntax from raw text
  private markdownToPlain(text: string): string {
    return text
      // Remove fenced code blocks (```lang\n...\n```)
      .replace(/```[\s\S]*?```/g, '')
      // Remove headings markers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic markers
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
      .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove links, keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      // Remove blockquote markers
      .replace(/^>\s+/gm, '')
      // Remove horizontal rules
      .replace(/^[-*]{3,}$/gm, '')
      // Remove list item markers (-, *, +, 1.)
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      // Collapse multiple blank lines
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  /**
   * Parse markdown into structured sections: title + body.
   * Supports two formats:
   *   1. "## 标题\n<title>\n## 正文|内容\n<body>" — returns title & body separately
   *   2. "# <title>\n<body>" or plain markdown — uses first heading as title, rest as body
   */
  parseSections(markdown: string): { title: string; body: string } {
    const content = this.stripFrontMatter(markdown)

    // Format 1: "# 标题" heading (any level) + "# 内容/正文" heading — line-scan approach
    const lines = content.split('\n')
    let titleHeadingIdx = -1
    let bodyHeadingIdx = -1
    for (let i = 0; i < lines.length; i++) {
      if (/^#{1,6}\s*标题\s*$/.test(lines[i])) titleHeadingIdx = i
      if (/^#{1,6}\s*(?:正文|内容)\s*$/.test(lines[i])) bodyHeadingIdx = i
    }
    if (titleHeadingIdx !== -1 && bodyHeadingIdx !== -1) {
      // Title: first non-empty line after "# 标题"
      let title = ''
      for (let i = titleHeadingIdx + 1; i < lines.length; i++) {
        if (lines[i].trim()) { title = lines[i].trim(); break }
      }
      // Body: everything after "# 内容"
      const bodyRaw = lines.slice(bodyHeadingIdx + 1).join('\n')
      return {
        title,
        body: this.markdownToPlain(bodyRaw),
      }
    }

    // Format 2: first # heading as title, rest as body
    const h1Match = content.match(/^#\s+(.+)$/m)
    if (h1Match) {
      const titleLine = h1Match[0]
      const body = content.replace(titleLine, '').trim()
      return {
        title: h1Match[1].trim(),
        body: this.markdownToPlain(body),
      }
    }

    // Format 3: front matter title
    const fm = this.extractFrontMatter(markdown)
    if (fm.title) {
      return {
        title: fm.title,
        body: this.markdownToPlain(content),
      }
    }

    // Fallback: no structured title
    return {
      title: '',
      body: this.markdownToPlain(content),
    }
  }

  // Generate a summary from the first paragraph or N chars
  generateSummary(markdown: string, maxLength = 120): string {
    const { body } = this.parseSections(markdown)
    const plain = body || this.toPlainText(markdown)
    // Take first paragraph
    const firstParagraph = plain.split(/\n\n/)[0] || plain
    if (firstParagraph.length <= maxLength) return firstParagraph
    return firstParagraph.slice(0, maxLength - 3) + '...'
  }

  // Extract image paths from markdown
  extractImages(markdown: string, workspacePath: string): string[] {
    const body = this.stripFrontMatter(markdown)
    const imageRegex = /!\[[^\]]*\]\(([^)]+)\)/g
    const images: string[] = []
    let match: RegExpExecArray | null

    while ((match = imageRegex.exec(body)) !== null) {
      const imgPath = match[1]
      // Skip external URLs
      if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) continue
      // Resolve relative path
      images.push(path.resolve(workspacePath, imgPath))
    }

    return images
  }
}
