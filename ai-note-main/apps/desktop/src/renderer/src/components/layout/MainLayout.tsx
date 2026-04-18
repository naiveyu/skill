import { useState, useCallback, useRef, useEffect } from 'react'
import Sidebar from './Sidebar'
import StatusBar from './StatusBar'
import EditorContainer from '../editor/EditorContainer'

const MIN_SIDEBAR_WIDTH = 180
const MAX_SIDEBAR_WIDTH = 500
const DEFAULT_SIDEBAR_WIDTH = 260

function MainLayout() {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
  const isDragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      let newWidth = e.clientX - containerRect.left

      // Clamp width
      newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, newWidth))
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <div ref={containerRef} className="flex h-full w-full flex-col">
      {/* macOS title bar drag region */}
      <div className="h-9 flex-shrink-0 titlebar-drag" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className="flex-shrink-0 overflow-hidden border-r border-[var(--color-border)]"
          style={{ width: sidebarWidth }}
        >
          <Sidebar />
        </div>

        {/* Drag handle */}
        <div
          className="w-1 flex-shrink-0 cursor-col-resize hover:bg-[var(--color-accent)]
                     transition-colors active:bg-[var(--color-accent)]"
          onMouseDown={handleMouseDown}
        />

        {/* Editor area */}
        <div className="flex-1 overflow-hidden">
          <EditorContainer />
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  )
}

export default MainLayout
