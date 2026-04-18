import { useEffect, useRef, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

interface MarkdownPreviewProps {
  content: string
  scrollTo?: number
  onScroll?: (scrollFraction: number) => void
}

function MarkdownPreview({ content, scrollTo, onScroll }: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isProgrammaticScroll = useRef(false)

  // Strip YAML front matter (---\n...\n---) from content
  const markdownContent = useMemo(() => {
    return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
  }, [content])

  // Sync scroll position from the source editor
  useEffect(() => {
    const el = containerRef.current
    if (!el || scrollTo === undefined) return

    const maxScroll = el.scrollHeight - el.clientHeight
    if (maxScroll <= 0) return

    const targetTop = scrollTo * maxScroll
    if (Math.abs(el.scrollTop - targetTop) < 1) return

    isProgrammaticScroll.current = true
    el.scrollTop = targetTop
    requestAnimationFrame(() => {
      isProgrammaticScroll.current = false
    })
  }, [scrollTo])

  // Report scroll events to parent
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleScroll = () => {
      if (isProgrammaticScroll.current) return
      if (!onScroll) return
      const { scrollTop, scrollHeight, clientHeight } = el
      const maxScroll = scrollHeight - clientHeight
      const fraction = maxScroll > 0 ? scrollTop / maxScroll : 0
      onScroll(fraction)
    }

    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [onScroll])

  return (
    <div ref={containerRef} className="h-full w-full overflow-y-auto thin-scrollbar p-6">
      <div className="editor-content mx-auto max-w-[800px]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {markdownContent}
        </ReactMarkdown>
      </div>
    </div>
  )
}

export default MarkdownPreview
