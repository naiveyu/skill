import { useState, useCallback, useEffect, useRef } from 'react'
import { useEditorStore } from '../../stores/editor-store'
import { useFileStore } from '../../stores/file-store'
import { useI18n } from '../../i18n'
import { XIcon } from '../common/Icons'

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  tabId: string
  filePath: string
}

function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, closeOtherTabs, closeAllTabs, isDirty } =
    useEditorStore()
  const { revealInSidebar } = useFileStore()
  const { t } = useI18n()

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false, x: 0, y: 0, tabId: '', filePath: ''
  })
  const menuRef = useRef<HTMLDivElement>(null)

  // Close context menu on outside click or Escape
  useEffect(() => {
    if (!contextMenu.visible) return

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu((s) => ({ ...s, visible: false }))
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu((s) => ({ ...s, visible: false }))
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [contextMenu.visible])

  const handleContextMenu = useCallback((e: React.MouseEvent, tabId: string, filePath: string) => {
    e.preventDefault()
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, tabId, filePath })
  }, [])

  const handleMenuAction = useCallback((action: string) => {
    const { tabId, filePath } = contextMenu

    switch (action) {
      case 'close':
        closeTab(tabId)
        break
      case 'closeOthers':
        closeOtherTabs(tabId)
        break
      case 'closeAll':
        closeAllTabs()
        break
      case 'reveal':
        revealInSidebar(filePath)
        break
      case 'copyPath':
        navigator.clipboard.writeText(filePath)
        break
    }

    setContextMenu((s) => ({ ...s, visible: false }))
  }, [contextMenu, closeTab, closeOtherTabs, closeAllTabs, revealInSidebar])

  if (tabs.length === 0) return null

  const handleMouseDown = (e: React.MouseEvent, tabId: string) => {
    if (e.button === 1) {
      e.preventDefault()
      closeTab(tabId)
    }
  }

  return (
    <>
      <div className="flex h-9 flex-shrink-0 items-end overflow-x-auto bg-[var(--color-bg-secondary)]"
           style={{ boxShadow: 'inset 0 -1px 0 var(--color-border)' }}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          const dirty = isDirty(tab.id)

          return (
            <div
              key={tab.id}
              className={`group flex h-8 cursor-pointer items-center gap-1.5 px-3 text-xs
                transition-colors duration-100
                ${
                  isActive
                    ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border-b-2 border-b-[var(--color-accent)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]'
                }`}
              onClick={() => setActiveTab(tab.id)}
              onMouseDown={(e) => handleMouseDown(e, tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id, tab.filePath)}
            >
              {/* Dirty indicator */}
              {dirty && (
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[var(--color-accent)]" />
              )}

              {/* Tab title */}
              <span className="max-w-[120px] truncate">{tab.title}</span>

              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab.id)
                }}
                className="ml-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md
                           text-[var(--color-text-muted)] opacity-0 transition-all duration-100
                           hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]
                           group-hover:opacity-100"
                title={t('editor.closeTab')}
              >
                <XIcon size={12} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Context menu */}
      {contextMenu.visible && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[160px] rounded-lg border border-[var(--color-border)]
            bg-[var(--color-bg-primary)] py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="flex w-full items-center px-3 py-1.5 text-xs text-[var(--color-text-primary)]
              hover:bg-[var(--color-bg-tertiary)] transition-colors"
            onClick={() => handleMenuAction('close')}
          >
            {t('editor.closeTab')}
          </button>
          <button
            className="flex w-full items-center px-3 py-1.5 text-xs text-[var(--color-text-primary)]
              hover:bg-[var(--color-bg-tertiary)] transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => handleMenuAction('closeOthers')}
            disabled={tabs.length <= 1}
          >
            {t('editor.closeOtherTabs')}
          </button>
          <button
            className="flex w-full items-center px-3 py-1.5 text-xs text-[var(--color-text-primary)]
              hover:bg-[var(--color-bg-tertiary)] transition-colors"
            onClick={() => handleMenuAction('closeAll')}
          >
            {t('editor.closeAllTabs')}
          </button>

          <div className="my-1 border-t border-[var(--color-border)]" />

          <button
            className="flex w-full items-center px-3 py-1.5 text-xs text-[var(--color-text-primary)]
              hover:bg-[var(--color-bg-tertiary)] transition-colors"
            onClick={() => handleMenuAction('reveal')}
          >
            {t('editor.revealInSidebar')}
          </button>
          <button
            className="flex w-full items-center px-3 py-1.5 text-xs text-[var(--color-text-primary)]
              hover:bg-[var(--color-bg-tertiary)] transition-colors"
            onClick={() => handleMenuAction('copyPath')}
          >
            {t('editor.copyPath')}
          </button>
        </div>
      )}
    </>
  )
}

export default TabBar
