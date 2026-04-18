import { useState, useRef, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { PdfAnnotation, AnnotationTool } from '@shared/types/pdf-meta'
import PDFAnnotationToolbar from './PDFAnnotationToolbar'

interface PDFAnnotationLayerProps {
  pageIndex: number
  scale: number
  activeTool: AnnotationTool
  activeColor: string
  annotations: PdfAnnotation[]
  onAddAnnotation: (annotation: PdfAnnotation) => void
  onUpdateAnnotation: (id: string, changes: Partial<PdfAnnotation>) => void
  onDeleteAnnotation: (id: string) => void
  onAskAi?: (text: string) => void
}

// ---- Helpers ----

function getSelectionRects(container: HTMLElement) {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || !selection.toString().trim()) return null

  const containerRect = container.getBoundingClientRect()
  const text = selection.toString().trim()
  const rects: Array<{ x: number; y: number; w: number; h: number }> = []
  let minTop = Infinity
  let firstRectLeft = 0

  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i)
    const clientRects = range.getClientRects()
    for (let j = 0; j < clientRects.length; j++) {
      const r = clientRects[j]
      rects.push({
        x: (r.left - containerRect.left) / containerRect.width,
        y: (r.top - containerRect.top) / containerRect.height,
        w: r.width / containerRect.width,
        h: r.height / containerRect.height
      })
      if (r.top < minTop) {
        minTop = r.top
        firstRectLeft = r.left
      }
    }
  }

  if (rects.length === 0) return null
  return {
    rects,
    text,
    toolbarPos: {
      x: Math.max(0, firstRectLeft - containerRect.left),
      y: Math.max(0, minTop - containerRect.top - 44)
    }
  }
}

