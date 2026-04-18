import { useState, useEffect, useRef, useCallback } from 'react'

interface ImageViewerProps {
  filePath: string
}

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
  tiff: 'image/tiff',
  tif: 'image/tiff'
}

function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  return MIME_MAP[ext] || 'image/png'
}

const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3]
const ZOOM_STEP = 0.2
const ZOOM_MIN = 0.1
const ZOOM_MAX = 5

export default function ImageViewer({ filePath }: ImageViewerProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState<number | 'fit'>('fit')
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)

  // Pan state
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  // Load image binary → data URL
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setDataUrl(null)
    setScale('fit')
    setOffset({ x: 0, y: 0 })
    setNaturalSize(null)

    window.electronAPI.file.readBinaryFile(filePath)
      .then((bytes: Uint8Array) => {
        if (cancelled) return
        const mime = getMimeType(filePath)
        // Convert Uint8Array to base64
        let binary = ''
        const chunkSize = 8192
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
        }
        const base64 = btoa(binary)
        setDataUrl(`data:${mime};base64,${base64}`)
        setLoading(false)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setError(err?.message || 'Failed to load image')
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [filePath])

  // Compute displayed scale number (fit = calculated from container)
  const getDisplayScale = useCallback((): number => {
    if (scale !== 'fit') return scale
    if (!containerRef.current || !naturalSize) return 1
    const { clientWidth, clientHeight } = containerRef.current
    // 32px padding each side
    const maxW = clientWidth - 64
    const maxH = clientHeight - 64
    const ratio = Math.min(maxW / naturalSize.w, maxH / naturalSize.h, 1)
    return Math.round(ratio * 100) / 100
  }, [scale, naturalSize])

  const displayScale = getDisplayScale()

  const zoomTo = useCallback((newScale: number) => {
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newScale))
    setScale(Math.round(clamped * 100) / 100)
    setOffset({ x: 0, y: 0 })
  }, [])

  const zoomIn = useCallback(() => zoomTo(displayScale + ZOOM_STEP), [displayScale, zoomTo])
  const zoomOut = useCallback(() => zoomTo(displayScale - ZOOM_STEP), [displayScale, zoomTo])
  const fitToWindow = useCallback(() => {
    setScale('fit')
    setOffset({ x: 0, y: 0 })
  }, [])

  // Ctrl + wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    zoomTo(displayScale + delta)
  }, [displayScale, zoomTo])

  // Mouse drag to pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
    e.preventDefault()
  }, [offset])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    setOffset({
      x: dragStart.current.ox + e.clientX - dragStart.current.x,
      y: dragStart.current.oy + e.clientY - dragStart.current.y
    })
  }, [])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const fileName = filePath.split('/').pop() || filePath

  const scalePercent = Math.round(displayScale * 100)

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-primary)]">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-[var(--color-border)] px-3 py-1 shrink-0">
        {/* Zoom controls */}
        <button
          onClick={zoomOut}
          disabled={loading || !!error}
          className="flex items-center justify-center w-6 h-6 rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold"
          title="Zoom out"
        >
          −
        </button>

        <span className="text-xs text-[var(--color-text-secondary)] min-w-[44px] text-center tabular-nums">
          {loading || error ? '—' : `${scalePercent}%`}
        </span>

        <button
          onClick={zoomIn}
          disabled={loading || !!error}
          className="flex items-center justify-center w-6 h-6 rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold"
          title="Zoom in"
        >
          +
        </button>

        <div className="w-px h-4 bg-[var(--color-border)] mx-1" />

        {/* Preset buttons */}
        <button
          onClick={fitToWindow}
          disabled={loading || !!error}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed
            ${scale === 'fit'
              ? 'text-[var(--color-accent)] bg-[var(--color-accent-light)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
            }`}
          title="Fit to window"
        >
          适应
        </button>

        {[1, 2].map((preset) => (
          <button
            key={preset}
            onClick={() => zoomTo(preset)}
            disabled={loading || !!error}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed
              ${typeof scale === 'number' && Math.abs(scale - preset) < 0.01
                ? 'text-[var(--color-accent)] bg-[var(--color-accent-light)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
              }`}
          >
            {preset * 100}%
          </button>
        ))}

        <div className="flex-1" />

        {/* Image dimensions */}
        {naturalSize && (
          <span className="text-xs text-[var(--color-text-tertiary)] tabular-nums">
            {naturalSize.w} × {naturalSize.h}
          </span>
        )}
      </div>

      {/* Image area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="text-[var(--color-text-secondary)] text-sm">Failed to load image</span>
            <span className="text-[var(--color-text-tertiary)] text-xs font-mono">{error}</span>
          </div>
        )}

        {dataUrl && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
          >
            <img
              ref={imgRef}
              src={dataUrl}
              alt={fileName}
              style={{
                transform: `scale(${displayScale})`,
                transformOrigin: 'center center',
                maxWidth: 'none',
                imageRendering: displayScale >= 2 ? 'pixelated' : 'auto',
                userSelect: 'none',
                WebkitUserDrag: 'none' as React.CSSProperties['userSelect']
              } as React.CSSProperties}
              onLoad={(e) => {
                const img = e.currentTarget
                setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
              }}
              draggable={false}
            />
          </div>
        )}
      </div>

      {/* Bottom info bar */}
      <div className="flex items-center gap-3 border-t border-[var(--color-border)] px-3 py-1 shrink-0">
        <span className="text-xs text-[var(--color-text-tertiary)] truncate">{fileName}</span>
        {naturalSize && (
          <>
            <span className="text-[var(--color-border)]">·</span>
            <span className="text-xs text-[var(--color-text-tertiary)] tabular-nums shrink-0">
              {naturalSize.w} × {naturalSize.h} px
            </span>
          </>
        )}
        <div className="flex-1" />
        <span className="text-xs text-[var(--color-text-tertiary)] tabular-nums">
          {ZOOM_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => zoomTo(p)}
              disabled={loading || !!error}
              className="px-1 hover:text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {Math.round(p * 100)}%
            </button>
          ))}
        </span>
      </div>
    </div>
  )
}
