import { useState, useCallback, useRef, DragEvent } from 'react'
import { useFileStore } from '../../stores/file-store'
import { useEditorStore } from '../../stores/editor-store'
import { useI18n } from '../../i18n'
import FileNodeComponent from './FileNode'
import ContextMenu from '../common/ContextMenu'
import type { FileNode } from '@shared/types/ipc'

interface ContextMenuState {
  x: number
  y: number
  node: FileNode | null
}

function findNodeInTree(nodes: FileNode[], id: string): FileNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeInTree(node.children, id)
      if (found) return found
    }
  }
  return null
}

function FileTree() {
  const { tree, selectedFileId, expandedFolders, selectFile, toggleFolder, createFile, createFolder, deleteFile, renameFile, moveFile, copyToClipboard, cutToClipboard, pasteFiles, importExternalFiles } =
    useFileStore()
  const { openFile } = useEditorStore()
  const { t } = useI18n()

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [isCreating, setIsCreating] = useState<{
    parentId: string
    type: 'file' | 'folder'
  } | null>(null)
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Use counter for root drag state to handle nested elements correctly
  const rootDragCounterRef = useRef(0)
  const rootContainerRef = useRef<HTMLDivElement>(null)

  // Sort nodes: folders first, then files, alphabetical within each group
  const sortNodes = (nodes: FileNode[]): FileNode[] => {
    return [...nodes].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }

  const handleFileClick = useCallback(
    (node: FileNode) => {
      selectFile(node.id)
      if (node.type === 'file') {
        openFile(node.path)
      } else {
        toggleFolder(node.id)
      }
    },
    [selectFile, openFile, toggleFolder]
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, node: FileNode) => {
      e.preventDefault()
      e.stopPropagation()
      setContextMenu({ x: e.clientX, y: e.clientY, node })
    },
    []
  )

  const handleBackgroundContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setContextMenu({ x: e.clientX, y: e.clientY, node: null })
    },
    []
  )

  const handleCreate = (type: 'file' | 'folder') => {
    const parentId = contextMenu?.node
      ? contextMenu.node.type === 'folder'
        ? contextMenu.node.path
        : contextMenu.node.path.split('/').slice(0, -1).join('/')
      : ''
    setIsCreating({ parentId, type })
    setNewName('')
    setContextMenu(null)
  }

  const handleCreateSubmit = async () => {
    if (!isCreating || !newName.trim()) {
      setIsCreating(null)
      return
    }
    if (isCreating.type === 'file') {
      await createFile(isCreating.parentId, newName.trim())
    } else {
      await createFolder(isCreating.parentId, newName.trim())
    }
    setIsCreating(null)
    setNewName('')
  }

  const handleRenameStart = () => {
    if (!contextMenu?.node) return
    setRenamingId(contextMenu.node.id)
    setRenameValue(contextMenu.node.name)
    setContextMenu(null)
  }

  const handleRenameSubmit = async () => {
    if (renamingId && renameValue.trim()) {
      await renameFile(renamingId, renameValue.trim())
    }
    setRenamingId(null)
    setRenameValue('')
  }

  const handleDelete = async () => {
    if (!contextMenu?.node) return
    const node = contextMenu.node
    setContextMenu(null)
    const confirmed = window.confirm(
      t('fileTree.deleteConfirm', { name: node.name })
    )
    if (confirmed) {
      await deleteFile(node.id)
    }
  }

  const handleMoveFile = useCallback(
    (sourcePath: string, targetFolderPath: string) => {
      moveFile(sourcePath, targetFolderPath)
    },
    [moveFile]
  )

  const handleExternalDrop = useCallback(
    (absolutePaths: string[], targetFolderPath: string) => {
      importExternalFiles(absolutePaths, targetFolderPath)
    },
    [importExternalFiles]
  )

  // Determine target folder for paste based on selected node
  const getPasteTargetDir = useCallback((): string => {
    if (!selectedFileId) return ''
    const node = findNodeInTree(tree, selectedFileId)
    if (!node) return ''
    if (node.type === 'folder') return node.path
    // File selected: paste into its parent folder
    const parts = node.path.split('/')
    parts.pop()
    return parts.join('/')
  }, [selectedFileId, tree])

  const handlePaste = useCallback(() => {
    const targetDir = contextMenu?.node
      ? contextMenu.node.type === 'folder'
        ? contextMenu.node.path
        : contextMenu.node.path.split('/').slice(0, -1).join('/')
      : getPasteTargetDir()
    setContextMenu(null)
    pasteFiles(targetDir)
  }, [contextMenu, getPasteTargetDir, pasteFiles])

  const handleKeyboardPaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault()
      const targetDir = getPasteTargetDir()
      pasteFiles(targetDir)
    },
    [getPasteTargetDir, pasteFiles]
  )

  const handleCopy = useCallback(() => {
    const nodePath = contextMenu?.node?.path || selectedFileId
    if (nodePath) copyToClipboard(nodePath)
    setContextMenu(null)
  }, [contextMenu, selectedFileId, copyToClipboard])

  const handleCut = useCallback(() => {
    const nodePath = contextMenu?.node?.path || selectedFileId
    if (nodePath) cutToClipboard(nodePath)
    setContextMenu(null)
  }, [contextMenu, selectedFileId, cutToClipboard])

  // Keyboard shortcuts (Cmd/Ctrl+C, Cmd/Ctrl+X)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key === 'c' && selectedFileId) {
        e.preventDefault()
        copyToClipboard(selectedFileId)
      } else if (e.key === 'x' && selectedFileId) {
        e.preventDefault()
        cutToClipboard(selectedFileId)
      }
    },
    [selectedFileId, copyToClipboard, cutToClipboard]
  )

  // Root-level drag handlers with counter for proper enter/leave tracking
  const setRootOverlay = (show: boolean) => {
    const el = rootContainerRef.current
    if (!el) return
    const overlay = el.querySelector('[data-drag-overlay]') as HTMLElement | null
    if (overlay) {
      overlay.style.opacity = show ? '1' : '0'
      overlay.style.pointerEvents = show ? 'none' : 'none'
    }
  }

  const handleRootDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    rootDragCounterRef.current++
    if (rootDragCounterRef.current === 1) {
      setRootOverlay(true)
    }
  }, [])

  const handleRootDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    const hasFiles = e.dataTransfer.types.includes('Files')
    e.dataTransfer.dropEffect = hasFiles ? 'copy' : 'move'
  }, [])

  const handleRootDragLeave = useCallback(() => {
    rootDragCounterRef.current--
    if (rootDragCounterRef.current === 0) {
      setRootOverlay(false)
    }
  }, [])

  const handleRootDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      rootDragCounterRef.current = 0
      setRootOverlay(false)

      // External files from OS (Finder / Explorer)
      if (e.dataTransfer.files.length > 0) {
        const paths = Array.from(e.dataTransfer.files)
          .map((f) => (f as any).path as string)
          .filter(Boolean)
        if (paths.length > 0) {
          importExternalFiles(paths, '')
          return
        }
      }

      // Internal move
      const sourcePath = e.dataTransfer.getData('text/plain')
      if (!sourcePath) return
      moveFile(sourcePath, '')
    },
    [moveFile, importExternalFiles]
  )

  const renderTree = (nodes: FileNode[], depth: number = 0) => {
    return sortNodes(nodes).map((node) => (
      <div key={node.id}>
        <FileNodeComponent
          node={node}
          depth={depth}
          isSelected={selectedFileId === node.id}
          isExpanded={expandedFolders.has(node.id)}
          isRenaming={renamingId === node.id}
          renameValue={renameValue}
          onRenameChange={setRenameValue}
          onRenameSubmit={handleRenameSubmit}
          onClick={() => handleFileClick(node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
          onDrop={handleMoveFile}
          onExternalDrop={handleExternalDrop}
        />
        {node.type === 'folder' &&
          expandedFolders.has(node.id) &&
          node.children && (
            <div>{renderTree(node.children, depth + 1)}</div>
          )}
      </div>
    ))
  }

  // Build context menu items
  const getContextMenuItems = () => {
    const items = [
      { label: t('fileTree.contextMenu.newFile'), onClick: () => handleCreate('file') },
      { label: t('fileTree.contextMenu.newFolder'), onClick: () => handleCreate('folder') },
      { label: t('fileTree.contextMenu.paste'), onClick: handlePaste }
    ]

    if (contextMenu?.node) {
      items.push(
        { label: t('fileTree.contextMenu.copy'), onClick: handleCopy },
        { label: t('fileTree.contextMenu.cut'), onClick: handleCut },
        { label: t('fileTree.contextMenu.rename'), onClick: handleRenameStart },
        { label: t('fileTree.contextMenu.delete'), onClick: handleDelete }
      )
    }

    return items
  }

  return (
    <div
      className="h-full flex flex-col outline-none"
      tabIndex={0}
      onContextMenu={handleBackgroundContextMenu}
      onKeyDown={handleKeyDown}
      onPaste={handleKeyboardPaste}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase text-[var(--color-text-muted)]">
        <span>{t('fileTree.title')}</span>
      </div>

      {/* Tree */}
      <div
        ref={rootContainerRef}
        className="relative flex-1 overflow-y-auto thin-scrollbar px-1"
        onDragEnter={handleRootDragEnter}
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
      >
        {/* Drag overlay */}
        <div
          data-drag-overlay
          className="absolute inset-0 rounded transition-opacity duration-150 pointer-events-none"
          style={{ backgroundColor: 'rgba(99, 102, 241, 0.08)', border: '1px dashed rgba(99, 102, 241, 0.4)', opacity: 0 }}
        />

        {tree.length === 0 ? (
          <div className="px-3 py-4 text-xs text-[var(--color-text-muted)]">
            {t('fileTree.empty')}
          </div>
        ) : (
          renderTree(tree)
        )}

        {/* Inline create input */}
        {isCreating && (
          <div className="px-3 py-1">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSubmit()
                if (e.key === 'Escape') setIsCreating(null)
              }}
              onBlur={handleCreateSubmit}
              placeholder={
                isCreating.type === 'file' ? t('fileTree.newFilePlaceholder') : t('fileTree.newFolderPlaceholder')
              }
              className="w-full rounded border border-[var(--color-accent)] bg-[var(--color-bg-primary)]
                         px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none"
            />
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

export default FileTree