function toSvgPath(points: Array<{ x: number; y: number }>, w: number, h: number) {
  if (points.length === 0) return ''
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x * w} ${p.y * h}`).join(' ')
}

// ---- Component ----

function PDFAnnotationLayer({
  pageIndex,
  scale,
  activeTool,
  activeColor,
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onAskAi
}: PDFAnnotationLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // ---- Cursor mode: floating toolbar ----
  const [showToolbar, setShowToolbar] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 })
  const [selectionRects, setSelectionRects] = useState<
    Array<{ x: number; y: number; w: number; h: number }>
  >([])
  const [selectedText, setSelectedText] = useState('')

  // ---- Editor popup (note / text / area comment) ----
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [editingType, setEditingType] = useState<'note' | 'text' | 'area'>('note')

  // ---- Area/Ink preview (render-only state) ----
  const [areaPreview, setAreaPreview] = useState<{
    x: number; y: number; w: number; h: number
  } | null>(null)
  const [inkPreview, setInkPreview] = useState<Array<{ x: number; y: number }>>([])

  // ---- Cleanup window listeners on unmount ----
  const dragCleanupRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    return () => { dragCleanupRef.current?.() }
  }, [])

  // ============================================================
  // Parent mouseup: cursor / highlight / underline
  // Uses a ref so the native listener always reads latest props
  // ============================================================
  const selectionHandlerRef = useRef<() => void>(() => {})

  selectionHandlerRef.current = () => {
    const container = containerRef.current
    if (!container) return
    const result = getSelectionRects(container)
    if (!result) return

    if (activeTool === 'cursor') {
      setSelectionRects(result.rects)
      setSelectedText(result.text)
      setToolbarPosition(result.toolbarPos)
      setShowToolbar(true)
    } else if (activeTool === 'highlight' || activeTool === 'underline') {
      const now = Date.now()
      onAddAnnotation({
        id: uuidv4(),
        type: activeTool,
        page: pageIndex,
        rects: result.rects,
        color: activeColor,
        selectedText: result.text,
        comment: '',
        createdAt: now,
        updatedAt: now
      })
      window.getSelection()?.removeAllRanges()
    }
  }

  useEffect(() => {
    if (activeTool !== 'cursor' && activeTool !== 'highlight' && activeTool !== 'underline') return

    const container = containerRef.current
    if (!container) return
    const parent = container.parentElement
    if (!parent) return

    const handler = () => selectionHandlerRef.current()
    parent.addEventListener('mouseup', handler)
    return () => parent.removeEventListener('mouseup', handler)
  }, [activeTool])

  // ============================================================
  // Container click → note / text placement
  // ============================================================
  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (editingId) return
      if (e.target !== e.currentTarget) return
      if (activeTool !== 'note' && activeTool !== 'text') return

      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const pos = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height
      }
      const now = Date.now()
      const id = uuidv4()

      if (activeTool === 'note') {
        onAddAnnotation({
          id,
          type: 'note',
          page: pageIndex,
          position: pos,
          content: '',
          color: activeColor,
          createdAt: now,
          updatedAt: now
        })
      } else {
        onAddAnnotation({
          id,
          type: 'text',
          page: pageIndex,
          position: pos,
          content: '',
          color: activeColor,
          fontSize: 12,
          createdAt: now,
          updatedAt: now
        })
      }

      setEditingId(id)
      setEditingContent('')
      setEditingType(activeTool as 'note' | 'text')
    },
    [editingId, activeTool, activeColor, pageIndex, onAddAnnotation]
  )

  // ============================================================
  // Container mousedown → area drag / ink draw
  // Attaches window listeners inline to avoid stale closures
  // ============================================================
  const handleContainerMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (editingId) return
      if (e.target !== e.currentTarget) return

      const container = containerRef.current
      if (!container) return
      const containerRect = container.getBoundingClientRect()

      // ---- Area tool: drag to select rectangle ----
      if (activeTool === 'area') {
        e.preventDefault()
        const start = {
          x: (e.clientX - containerRect.left) / containerRect.width,
          y: (e.clientY - containerRect.top) / containerRect.height
        }
        setAreaPreview({ x: start.x, y: start.y, w: 0, h: 0 })

        const onMove = (me: MouseEvent) => {
          const end = {
            x: (me.clientX - containerRect.left) / containerRect.width,
            y: (me.clientY - containerRect.top) / containerRect.height
          }
          setAreaPreview({
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            w: Math.abs(end.x - start.x),
            h: Math.abs(end.y - start.y)
          })
        }

        const onUp = (me: MouseEvent) => {
          cleanup()
          const end = {
            x: (me.clientX - containerRect.left) / containerRect.width,
            y: (me.clientY - containerRect.top) / containerRect.height
          }
          const x = Math.min(start.x, end.x)
          const y = Math.min(start.y, end.y)
          const w = Math.abs(end.x - start.x)
          const h = Math.abs(end.y - start.y)
          setAreaPreview(null)

          if (w > 0.01 && h > 0.01) {
            const now = Date.now()
            const id = uuidv4()
            onAddAnnotation({
              id,
              type: 'area',
              page: pageIndex,
              rect: { x, y, w, h },
              comment: '',
              color: activeColor,
              createdAt: now,
              updatedAt: now
            })
            setEditingId(id)
            setEditingContent('')
            setEditingType('area')
          }
        }

        const cleanup = () => {
          window.removeEventListener('mousemove', onMove)
          window.removeEventListener('mouseup', onUp)
          dragCleanupRef.current = null
        }
        dragCleanupRef.current = cleanup
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
      }

      // ---- Ink tool: freehand drawing ----
      if (activeTool === 'ink') {
        e.preventDefault()
        const startPoint = {
          x: (e.clientX - containerRect.left) / containerRect.width,
          y: (e.clientY - containerRect.top) / containerRect.height
        }
        const path = [startPoint]
        setInkPreview([startPoint])

        const onMove = (me: MouseEvent) => {
          const point = {
            x: (me.clientX - containerRect.left) / containerRect.width,
            y: (me.clientY - containerRect.top) / containerRect.height
          }
          path.push(point)
          setInkPreview([...path])
        }

        const onUp = () => {
          cleanup()
          setInkPreview([])

          if (path.length >= 2) {
            const now = Date.now()
            onAddAnnotation({
              id: uuidv4(),
              type: 'ink',
              page: pageIndex,
              paths: [path],
              color: activeColor,
              strokeWidth: 2,
              createdAt: now,
              updatedAt: now
            })
          }
        }

        const cleanup = () => {
          window.removeEventListener('mousemove', onMove)
          window.removeEventListener('mouseup', onUp)
          dragCleanupRef.current = null
        }
        dragCleanupRef.current = cleanup
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
      }
    },
    [editingId, activeTool, activeColor, pageIndex, onAddAnnotation]
  )

  // ============================================================
  // Cursor toolbar actions
  // ============================================================
  const dismissToolbar = useCallback(() => {
    setShowToolbar(false)
    setSelectionRects([])
    setSelectedText('')
    window.getSelection()?.removeAllRanges()
  }, [])

  const handleHighlight = useCallback(
    (color: string) => {
      if (selectionRects.length === 0 || !selectedText) return
      const now = Date.now()
      onAddAnnotation({
        id: uuidv4(),
        type: 'highlight',
        page: pageIndex,
        rects: selectionRects,
        color,
        selectedText,
        comment: '',
        createdAt: now,
        updatedAt: now
      })
      dismissToolbar()
    },
    [pageIndex, selectionRects, selectedText, onAddAnnotation, dismissToolbar]
  )

  const handleAddNoteFromToolbar = useCallback(() => {
    if (selectionRects.length === 0) return
    const firstRect = selectionRects[0]
    const now = Date.now()
    onAddAnnotation({
      id: uuidv4(),
      type: 'note',
      page: pageIndex,
      position: { x: firstRect.x, y: firstRect.y },
      content: selectedText || '',
      color: '#ffeb3b',
      createdAt: now,
      updatedAt: now
    })
    dismissToolbar()
  }, [pageIndex, selectionRects, selectedText, onAddAnnotation, dismissToolbar])

  const handleAskAi = useCallback(() => {
    if (!selectedText) return
    onAskAi?.(selectedText)
    dismissToolbar()
  }, [selectedText, onAskAi, dismissToolbar])

  // ============================================================
  // Editor popup
  // ============================================================
  const handleSaveEditor = useCallback(() => {
    if (!editingId) return
    if (editingType === 'note' || editingType === 'text') {
      onUpdateAnnotation(editingId, { content: editingContent })
    } else if (editingType === 'area') {
      onUpdateAnnotation(editingId, { comment: editingContent } as Partial<PdfAnnotation>)
    }
    setEditingId(null)
    setEditingContent('')
  }, [editingId, editingContent, editingType, onUpdateAnnotation])

  const handleOpenEditor = useCallback((ann: PdfAnnotation) => {
    if (ann.type === 'note' || ann.type === 'text') {
      setEditingId(ann.id)
      setEditingContent(ann.content)
      setEditingType(ann.type)
    } else if (ann.type === 'area') {
      setEditingId(ann.id)
      setEditingContent(ann.comment)
      setEditingType('area')
    }
  }, [])

  // ============================================================
  // Pointer events / cursor based on tool
  // ============================================================
  const needsPointerEvents =
    activeTool === 'note' ||
    activeTool === 'text' ||
    activeTool === 'area' ||
    activeTool === 'ink' ||
    activeTool === 'eraser'

  const cursorStyle =
    activeTool === 'ink' || activeTool === 'area'
      ? 'crosshair'
      : activeTool === 'note' || activeTool === 'text'
        ? 'cell'
        : activeTool === 'eraser'
          ? 'pointer'
          : undefined

  // ============================================================
  // Render
  // ============================================================
  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: needsPointerEvents ? 'auto' : 'none',
        zIndex: 10,
        cursor: cursorStyle
      }}
      onClick={handleContainerClick}
      onMouseDown={handleContainerMouseDown}
    >
      {/* ======== Highlight annotations ======== */}
      {annotations
        .filter((a) => a.type === 'highlight')
        .map((ann) =>
          ann.type === 'highlight'
            ? ann.rects.map((rect, i) => (
                <div
                  key={`${ann.id}-${i}`}
                  style={{
                    position: 'absolute',
                    left: `${rect.x * 100}%`,
                    top: `${rect.y * 100}%`,
                    width: `${rect.w * 100}%`,
                    height: `${rect.h * 100}%`,
                    backgroundColor: ann.color,
                    opacity: 0.35,
                    pointerEvents: 'auto',
                    cursor: activeTool === 'eraser' ? 'pointer' : 'default',
                    borderRadius: 2,
                    mixBlendMode: 'multiply',
                    transition: 'opacity 150ms ease'
                  }}
                  title={ann.selectedText}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (activeTool === 'eraser') {
                      onDeleteAnnotation(ann.id)
                    }
                  }}
                />
              ))
            : null
        )}

      {/* ======== Underline annotations ======== */}
      {annotations
        .filter((a) => a.type === 'underline')
        .map((ann) =>
          ann.type === 'underline'
            ? ann.rects.map((rect, i) => (
                <div
                  key={`${ann.id}-${i}`}
                  style={{
                    position: 'absolute',
                    left: `${rect.x * 100}%`,
                    top: `${(rect.y + rect.h) * 100 - 0.3}%`,
                    width: `${rect.w * 100}%`,
                    height: '2px',
                    backgroundColor: ann.color,
                    pointerEvents: 'auto',
                    cursor: activeTool === 'eraser' ? 'pointer' : 'default',
                    transition: 'opacity 150ms ease'
                  }}
                  title={ann.selectedText}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (activeTool === 'eraser') {
                      onDeleteAnnotation(ann.id)
                    }
                  }}
                />
              ))
            : null
        )}

      {/* ======== Note pin annotations ======== */}
      {annotations
        .filter((a) => a.type === 'note')
        .map((ann) =>
          ann.type === 'note' ? (
            <div
              key={ann.id}
              style={{
                position: 'absolute',
                left: `${ann.position.x * 100}%`,
                top: `${ann.position.y * 100}%`,
                width: 20,
                height: 20,
                borderRadius: '50% 50% 50% 0',
                backgroundColor: ann.color,
                transform: 'rotate(-45deg)',
                pointerEvents: 'auto',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                zIndex: 11,
                transition: 'transform 150ms ease'
              }}
              title={ann.content}
              onClick={(e) => {
                e.stopPropagation()
                if (activeTool === 'eraser') {
                  onDeleteAnnotation(ann.id)
                } else {
                  handleOpenEditor(ann)
                }
              }}
            />
          ) : null
        )}

      {/* ======== Text label annotations ======== */}
      {annotations
        .filter((a) => a.type === 'text')
        .map((ann) =>
          ann.type === 'text' ? (
            <div
              key={ann.id}
              style={{
                position: 'absolute',
                left: `${ann.position.x * 100}%`,
                top: `${ann.position.y * 100}%`,
                pointerEvents: 'auto',
                cursor: 'pointer',
                zIndex: 11,
                maxWidth: '40%'
              }}
              title={ann.content}
              onClick={(e) => {
                e.stopPropagation()
                if (activeTool === 'eraser') {
                  onDeleteAnnotation(ann.id)
                } else {
                  handleOpenEditor(ann)
                }
              }}
            >
              <div
                style={{
                  backgroundColor: ann.color,
                  color: '#333',
                  fontSize: ann.fontSize * scale,
                  padding: '2px 6px',
                  borderRadius: 4,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 160,
                  lineHeight: 1.4
                }}
              >
                {ann.content
                  ? ann.content.length > 8
                    ? ann.content.slice(0, 8) + '\u2026'
                    : ann.content
                  : '\u2026'}
              </div>
            </div>
          ) : null
        )}

      {/* ======== Area annotations ======== */}
      {annotations
        .filter((a) => a.type === 'area')
        .map((ann) =>
          ann.type === 'area' ? (
            <div
              key={ann.id}
              style={{
                position: 'absolute',
                left: `${ann.rect.x * 100}%`,
                top: `${ann.rect.y * 100}%`,
                width: `${ann.rect.w * 100}%`,
                height: `${ann.rect.h * 100}%`,
                border: `2px dashed ${ann.color}`,
                backgroundColor: `${ann.color}15`,
                pointerEvents: 'auto',
                cursor: 'pointer',
                borderRadius: 2,
                transition: 'opacity 150ms ease'
              }}
              title={ann.comment || 'Area selection'}
              onClick={(e) => {
                e.stopPropagation()
                if (activeTool === 'eraser') {
                  onDeleteAnnotation(ann.id)
                } else {
                  handleOpenEditor(ann)
                }
              }}
            >
              {ann.comment && (
                <div
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: ann.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    zIndex: 12
                  }}
                >
                  <svg width={10} height={10} viewBox="0 0 24 24" fill="white" stroke="none">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
              )}
            </div>
          ) : null
        )}

      {/* ======== Ink annotations (SVG) ======== */}
      {annotations.filter((a) => a.type === 'ink').length > 0 && (
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: activeTool === 'eraser' ? 'auto' : 'none',
            zIndex: 11
          }}
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
        >
          {annotations
            .filter((a) => a.type === 'ink')
            .map((ann) =>
              ann.type === 'ink'
                ? ann.paths.map((path, pi) => (
                    <path
                      key={`${ann.id}-${pi}`}
                      d={toSvgPath(path, 1000, 1000)}
                      stroke={ann.color}
                      strokeWidth={ann.strokeWidth * scale}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        cursor: activeTool === 'eraser' ? 'pointer' : undefined,
                        pointerEvents: activeTool === 'eraser' ? 'stroke' : 'none'
                      }}
                      onClick={(e) => {
                        if (activeTool === 'eraser') {
                          e.stopPropagation()
                          onDeleteAnnotation(ann.id)
                        }
                      }}
                    />
                  ))
                : null
            )}
        </svg>
      )}

      {/* ======== Current ink stroke preview ======== */}
      {inkPreview.length > 1 && (
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 12
          }}
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
        >
          <path
            d={toSvgPath(inkPreview, 1000, 1000)}
            stroke={activeColor}
            strokeWidth={2 * scale}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.7}
          />
        </svg>
      )}

      {/* ======== Area drag preview ======== */}
      {areaPreview && (
        <div
          style={{
            position: 'absolute',
            left: `${areaPreview.x * 100}%`,
            top: `${areaPreview.y * 100}%`,
            width: `${areaPreview.w * 100}%`,
            height: `${areaPreview.h * 100}%`,
            border: `2px dashed ${activeColor}`,
            backgroundColor: `${activeColor}20`,
            pointerEvents: 'none',
            borderRadius: 2,
            zIndex: 15
          }}
        />
      )}

      {/* ======== Cursor mode: selection toolbar ======== */}
      {showToolbar && activeTool === 'cursor' && (
        <div style={{ pointerEvents: 'auto' }}>
          <PDFAnnotationToolbar
            position={toolbarPosition}
            onHighlight={handleHighlight}
            onAddNote={handleAddNoteFromToolbar}
            onAskAi={handleAskAi}
            onDismiss={dismissToolbar}
          />
        </div>
      )}

      {/* ======== Editor popup (note / text / area) ======== */}
      {editingId && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'auto',
            zIndex: 20
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 shadow-xl"
            style={{ width: 280 }}
          >
            <textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              className="w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              rows={4}
              placeholder={
                editingType === 'note'
                  ? 'Enter note...'
                  : editingType === 'text'
                    ? 'Enter text...'
                    : 'Enter comment...'
              }
              autoFocus
            />
            <div className="mt-2 flex justify-between">
              <button
                onClick={() => {
                  onDeleteAnnotation(editingId)
                  setEditingId(null)
                  setEditingContent('')
                }}
                className="rounded-md px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors duration-150"
              >
                Delete
              </button>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setEditingId(null)
                    setEditingContent('')
                  }}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditor}
                  className="rounded-md bg-[var(--color-accent)] px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 transition-opacity duration-150"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PDFAnnotationLayer
