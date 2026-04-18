import { useState, useRef, useEffect } from 'react'
import type { AnnotationTool } from '@shared/types/pdf-meta'
import { useI18n } from '../../../i18n'

// ---- Inline SVG Icons ----

function ZoomInIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  )
}

function ZoomOutIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  )
}

function TagIconInline({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  )
}

// Cursor / pointer icon
function CursorIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
      <path d="M13 13l6 6" />
    </svg>
  )
}

// Highlight icon (marker pen)
function HighlightIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

// Underline icon
function UnderlineIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
      <line x1="4" y1="21" x2="20" y2="21" />
    </svg>
  )
}

// Note / sticky note icon
function NoteIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
      <path d="M15 3v4a2 2 0 0 0 2 2h4" />
    </svg>
  )
}

// Text / type icon
function TextIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  )
}

// Area / rectangle select icon
function AreaIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" />
    </svg>
  )
}

// Ink / pen icon
function InkIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  )
}

// Eraser icon
function EraserIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14.8 1.4c.8-.8 2-.8 2.8 0l5 5c.8.8.8 2 0 2.8L11 20" />
      <path d="M6 11l4 4" />
    </svg>
  )
}

// ---- Color Picker ----

const ANNOTATION_COLORS = [
  { color: '#ffeb3b', label: 'Yellow' },
  { color: '#4caf50', label: 'Green' },
  { color: '#42a5f5', label: 'Blue' },
  { color: '#f48fb1', label: 'Pink' },
  { color: '#ff5722', label: 'Red' },
  { color: '#ff9800', label: 'Orange' }
]

