import { useState, useEffect, useRef, useCallback } from 'react'
import { createReactBlockSpec } from '@blocknote/react'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw'

// Lazy-load Excalidraw to avoid bundle bloat
let ExcalidrawComponent: React.ComponentType<any> | null = null
let ExcalidrawMainMenu: React.ComponentType<any> & { DefaultItems?: any; Item?: any; Separator?: any } | null = null
let exportToSvgFn: ((opts: any) => Promise<SVGSVGElement>) | null = null

async function loadExcalidraw() {
  if (ExcalidrawComponent) return
  await import('@excalidraw/excalidraw/index.css')
  const mod = await import('@excalidraw/excalidraw')
  ExcalidrawComponent = mod.Excalidraw
  ExcalidrawMainMenu = mod.MainMenu
  exportToSvgFn = mod.exportToSvg
}

const MIN_CANVAS_HEIGHT = 300
const DEFAULT_CANVAS_HEIGHT = 480
const MIN_THUMBNAIL_HEIGHT = 80
const DEFAULT_THUMBNAIL_HEIGHT = 200

interface DrawingBlockViewProps {
  src: string
  height: string
  editor: any
  block: any
}

function DrawingBlockView({ src, height, editor, block }: DrawingBlockViewProps) {
  const [expanded, setExpanded] = useState(false)
  const [excalidrawLoaded, setExcalidrawLoaded] = useState(false)
  const [initialData, setInitialData] = useState<any>(null)
  const [thumbnailSvg, setThumbnailSvg] = useState<string>('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'new'>('new')
  const [fileError, setFileError] = useState(false)
  const persistedHeight = height ? parseInt(height, 10) : 0
  const [canvasHeight, setCanvasHeight] = useState(
    persistedHeight >= MIN_CANVAS_HEIGHT ? persistedHeight : DEFAULT_CANVAS_HEIGHT
  )
  const thumbnailHeight = persistedHeight || DEFAULT_THUMBNAIL_HEIGHT
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const containerRef = useRef<HTMLDivElement>(null)
  const isNewBlock = useRef(!src)
  const isReadyForSave = useRef(false)
  const isSavingRef = useRef(false)
  const srcRef = useRef(src)
  srcRef.current = src
  // Capture latest scene data from onChange for reliable saving (deep-cloned)
  const sceneDataRef = useRef<{ elements: any; appState: any; files: any } | null>(null)

  // Clean up orphaned drawing files when block is removed (Backspace, undo, etc.)
  useEffect(() => {
    const currentSrc = src
    return () => {
      if (!currentSrc) return
      // Delay check to let editor state settle after block removal
      setTimeout(() => {
        try {
          const blocks = editor.document
          const stillExists = blocks.some(
            (b: any) => b.type === 'drawing' && b.props?.src === currentSrc
          )
          if (!stillExists) {
            window.electronAPI.file.deleteDrawing(currentSrc)
          }
        } catch {
          // Editor may be destroyed (note switch) — don't clean up
        }
      }, 200)
    }
  }, [src, editor])

  // Load thumbnail SVG on mount
  useEffect(() => {
    if (!src) return
    loadThumbnail()
  }, [src]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadThumbnail() {
    try {
      const svgContent = await window.electronAPI.file.readDrawing(src + '.svg')
      if (svgContent) {
        setThumbnailSvg(svgContent)
        setSaveStatus('saved')
        return
      }
      const data = await window.electronAPI.file.readDrawing(src)
      if (!data) {
        setFileError(true)
        return
      }
      setSaveStatus('saved')
    } catch {
      setFileError(true)
    }
  }

  const handleExpand = useCallback(async () => {
    if (expanded || fileError) return
    if (!excalidrawLoaded) {
      await loadExcalidraw()
      setExcalidrawLoaded(true)
    }
    if (src) {
      const data = await window.electronAPI.file.readDrawing(src)
      if (data) {
        try {
          const parsed = JSON.parse(data)
          parsed.scrollToContent = true
          setInitialData(parsed)
        } catch {
          setInitialData(null)
        }
      }
    }
    isReadyForSave.current = false
    setExpanded(true)
  }, [expanded, excalidrawLoaded, src, fileError])

  // Auto-expand new blocks immediately
  useEffect(() => {
    if (isNewBlock.current && src) {
      isNewBlock.current = false
      handleExpand()
    }
  }, [src, handleExpand])

  // Stable save function — uses sceneDataRef captured from onChange
  const doSave = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent saves
    if (isSavingRef.current) return true
    isSavingRef.current = true

    const currentSrc = srcRef.current
    const scene = sceneDataRef.current
    if (!currentSrc || !scene) {
      console.warn('[DrawingBlock] doSave skipped: src=', currentSrc, 'scene=', !!scene)
      isSavingRef.current = false
      return false
    }

    try {
      const { elements, appState, files } = scene

      // Filter to non-deleted elements only
      const activeElements = (Array.from(elements || []) as any[]).filter(
        (el: any) => !el.isDeleted
      )

      const data = {
        type: 'excalidraw',
        version: 2,
        source: 'ai-note',
        elements: activeElements,
        appState: {
          viewBackgroundColor: appState?.viewBackgroundColor || 'transparent',
          gridSize: appState?.gridSize ?? null
        },
        files: files instanceof Map ? Object.fromEntries(files) : (files || {})
      }

      const jsonStr = JSON.stringify(data, null, 2)
      let ok = await window.electronAPI.file.saveDrawing(currentSrc, jsonStr)

      // Auto-retry once on failure (may be transient FS issue)
      if (!ok) {
        console.warn('[DrawingBlock] saveDrawing failed, retrying in 500ms:', currentSrc)
        await new Promise(r => setTimeout(r, 500))
        ok = await window.electronAPI.file.saveDrawing(currentSrc, jsonStr)
      }

      if (!ok) {
        console.error('[DrawingBlock] IPC saveDrawing returned false for:', currentSrc)
        isSavingRef.current = false
        return false
      }

      // Generate and save SVG thumbnail
      if (exportToSvgFn && activeElements.length) {
        try {
          const svg = await exportToSvgFn({
            elements: activeElements,
            appState: { ...appState, exportBackground: false },
            files: files || {}
          })
          const svgString = new XMLSerializer().serializeToString(svg)
          setThumbnailSvg(svgString)
          await window.electronAPI.file.saveDrawingThumbnail(currentSrc, svgString)
        } catch { /* thumbnail generation is non-critical */ }
      }
      isSavingRef.current = false
      return true
    } catch (err) {
      console.error('[DrawingBlock] doSave error for:', currentSrc, err)
      isSavingRef.current = false
      return false
    }
  }, [])

  const handleCollapse = useCallback(async () => {
    if (!expanded) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    // If sceneDataRef is null but API is available, capture scene data now
    if (!sceneDataRef.current && excalidrawRef.current) {
      const api = excalidrawRef.current
      sceneDataRef.current = {
        elements: api.getSceneElements(),
        appState: api.getAppState(),
        files: api.getFiles()
      }
    }

    // If no scene data available (e.g. Excalidraw not fully initialized), skip save silently
    if (!sceneDataRef.current) {
      isReadyForSave.current = false
      excalidrawRef.current = null
      setExpanded(false)
      return
    }

    setSaveStatus('saving')
    const ok = await doSave()
    setSaveStatus(ok ? 'saved' : 'error')
    isReadyForSave.current = false
    excalidrawRef.current = null
    // Only clear scene data on success — preserve for retry on failure
    if (ok) sceneDataRef.current = null
    setExpanded(false)
  }, [expanded, doSave])

  // Click outside to collapse
  useEffect(() => {
    if (!expanded) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleCollapse()
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 300)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [expanded, handleCollapse])

  // Escape key to collapse
  useEffect(() => {
    if (!expanded) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        handleCollapse()
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [expanded, handleCollapse])

  // Debounced auto-save — capture scene data from onChange params
  const handleExcalidrawChange = useCallback((...args: any[]) => {
    // Excalidraw onChange may pass (elements, appState, files) or (elements, appState)
    const [elements, appState, files] = args
    // Deep-clone scene data to avoid stale references from Excalidraw internal mutations
    try {
      sceneDataRef.current = {
        elements: JSON.parse(JSON.stringify(elements || [])),
        appState: JSON.parse(JSON.stringify(appState || {})),
        files: files || {}  // files contain dataURLs, safe to keep reference
      }
    } catch {
      // Fallback: store references if clone fails (e.g. non-serializable transient state)
      sceneDataRef.current = { elements, appState, files: files || {} }
    }

    // Skip auto-save during Excalidraw initialization burst
    if (!isReadyForSave.current) return
    if (!srcRef.current) return

    setSaveStatus('saving')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const ok = await doSave()
      setSaveStatus(ok ? 'saved' : 'error')
    }, 1500)
  }, [doSave])

  // Bottom resize handle — drag to change canvas height, persist to block props
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startY = e.clientY
    const startHeight = canvasHeight

    const onMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientY - startY
      setCanvasHeight(Math.max(MIN_CANVAS_HEIGHT, startHeight + delta))
    }
    const onMouseUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      const finalH = Math.max(MIN_CANVAS_HEIGHT, startHeight + (ev.clientY - startY))
      editor.updateBlock(block, { props: { height: String(finalH) } })
    }
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [canvasHeight, editor, block])

  // Thumbnail resize handle — drag to change collapsed height, persisted in block props
  const handleThumbnailResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startY = e.clientY
    const startHeight = thumbnailHeight
    const container = containerRef.current?.querySelector('.drawing-thumbnail-area') as HTMLElement | null

    const onMouseMove = (ev: MouseEvent) => {
      const newH = Math.max(MIN_THUMBNAIL_HEIGHT, startHeight + (ev.clientY - startY))
      if (container) container.style.height = `${newH}px`
    }
    const onMouseUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      const finalH = Math.max(MIN_THUMBNAIL_HEIGHT, startHeight + (ev.clientY - startY))
      editor.updateBlock(block, { props: { height: String(finalH) } })
    }
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [thumbnailHeight, editor, block])

  const handleDelete = useCallback(async () => {
    if (!confirm('Delete this drawing? The .excalidraw file will also be removed.')) return
    if (src) await window.electronAPI.file.deleteDrawing(src)
    editor.removeBlocks([block])
  }, [src, editor, block])

  const fileName = src ? src.split('/').pop() || src : 'drawing.excalidraw'

  const statusDot = saveStatus === 'saved'
    ? { color: '#22c55e', text: 'Saved' }
    : saveStatus === 'saving'
    ? { color: '#f59e0b', text: 'Saving...' }
    : saveStatus === 'error'
    ? { color: '#ef4444', text: 'Save failed' }
    : null

  // ---- Thumbnail / collapsed mode ----
  if (!expanded) {
    return (
      <div
        ref={containerRef}
        className="drawing-block-wrapper group relative my-3 rounded-lg border border-[var(--bn-colors-border)] overflow-hidden cursor-pointer hover:border-[var(--color-accent)] transition-all hover:shadow-md"
        contentEditable={false}
        onClick={handleExpand}
        style={{ marginLeft: -32, marginRight: -32, width: 'calc(100% + 64px)' }}
      >
        <div className="drawing-thumbnail-area relative bg-[var(--color-bg-secondary)] overflow-hidden" style={{ height: thumbnailHeight }}>
          {fileError ? (
            <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              Drawing file not found: {fileName}
            </div>
          ) : thumbnailSvg ? (
            <div
              className="w-full h-full flex items-center justify-center p-4 [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto"
              dangerouslySetInnerHTML={{ __html: thumbnailSvg }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--color-text-muted)]">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
              </svg>
              <span className="text-sm opacity-60">Click to start drawing</span>
            </div>
          )}
          {/* Hover hint — bottom right, non-intrusive */}
          {!fileError && thumbnailSvg && (
            <span className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--color-accent)] text-white px-2 py-1 rounded text-xs font-medium shadow-sm pointer-events-none">
              Click to edit
            </span>
          )}
        </div>
        {/* Bottom info bar + resize handle */}
        <div className="flex items-center gap-2 px-3 py-1 border-t border-[var(--bn-colors-border)] bg-[var(--color-bg-primary)] text-xs text-[var(--color-text-muted)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-50">
            <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          </svg>
          <span className="opacity-60">{fileName}</span>
          {statusDot && (
            <span className="flex items-center gap-1" style={{ color: statusDot.color }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusDot.color }} />
              {statusDot.text}
            </span>
          )}
          {saveStatus === 'error' && sceneDataRef.current && (
            <button
              onClick={async (e) => {
                e.stopPropagation()
                setSaveStatus('saving')
                const ok = await doSave()
                setSaveStatus(ok ? 'saved' : 'error')
                if (ok) sceneDataRef.current = null
              }}
              className="px-1.5 py-0.5 rounded text-xs text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors"
            >
              Retry
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete() }}
            className="px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all"
          >
            Delete
          </button>
        </div>
        {/* Thumbnail resize handle */}
        <div
          onMouseDown={handleThumbnailResizeStart}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center h-2 cursor-ns-resize bg-[var(--color-bg-primary)] border-t border-[var(--bn-colors-border)] hover:bg-[var(--color-accent)]/10 transition-colors group/resize opacity-0 group-hover:opacity-100"
          title="Drag to resize"
        >
          <div className="w-8 h-0.5 rounded-full bg-[var(--color-text-muted)]/30 group-hover/resize:bg-[var(--color-accent)]/50 transition-colors" />
        </div>
      </div>
    )
  }

  // ---- Expanded edit mode (full width, resizable height) ----
  return (
    <div
      ref={containerRef}
      className="drawing-block-wrapper relative my-3 rounded-lg border-2 border-[var(--color-accent)] overflow-hidden shadow-lg"
      contentEditable={false}
      style={{ marginLeft: -32, marginRight: -32, width: 'calc(100% + 64px)' }}
    >
      {/* Top action bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--color-bg-secondary)] border-b border-[var(--bn-colors-border)]">
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-50">
            <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          </svg>
          <span className="font-medium text-[var(--color-text-primary)]">{fileName}</span>
          {statusDot && (
            <span className="flex items-center gap-1 transition-colors" style={{ color: statusDot.color }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full transition-colors" style={{ backgroundColor: statusDot.color }} />
              {statusDot.text}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDelete}
            className="px-2 py-0.5 text-xs rounded text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={handleCollapse}
            className="px-3 py-1 text-xs rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>

      {/* Excalidraw canvas */}
      {ExcalidrawComponent && (
        <div style={{ height: canvasHeight }}>
          <ExcalidrawComponent
            excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
              excalidrawRef.current = api
              // Allow save after Excalidraw finishes initial onChange burst
              setTimeout(() => {
                isReadyForSave.current = true
              }, 800)
              // Fit existing content into viewport
              if (initialData?.elements?.length) {
                setTimeout(() => {
                  api.scrollToContent(api.getSceneElements(), {
                    fitToViewport: true,
                    viewportZoomFactor: 0.85,
                  })
                }, 100)
              }
            }}
            initialData={initialData || undefined}
            onChange={handleExcalidrawChange}
            theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
            handleKeyboardGlobally={false}
            autoFocus={false}
            UIOptions={{
              canvasActions: {
                changeViewBackgroundColor: false,
                clearCanvas: false,
                export: false,
                loadScene: false,
                saveToActiveFile: false,
                toggleTheme: false,
                saveAsImage: true,
              },
              tools: { image: true },
            }}
          >
            {ExcalidrawMainMenu && (
              <ExcalidrawMainMenu>
                <ExcalidrawMainMenu.DefaultItems.SaveAsImage />
                <ExcalidrawMainMenu.DefaultItems.Help />
                <ExcalidrawMainMenu.Separator />
                <ExcalidrawMainMenu.Item onSelect={handleCollapse}>
                  Done Editing
                </ExcalidrawMainMenu.Item>
              </ExcalidrawMainMenu>
            )}
          </ExcalidrawComponent>
        </div>
      )}

      {/* Bottom resize handle */}
      <div
        onMouseDown={handleResizeStart}
        className="flex items-center justify-center h-3 cursor-ns-resize bg-[var(--color-bg-secondary)] border-t border-[var(--bn-colors-border)] hover:bg-[var(--color-accent)]/10 transition-colors group/resize"
        title="Drag to resize"
      >
        <div className="w-8 h-1 rounded-full bg-[var(--color-text-muted)]/30 group-hover/resize:bg-[var(--color-accent)]/50 transition-colors" />
      </div>
    </div>
  )
}

// BlockNote custom block spec
export const DrawingBlock = createReactBlockSpec(
  {
    type: 'drawing' as const,
    propSchema: {
      src: { default: '' },
      height: { default: '' },
    },
    content: 'none' as const,
  },
  {
    render: (props) => (
      <DrawingBlockView
        src={props.block.props.src}
        height={props.block.props.height}
        editor={props.editor}
        block={props.block}
      />
    ),
  }
)
