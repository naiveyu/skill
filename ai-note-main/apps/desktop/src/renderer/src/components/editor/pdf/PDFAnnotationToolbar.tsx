import { useEffect, useRef } from 'react'
import { useI18n } from '../../../i18n'

interface PDFAnnotationToolbarProps {
  position: { x: number; y: number }
  onHighlight: (color: string) => void
  onAddNote: () => void
  onAskAi?: () => void
  onDismiss: () => void
}

const HIGHLIGHT_COLORS = [
  { color: '#ffeb3b', label: 'Yellow' },
  { color: '#4caf50', label: 'Green' },
  { color: '#42a5f5', label: 'Blue' },
  { color: '#f48fb1', label: 'Pink' }
]

function SparklesInline({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  )
}

function NoteIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
      <path d="M15 3v4a2 2 0 0 0 2 2h4" />
    </svg>
  )
}

function PDFAnnotationToolbar({
  position,
  onHighlight,
  onAddNote,
  onAskAi,
  onDismiss
}: PDFAnnotationToolbarProps) {
  const { t } = useI18n()
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Click outside to dismiss
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onDismiss()
      }
    }

    // Delay attaching so the current mouseup doesn't immediately dismiss
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 50)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onDismiss])

  return (
    <div
      ref={toolbarRef}
      className="pdf-annotation-toolbar"
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 30
      }}
    >
      <div
        className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1.5 shadow-lg"
        style={{ whiteSpace: 'nowrap' }}
      >
        {/* Color buttons */}
        {HIGHLIGHT_COLORS.map(({ color, label }) => (
          <button
            key={color}
            onClick={() => onHighlight(color)}
            title={`Highlight ${label}`}
            className="flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-100 hover:scale-110"
            style={{ backgroundColor: color }}
          >
            <span className="sr-only">Highlight {label}</span>
          </button>
        ))}

        {/* Divider */}
        <div
          className="mx-1"
          style={{
            width: 1,
            height: 20,
            backgroundColor: 'var(--color-border)'
          }}
        />

        {/* Add note button */}
        <button
          onClick={onAddNote}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors duration-150"
          title="Add note"
        >
          <NoteIcon size={13} />
          Note
        </button>

        {/* Divider */}
        <div
          className="mx-1"
          style={{
            width: 1,
            height: 20,
            backgroundColor: 'var(--color-border)'
          }}
        />

        {/* Ask AI button */}
        <button
          onClick={onAskAi}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-accent)] transition-colors duration-150"
          title={t('pdf.ai.askAi') || 'Ask AI'}
        >
          <SparklesInline size={13} />
          AI
        </button>
      </div>
    </div>
  )
}

export default PDFAnnotationToolbar
