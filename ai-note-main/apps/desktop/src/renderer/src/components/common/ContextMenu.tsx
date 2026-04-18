import { useEffect, useRef } from 'react'

interface ContextMenuItem {
  label: string
  onClick: () => void
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleScroll = () => {
      onClose()
    }

    // Use setTimeout to avoid the context menu closing immediately
    // from the same right-click event
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('scroll', handleScroll, true)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Adjust position to stay within viewport
  const adjustPosition = () => {
    const menuWidth = 160
    const menuHeight = items.length * 32 + 8
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let adjustedX = x
    let adjustedY = y

    if (x + menuWidth > viewportWidth) {
      adjustedX = viewportWidth - menuWidth - 4
    }
    if (y + menuHeight > viewportHeight) {
      adjustedY = viewportHeight - menuHeight - 4
    }

    return { left: adjustedX, top: adjustedY }
  }

  const position = adjustPosition()

  return (
    <div
      ref={menuRef}
      className="context-menu-enter fixed z-50 min-w-[160px] rounded-lg border
                 border-[var(--color-border)] bg-[var(--color-bg-primary)] py-1
                 backdrop-blur-sm"
      style={{ left: position.left, top: position.top, boxShadow: 'var(--shadow-float)' }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            item.onClick()
            onClose()
          }}
          className="flex w-full items-center px-3 py-1.5 text-left text-sm
                     text-[var(--color-text-secondary)]
                     hover:bg-[var(--color-accent)] hover:text-white
                     transition-colors duration-100 first:rounded-t last:rounded-b"
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export default ContextMenu
