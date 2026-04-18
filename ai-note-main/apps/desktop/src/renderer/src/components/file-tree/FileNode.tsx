import { useRef, DragEvent, ReactNode } from 'react'
import type { FileNode } from '@shared/types/ipc'
import {
  FolderIcon, FolderOpenIcon, MarkdownIcon, FileJsonIcon,
  CodeIcon, PaletteIcon, ImageIcon, FileTextIcon, PdfIcon,
  ChevronRightIcon, ChevronDownIcon
} from '../common/Icons'

interface FileNodeProps {
  node: FileNode
  depth: number
  isSelected: boolean
  isExpanded: boolean
  isRenaming: boolean
  renameValue: string
  onRenameChange: (value: string) => void
  onRenameSubmit: () => void
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onDrop: (sourcePath: string, targetFolderPath: string) => void
  onExternalDrop: (absolutePaths: string[], targetFolderPath: string) => void
}

// SVG icon for file types
function getFileIcon(node: FileNode, isExpanded: boolean): ReactNode {
  if (node.type === 'folder') {
    return isExpanded
      ? <FolderOpenIcon size={15} style={{ color: '#5a9bcf' }} />
      : <FolderIcon size={15} style={{ color: '#5a9bcf' }} />
  }

  const ext = node.name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'md':
    case 'markdown':
      return <MarkdownIcon size={15} className="text-[var(--color-accent)]" />
    case 'json':
      return <FileJsonIcon size={15} style={{ color: '#dba04a' }} />
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return <CodeIcon size={15} style={{ color: '#4ec9b0' }} />
    case 'css':
    case 'scss':
      return <PaletteIcon size={15} style={{ color: '#b07cd8' }} />
    case 'pdf':
      return <PdfIcon size={15} style={{ color: '#e5322d' }} />
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <ImageIcon size={15} style={{ color: '#56b886' }} />
    default:
      return <FileTextIcon size={15} className="text-[var(--color-text-muted)]" />
  }
}

function FileNodeComponent({
  node,
  depth,
  isSelected,
  isExpanded,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onClick,
  onContextMenu,
  onDrop,
  onExternalDrop
}: FileNodeProps) {
  const indent = depth * 16
  const icon = getFileIcon(node, isExpanded)
  const dragCounterRef = useRef(0)
  const nodeRef = useRef<HTMLDivElement>(null)

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData('text/plain', node.path)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnter = (e: DragEvent) => {
    if (node.type !== 'folder') return
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (dragCounterRef.current === 1 && nodeRef.current) {
      nodeRef.current.style.backgroundColor = 'var(--color-accent-light)'
      nodeRef.current.style.outline = '1px dashed var(--color-accent)'
      nodeRef.current.style.outlineOffset = '-1px'
    }
  }

  const handleDragOver = (e: DragEvent) => {
    if (node.type !== 'folder') return
    e.preventDefault()
    e.stopPropagation()
    // External files from OS → copy; internal files → move
    const hasFiles = e.dataTransfer.types.includes('Files')
    e.dataTransfer.dropEffect = hasFiles ? 'copy' : 'move'
  }

  const handleDragLeave = (e: DragEvent) => {
    if (node.type !== 'folder') return
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0 && nodeRef.current) {
      nodeRef.current.style.backgroundColor = ''
      nodeRef.current.style.outline = ''
      nodeRef.current.style.outlineOffset = ''
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    if (nodeRef.current) {
      nodeRef.current.style.backgroundColor = ''
      nodeRef.current.style.outline = ''
      nodeRef.current.style.outlineOffset = ''
    }

    if (node.type !== 'folder') return

    // External files from OS (Finder / Explorer)
    if (e.dataTransfer.files.length > 0) {
      const paths = Array.from(e.dataTransfer.files)
        .map((f) => (f as any).path as string)
        .filter(Boolean)
      if (paths.length > 0) {
        onExternalDrop(paths, node.path)
        return
      }
    }

    // Internal move
    const sourcePath = e.dataTransfer.getData('text/plain')
    if (!sourcePath || sourcePath === node.path) return
    if (node.path.startsWith(sourcePath + '/')) return
    onDrop(sourcePath, node.path)
  }

  const handleDragEnd = () => {
    dragCounterRef.current = 0
    if (nodeRef.current) {
      nodeRef.current.style.backgroundColor = ''
      nodeRef.current.style.outline = ''
      nodeRef.current.style.outlineOffset = ''
    }
  }

  return (
    <div
      ref={nodeRef}
      className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-[3px] text-sm
        transition-colors duration-100 select-none
        ${
          isSelected
            ? 'bg-[var(--color-accent-light)] text-[var(--color-text-primary)]'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
        }`}
      style={{ paddingLeft: `${indent + 8}px` }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      draggable={!isRenaming}
      onDragStart={handleDragStart}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
    >
      {/* Folder expand indicator */}
      {node.type === 'folder' && (
        <span className="flex w-3 items-center justify-center text-[var(--color-text-muted)]">
          {isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
        </span>
      )}

      {/* Icon */}
      <span className="flex flex-shrink-0 items-center">{icon}</span>

      {/* Name or rename input */}
      {isRenaming ? (
        <input
          autoFocus
          type="text"
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRenameSubmit()
            if (e.key === 'Escape') onRenameSubmit()
          }}
          onBlur={onRenameSubmit}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 rounded-md border border-[var(--color-accent)] bg-[var(--color-bg-primary)]
                     px-1 py-0 text-xs text-[var(--color-text-primary)] outline-none"
        />
      ) : (
        <span className="truncate">{node.name}</span>
      )}
    </div>
  )
}

export default FileNodeComponent