function ColorPicker({
  activeColor,
  onColorChange
}: {
  activeColor: string
  onColorChange: (color: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`${btnBase} ${btnDefault} gap-1`}
        title="Color"
      >
        <div
          className="h-3.5 w-3.5 rounded-sm border border-black/20"
          style={{ backgroundColor: activeColor }}
        />
        <svg width={8} height={8} viewBox="0 0 8 8" fill="currentColor">
          <path d="M1 3l3 3 3-3z" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-1.5 shadow-lg">
          {ANNOTATION_COLORS.map(({ color, label }) => (
            <button
              key={color}
              onClick={() => {
                onColorChange(color)
                setOpen(false)
              }}
              title={label}
              className="flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-100 hover:scale-110"
              style={{ backgroundColor: color }}
            >
              {color === activeColor && (
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Component ----

// Sparkles icon for AI buttons
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

// Note + sparkles icon for Notes AI
function NoteAiInline({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
      <path d="M15 3v4a2 2 0 0 0 2 2h4" />
      <path d="m10 13 2-2 2 2" />
    </svg>
  )
}

interface PDFToolbarProps {
  numPages: number
  scale: number
  onScaleChange: (scale: number) => void
  activeTool: AnnotationTool
  onToolChange: (tool: AnnotationTool) => void
  activeColor: string
  onColorChange: (color: string) => void
  onToggleTags: () => void
  showTagEditor: boolean
  onSummarizePdf?: () => void
  onSummarizeNotes?: () => void
  extracting?: boolean
  hasAnnotations?: boolean
}

const MIN_SCALE = 0.4
const MAX_SCALE = 3.0
const SCALE_STEP = 0.2

const btnBase =
  'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all duration-150'
const btnDefault =
  'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
const btnActive =
  'text-[var(--color-accent)] bg-[var(--color-accent-light)]'

const TOOLS: Array<{ tool: AnnotationTool; Icon: React.FC<{ size?: number }>; labelKey: string; descKey: string }> = [
  { tool: 'cursor', Icon: CursorIcon, labelKey: 'pdf.tool.cursor', descKey: 'pdf.tool.cursor.desc' },
  { tool: 'highlight', Icon: HighlightIcon, labelKey: 'pdf.tool.highlight', descKey: 'pdf.tool.highlight.desc' },
  { tool: 'underline', Icon: UnderlineIcon, labelKey: 'pdf.tool.underline', descKey: 'pdf.tool.underline.desc' },
  { tool: 'note', Icon: NoteIcon, labelKey: 'pdf.tool.note', descKey: 'pdf.tool.note.desc' },
  { tool: 'text', Icon: TextIcon, labelKey: 'pdf.tool.text', descKey: 'pdf.tool.text.desc' },
  { tool: 'area', Icon: AreaIcon, labelKey: 'pdf.tool.area', descKey: 'pdf.tool.area.desc' },
  { tool: 'ink', Icon: InkIcon, labelKey: 'pdf.tool.ink', descKey: 'pdf.tool.ink.desc' },
  { tool: 'eraser', Icon: EraserIcon, labelKey: 'pdf.tool.eraser', descKey: 'pdf.tool.eraser.desc' }
]

function PDFToolbar({
  numPages,
  scale,
  onScaleChange,
  activeTool,
  onToolChange,
  activeColor,
  onColorChange,
  onToggleTags,
  showTagEditor,
  onSummarizePdf,
  onSummarizeNotes,
  extracting,
  hasAnnotations
}: PDFToolbarProps) {
  const { t } = useI18n()

  const handleZoomOut = () => {
    const next = Math.max(MIN_SCALE, Math.round((scale - SCALE_STEP) * 10) / 10)
    onScaleChange(next)
  }

  const handleZoomIn = () => {
    const next = Math.min(MAX_SCALE, Math.round((scale + SCALE_STEP) * 10) / 10)
    onScaleChange(next)
  }

  return (
    <div className="flex items-center border-b border-[var(--color-border)] px-3 py-1 gap-1">
      {/* Zoom controls */}
      <button
        onClick={handleZoomOut}
        disabled={scale <= MIN_SCALE}
        className={`${btnBase} ${btnDefault} disabled:opacity-30 disabled:cursor-not-allowed`}
        title={t('pdf.zoomOut') || 'Zoom out'}
      >
        <ZoomOutIcon size={14} />
      </button>

      <span className="min-w-[3rem] text-center text-xs font-medium text-[var(--color-text-secondary)] select-none">
        {Math.round(scale * 100)}%
      </span>

      <button
        onClick={handleZoomIn}
        disabled={scale >= MAX_SCALE}
        className={`${btnBase} ${btnDefault} disabled:opacity-30 disabled:cursor-not-allowed`}
        title={t('pdf.zoomIn') || 'Zoom in'}
      >
        <ZoomInIcon size={14} />
      </button>

      {/* Page count */}
      <span className="ml-1 text-xs text-[var(--color-text-muted)] select-none">
        {numPages} {t('pdf.pages') || 'pages'}
      </span>

      {/* Separator */}
      <div className="mx-1.5 h-4 w-px bg-[var(--color-border)]" />

      {/* Annotation tool buttons */}
      {TOOLS.map(({ tool, Icon, labelKey, descKey }) => (
        <button
          key={tool}
          onClick={() => onToolChange(tool)}
          className={`${btnBase} ${activeTool === tool ? btnActive : btnDefault}`}
          title={`${t(labelKey) || tool} — ${t(descKey) || ''}`}
        >
          <Icon size={14} />
        </button>
      ))}

      {/* Separator */}
      <div className="mx-1.5 h-4 w-px bg-[var(--color-border)]" />

      {/* Color picker */}
      <ColorPicker activeColor={activeColor} onColorChange={onColorChange} />

      {/* Spacer */}
      <div className="flex-1" />

      {/* AI Quick Actions */}
      <button
        onClick={onSummarizePdf}
        disabled={extracting}
        className={`${btnBase} ${btnDefault} disabled:opacity-40 disabled:cursor-not-allowed`}
        title={t('pdf.ai.summarize') || 'Summarize PDF'}
      >
        <SparklesInline size={14} />
        {extracting ? (t('pdf.ai.extracting') || 'Extracting...') : (t('pdf.ai.summarize') || 'Summarize')}
      </button>

      {hasAnnotations && (
        <button
          onClick={onSummarizeNotes}
          className={`${btnBase} ${btnDefault}`}
          title={t('pdf.ai.summarizeNotes') || 'Summarize Notes'}
        >
          <NoteAiInline size={14} />
          {t('pdf.ai.summarizeNotes') || 'Notes AI'}
        </button>
      )}

      {/* Separator */}
      <div className="mx-1.5 h-4 w-px bg-[var(--color-border)]" />

      {/* Tag toggle */}
      <button
        onClick={onToggleTags}
        className={`${btnBase} ${showTagEditor ? btnActive : btnDefault}`}
        title={t('pdf.tags') || 'Tags'}
      >
        <TagIconInline size={14} />
        {t('pdf.tags') || 'Tags'}
      </button>
    </div>
  )
}

export default PDFToolbar
