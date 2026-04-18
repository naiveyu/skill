import { useMemo } from 'react'
import { useI18n } from '../../i18n'

interface Heading {
  level: number
  text: string
  line: number
}

interface HeadingOutlineProps {
  content: string
  onHeadingClick: (line: number, index: number) => void
}

function parseHeadings(content: string): Heading[] {
  const headings: Heading[] = []
  const lines = content.split('\n')
  let inFrontMatter = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip YAML front matter
    if (i === 0 && line.trim() === '---') {
      inFrontMatter = true
      continue
    }
    if (inFrontMatter) {
      if (line.trim() === '---') inFrontMatter = false
      continue
    }

    // Match markdown headings
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].replace(/\s*#+\s*$/, '').trim(), // Remove trailing #
        line: i + 1 // 1-based line number
      })
    }
  }

  return headings
}

function HeadingOutline({ content, onHeadingClick }: HeadingOutlineProps) {
  const { t } = useI18n()
  const headings = useMemo(() => parseHeadings(content), [content])

  if (headings.length === 0) {
    return (
      <div className="h-full w-48 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-3">
        <div className="mb-2 text-xs font-semibold uppercase text-[var(--color-text-muted)]">
          {t('editor.outline')}
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">{t('editor.outlineEmpty')}</p>
      </div>
    )
  }

  // Find min heading level for relative indentation
  const minLevel = Math.min(...headings.map((h) => h.level))

  return (
    <div className="h-full w-48 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-y-auto thin-scrollbar">
      <div className="px-3 py-2 text-xs font-semibold uppercase text-[var(--color-text-muted)]">
        {t('editor.outline')}
      </div>
      <div className="flex flex-col pb-2">
        {headings.map((heading, idx) => {
          const indent = (heading.level - minLevel) * 12
          return (
            <button
              key={idx}
              onClick={() => onHeadingClick(heading.line, idx)}
              className="flex items-start px-3 py-1 text-left text-xs text-[var(--color-text-secondary)]
                         hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]
                         transition-colors duration-100 truncate"
              style={{ paddingLeft: `${12 + indent}px` }}
              title={heading.text}
            >
              <span className="truncate">{heading.text}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default HeadingOutline
