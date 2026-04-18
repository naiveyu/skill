import { useState, useEffect, useRef, useCallback } from 'react'

interface VideoViewerProps {
  filePath: string
}

function formatTime(sec: number): string {
  if (!isFinite(sec)) return '0:00'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatTimeCode(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

export default function VideoViewer({ filePath }: VideoViewerProps) {
  const [absolutePath, setAbsolutePath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [speed, setSpeed] = useState(1)
  const [inPoint, setInPoint] = useState<number | null>(null)
  const [outPoint, setOutPoint] = useState<number | null>(null)
  const [ffmpegAvailable, setFfmpegAvailable] = useState<boolean | null>(null)
  const [trimProgress, setTrimProgress] = useState<number | null>(null)
  const [trimDone, setTrimDone] = useState<string | null>(null)
  const [trimError, setTrimError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Drag state for In/Out handles
  const dragging = useRef<'in' | 'out' | 'seek' | null>(null)

  const fileName = filePath.split('/').pop() || filePath

  // Load absolute path for file:// protocol
  useEffect(() => {
    setAbsolutePath(null)
    setError(null)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setInPoint(null)
    setOutPoint(null)
    setTrimProgress(null)
    setTrimDone(null)
    setTrimError(null)

    window.electronAPI.file.getAbsolutePath(filePath)
      .then((p: string) => setAbsolutePath(p))
      .catch((err: Error) => setError(err?.message || 'Failed to resolve path'))
  }, [filePath])

  // Check FFmpeg availability once
  useEffect(() => {
    window.electronAPI.video.checkFfmpeg()
      .then((ok: boolean) => setFfmpegAvailable(ok))
      .catch(() => setFfmpegAvailable(false))
  }, [])

  // Register trim event listeners
  useEffect(() => {
    const unsubProgress = window.electronAPI.video.onTrimProgress((p: number) => {
      setTrimProgress(p)
    })
    const unsubComplete = window.electronAPI.video.onTrimComplete((outPath: string) => {
      setTrimProgress(null)
      setTrimDone(outPath.split('/').pop() || outPath)
    })
    const unsubError = window.electronAPI.video.onTrimError((msg: string) => {
      setTrimProgress(null)
      setTrimError(msg)
    })
    return () => {
      unsubProgress()
      unsubComplete()
      unsubError()
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't capture if focus is on an input/slider
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT') return

      const video = videoRef.current
      if (!video) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          video.paused ? video.play() : video.pause()
          break
        case '[':
        case 'i':
          e.preventDefault()
          setInPoint(video.currentTime)
          break
        case ']':
        case 'o':
          e.preventDefault()
          setOutPoint(video.currentTime)
          break
        case 'ArrowLeft':
          e.preventDefault()
          video.currentTime = Math.max(0, video.currentTime - 5)
          break
        case 'ArrowRight':
          e.preventDefault()
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 5)
          break
      }
    }

    const el = containerRef.current
    if (el) el.addEventListener('keydown', handleKey)
    return () => { if (el) el.removeEventListener('keydown', handleKey) }
  }, [])

  // Timeline interaction helpers
  const getTimeFromEvent = useCallback((e: React.MouseEvent | MouseEvent): number => {
    const tl = timelineRef.current
    if (!tl || !duration) return 0
    const rect = tl.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    return ratio * duration
  }, [duration])

  const handleTimelineMouseDown = useCallback((e: React.MouseEvent) => {
    if (!duration) return
    const tl = timelineRef.current
    if (!tl) return
    const rect = tl.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const time = ratio * duration

    // Check if near In or Out handle (within 8px of handle)
    const inRatio = inPoint !== null ? inPoint / duration : null
    const outRatio = outPoint !== null ? outPoint / duration : null
    const tlWidth = rect.width

    const inPx = inRatio !== null ? inRatio * tlWidth : null
    const outPx = outRatio !== null ? outRatio * tlWidth : null
    const clickPx = ratio * tlWidth

    if (inPx !== null && Math.abs(clickPx - inPx) <= 10) {
      dragging.current = 'in'
    } else if (outPx !== null && Math.abs(clickPx - outPx) <= 10) {
      dragging.current = 'out'
    } else {
      dragging.current = 'seek'
      if (videoRef.current) videoRef.current.currentTime = time
    }
    e.preventDefault()
  }, [duration, inPoint, outPoint])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const time = getTimeFromEvent(e)
      if (dragging.current === 'in') {
        setInPoint(Math.min(time, outPoint !== null ? outPoint - 0.1 : duration))
      } else if (dragging.current === 'out') {
        setOutPoint(Math.max(time, inPoint !== null ? inPoint + 0.1 : 0))
      } else if (dragging.current === 'seek') {
        if (videoRef.current) videoRef.current.currentTime = time
      }
    }
    const handleMouseUp = () => { dragging.current = null }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [duration, inPoint, outPoint, getTimeFromEvent])

  const handleExport = useCallback(async () => {
    if (!absolutePath || inPoint === null || outPoint === null) return
    if (!ffmpegAvailable) return
    setTrimError(null)
    setTrimDone(null)
    setTrimProgress(0)
    await window.electronAPI.video.trim(absolutePath, inPoint, outPoint, '')
  }, [absolutePath, inPoint, outPoint, ffmpegAvailable])

  const handleShowInFinder = useCallback(() => {
    if (!trimDone || !absolutePath) return
    const dir = absolutePath.split('/').slice(0, -1).join('/')
    window.electronAPI.file.openExternal(dir)
  }, [trimDone, absolutePath])

  const clipDuration = inPoint !== null && outPoint !== null ? outPoint - inPoint : null
  const canExport = inPoint !== null && outPoint !== null && outPoint > inPoint && ffmpegAvailable && trimProgress === null

  const playPercent = duration ? (currentTime / duration) * 100 : 0
  const inPercent = duration && inPoint !== null ? (inPoint / duration) * 100 : null
  const outPercent = duration && outPoint !== null ? (outPoint / duration) * 100 : null

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-[var(--color-bg-primary)] outline-none"
      tabIndex={0}
    >
      {/* Video area */}
      <div className="flex-1 flex items-center justify-center bg-black min-h-0 overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center gap-2">
            <span className="text-white/60 text-sm">Failed to load video</span>
            <span className="text-white/30 text-xs font-mono">{error}</span>
          </div>
        ) : absolutePath ? (
          <video
            ref={videoRef}
            src={`file://${absolutePath}`}
            className="max-w-full max-h-full"
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onDurationChange={(e) => setDuration(e.currentTarget.duration)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onError={() => setError('Video could not be loaded')}
          />
        ) : (
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        )}
      </div>

      {/* Timeline + controls */}
      <div className="shrink-0 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)]">
        {/* Custom timeline */}
        <div className="px-3 pt-2 pb-1">
          <div
            ref={timelineRef}
            className="relative h-5 cursor-pointer select-none"
            onMouseDown={handleTimelineMouseDown}
          >
            {/* Track background */}
            <div className="absolute inset-y-[8px] left-0 right-0 rounded-full bg-[var(--color-bg-tertiary)]" />

            {/* Played region */}
            <div
              className="absolute inset-y-[8px] left-0 rounded-full bg-[var(--color-text-tertiary)]"
              style={{ width: `${playPercent}%` }}
            />

            {/* In/Out selection region */}
            {inPercent !== null && outPercent !== null && (
              <div
                className="absolute inset-y-[7px] rounded-sm bg-[var(--color-accent)] opacity-70"
                style={{ left: `${inPercent}%`, width: `${outPercent - inPercent}%` }}
              />
            )}

            {/* In handle */}
            {inPercent !== null && (
              <div
                className="absolute top-0 bottom-0 flex items-center"
                style={{ left: `${inPercent}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-[3px] h-full rounded-sm bg-[var(--color-accent)] shadow-sm cursor-ew-resize" />
              </div>
            )}

            {/* Out handle */}
            {outPercent !== null && (
              <div
                className="absolute top-0 bottom-0 flex items-center"
                style={{ left: `${outPercent}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-[3px] h-full rounded-sm bg-[var(--color-accent)] shadow-sm cursor-ew-resize" />
              </div>
            )}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 flex items-center pointer-events-none"
              style={{ left: `${playPercent}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-3 h-3 rounded-full bg-white shadow" />
            </div>
          </div>

          {/* Time labels */}
          <div className="flex justify-between text-[10px] text-[var(--color-text-tertiary)] tabular-nums mt-0.5 px-0.5">
            <span>0:00</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback controls row */}
        <div className="flex items-center gap-3 px-3 pb-2">
          {/* Play/Pause */}
          <button
            onClick={() => videoRef.current && (videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause())}
            disabled={!absolutePath}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="Play/Pause (Space)"
          >
            {isPlaying ? (
              <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                <rect x="0" y="0" width="3" height="12" rx="1" />
                <rect x="7" y="0" width="3" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                <path d="M0 0 L10 6 L0 12 Z" />
              </svg>
            )}
          </button>

          {/* Time display */}
          <span className="text-xs text-[var(--color-text-secondary)] tabular-nums shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Volume */}
          <div className="flex items-center gap-1.5 shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-tertiary)]">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              {volume > 0 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
              {volume > 0.5 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setVolume(v)
                if (videoRef.current) videoRef.current.volume = v
              }}
              className="w-16 h-1 accent-[var(--color-accent)]"
              title="Volume"
            />
          </div>

          {/* Speed */}
          <select
            value={speed}
            onChange={(e) => {
              const s = parseFloat(e.target.value)
              setSpeed(s)
              if (videoRef.current) videoRef.current.playbackRate = s
            }}
            className="text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[var(--color-text-secondary)] shrink-0"
            title="Playback speed"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>{s}×</option>
            ))}
          </select>

          {/* Fullscreen */}
          <button
            onClick={() => videoRef.current?.requestFullscreen?.()}
            disabled={!absolutePath}
            className="flex items-center justify-center w-6 h-6 rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="Fullscreen"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>

        {/* Clip section */}
        <div className="border-t border-[var(--color-border)] px-3 py-2 flex items-center gap-3">
          {/* Clip markers */}
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] shrink-0">
            <span className="text-[var(--color-text-tertiary)]">✂</span>
            <button
              onClick={() => videoRef.current && setInPoint(videoRef.current.currentTime)}
              className="px-2 py-0.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              title="Set In point ([)"
            >
              IN: {inPoint !== null ? formatTimeCode(inPoint) : '--:--:--'}
            </button>
            <span className="text-[var(--color-text-tertiary)]">→</span>
            <button
              onClick={() => videoRef.current && setOutPoint(videoRef.current.currentTime)}
              className="px-2 py-0.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              title="Set Out point (])"
            >
              OUT: {outPoint !== null ? formatTimeCode(outPoint) : '--:--:--'}
            </button>
            {clipDuration !== null && (
              <>
                <span className="text-[var(--color-text-tertiary)]">·</span>
                <span className="text-[var(--color-text-tertiary)] tabular-nums">{formatTime(clipDuration)}</span>
              </>
            )}
          </div>

          <div className="flex-1" />

          {/* Trim progress / done / error */}
          {trimProgress !== null && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-24 h-1.5 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
                <div
                  className="h-full bg-[var(--color-accent)] transition-all duration-150 rounded-full"
                  style={{ width: `${trimProgress}%` }}
                />
              </div>
              <span className="text-xs text-[var(--color-text-tertiary)] tabular-nums">{trimProgress}%</span>
            </div>
          )}

          {trimDone && trimProgress === null && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-green-500">✓ {trimDone}</span>
              <button
                onClick={handleShowInFinder}
                className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline"
              >
                在 Finder 中显示
              </button>
            </div>
          )}

          {trimError && trimProgress === null && (
            <span className="text-xs text-red-400 shrink-0 max-w-48 truncate" title={trimError}>
              ✕ {trimError}
            </span>
          )}

          {/* Export button */}
          <div className="relative group shrink-0">
            <button
              onClick={handleExport}
              disabled={!canExport}
              className="px-3 py-1 rounded text-xs font-medium bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              导出片段
            </button>
            {/* Tooltip for FFmpeg unavailable */}
            {ffmpegAvailable === false && (
              <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-10 w-48 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] shadow-lg px-2.5 py-2 text-[10px] text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line">
                {'需要安装 FFmpeg:\nbrew install ffmpeg'}
              </div>
            )}
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="flex items-center gap-3 px-3 pb-2 text-[10px] text-[var(--color-text-tertiary)]">
          <span>空格 播放/暂停</span>
          <span>· [ / i  设置入点</span>
          <span>· ] / o  设置出点</span>
          <span>· ←/→  跳 5 秒</span>
          <div className="flex-1" />
          <span className="truncate">{fileName}</span>
        </div>
      </div>
    </div>
  )
}
