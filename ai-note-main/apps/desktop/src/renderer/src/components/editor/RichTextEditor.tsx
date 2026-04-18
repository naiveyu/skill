import { useCallback, useRef, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core'
import { filterSuggestionItems } from '@blocknote/core/extensions'
import { SuggestionMenuController, getDefaultReactSlashMenuItems } from '@blocknote/react'
import '@blocknote/mantine/style.css'
import { useSettingsStore } from '../../stores/settings-store'
import { splitFrontMatter, joinFrontMatter } from '../../utils/front-matter'
import { DrawingBlock } from './DrawingBlock'

export interface RichTextEditorRef {
  scrollToTop: () => void
  scrollToBottom: () => void
  scrollToHeading: (index: number) => void
}

interface RichTextEditorProps {
  value: string
  filePath: string
  onChange: (value: string) => void
  onScroll?: (fraction: number) => void
}

// Get the assets directory path relative to workspace for a given note
function getAssetsDir(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/')
  const dir = lastSlash >= 0 ? filePath.substring(0, lastSlash) : ''
  return dir ? `${dir}/assets` : 'assets'
}

const IMAGE_MIME_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/avif'
])

/// Regex to match drawing markdown: ![drawing](*.excalidraw) or ![drawing](*.excalidraw =200)
const DRAWING_MD_REGEX = /^!\[drawing\]\(([^)\s]*\.excalidraw)(?:\s+=(\d+))?\)\s*$/

// Custom schema with drawing block — created once at module level
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    drawing: DrawingBlock(),
  },
})

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  function RichTextEditor({ value, filePath, onChange, onScroll }, ref) {
    const { theme } = useSettingsStore()
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange
    const filePathRef = useRef(filePath)
    filePathRef.current = filePath

    // Separate front matter from body
    const { frontMatter, body } = useMemo(() => splitFrontMatter(value), [value])
    const frontMatterRef = useRef(frontMatter)
    frontMatterRef.current = frontMatter

    // Debounce timer for markdown conversion
    const debounceRef = useRef<ReturnType<typeof setTimeout>>()

    // Convert a workspace-relative path to local-asset:// URL
    const toAssetUrl = useCallback((relativePath: string): string => {
      return `local-asset://workspace-file/${encodeURIComponent(relativePath).replace(/%2F/g, '/')}`
    }, [])

    // Upload handler for BlockNote drag & drop (F-06 ~ F-09)
    const uploadFile = useCallback(async (file: File): Promise<string> => {
      if (!IMAGE_MIME_TYPES.has(file.type)) return ''

      // In Electron, dragged files have a .path property with the absolute path
      const absPath = (file as File & { path?: string }).path
      if (!absPath) return ''

      const assetsDir = getAssetsDir(filePathRef.current)
      const savedPaths = await window.electronAPI.file.saveDroppedImages([absPath], assetsDir)
      if (savedPaths.length === 0) return ''

      return toAssetUrl(savedPaths[0])
    }, [toAssetUrl])

    // Create BlockNote editor with custom schema
    const editor = useCreateBlockNote(
      {
        schema,
        initialContent: undefined,
        trailingBlock: true,
        uploadFile,
      },
      []
    )

    // Parse initial markdown into blocks after editor is ready
    useMemo(() => {
      if (!editor || !body) return
      try {
        // Extract drawing blocks from markdown before parsing
        const drawingBlocks: Array<{ line: number; src: string }> = []
        const lines = body.split('\n')
        const filteredLines: string[] = []

        for (let i = 0; i < lines.length; i++) {
          const match = lines[i].match(DRAWING_MD_REGEX)
          if (match) {
            drawingBlocks.push({ line: filteredLines.length, src: match[1], height: match[2] || '' })
            // Insert a placeholder that we'll replace after parsing
            filteredLines.push(`<!-- drawing:${match[1]}${match[2] ? `:${match[2]}` : ''} -->`)
          } else {
            filteredLines.push(lines[i])
          }
        }

        // Convert relative image paths to local-asset:// URLs before parsing
        const resolvedBody = filteredLines.join('\n').replace(
          /!\[([^\]]*)\]\((?!https?:\/\/|data:|local-asset:)([^)]+)\)/g,
          (_match, alt, src) => `![${alt}](${toAssetUrl(src)})`
        )

        const blocks = editor.tryParseMarkdownToBlocks(resolvedBody)

        // Insert drawing blocks at the right positions
        if (drawingBlocks.length > 0) {
          // Find paragraph blocks containing our placeholder comments and replace them
          const finalBlocks: any[] = []
          for (const block of blocks) {
            // Check if this block contains a drawing placeholder
            const blockText = block.content?.[0]?.text || ''
            const placeholderMatch = blockText.match(/<!-- drawing:(.+?)(?::(\d+))? -->/)
            if (placeholderMatch) {
              finalBlocks.push({
                type: 'drawing',
                props: { src: placeholderMatch[1], height: placeholderMatch[2] || '' },
              })
            } else {
              finalBlocks.push(block)
            }
          }

          if (finalBlocks.length > 0) {
            editor.replaceBlocks(editor.document, finalBlocks)
          }
        } else if (blocks.length > 0) {
          editor.replaceBlocks(editor.document, blocks)
        }
      } catch (e) {
        console.error('Failed to parse markdown to blocks:', e)
      }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const wrapperRef = useRef<HTMLDivElement>(null)

    // Handle clipboard paste for images (F-01 ~ F-05)
    useEffect(() => {
      const wrapper = wrapperRef.current
      if (!wrapper) return

      const handlePaste = async (e: ClipboardEvent): Promise<void> => {
        if (!e.clipboardData) return

        // Check if clipboard contains image data or files
        const hasImage = Array.from(e.clipboardData.items).some(
          (item) => item.type.startsWith('image/')
        )
        if (!hasImage) return // F-05: don't intercept non-image paste

        e.preventDefault()
        e.stopPropagation()

        const assetsDir = getAssetsDir(filePathRef.current)

        try {
          // Main process handles both file paths (Finder copy) and raw image data (screenshot)
          const savedPaths = await window.electronAPI.file.saveImageFromClipboard(assetsDir)
          if (!savedPaths || savedPaths.length === 0) return

          for (const rel of savedPaths) {
            editor.insertBlocks(
              [{ type: 'image', props: { url: toAssetUrl(rel) } }],
              editor.getTextCursorPosition().block,
              'after'
            )
          }
        } catch (err) {
          console.error('Failed to paste image:', err)
        }
      }

      wrapper.addEventListener('paste', handlePaste, true)
      return () => wrapper.removeEventListener('paste', handlePaste, true)
    }, [editor, toAssetUrl])

    // Insert a drawing block at cursor position
    const insertDrawingBlock = useCallback(async () => {
      const assetsDir = getAssetsDir(filePathRef.current)
      try {
        const relativePath = await window.electronAPI.file.createDrawing(assetsDir)
        if (!relativePath) return
        editor.insertBlocks(
          [{ type: 'drawing' as const, props: { src: relativePath } }],
          editor.getTextCursorPosition().block,
          'after'
        )
      } catch (err) {
        console.error('Failed to insert drawing:', err)
      }
    }, [editor])

    // Custom slash menu items (must return Promise for BlockNote 0.46+)
    const getSlashMenuItems = useCallback(
      async (query: string) => {
        const defaultItems = getDefaultReactSlashMenuItems(editor)
        const drawingItem = {
          title: 'Drawing Board',
          subtext: 'Insert an interactive drawing canvas',
          onItemClick: () => insertDrawingBlock(),
          aliases: ['drawing', 'canvas', 'sketch', 'draw', '画板'],
          group: 'Drawing',
          icon: <span style={{ fontSize: 18 }}>✏️</span>,
        }
        return filterSuggestionItems([...defaultItems, drawingItem], query)
      },
      [editor, insertDrawingBlock]
    )

    // Handle BlockNote content changes - debounced markdown conversion
    const handleChange = useCallback(() => {
      if (!editor) return
      if (debounceRef.current) clearTimeout(debounceRef.current)

      debounceRef.current = setTimeout(() => {
        try {
          // Serialize blocks to markdown, handling drawing blocks specially
          const blocks = editor.document
          const markdownParts: string[] = []
          const nonDrawingBlocks: any[] = []

          // Process blocks: separate drawing blocks from regular blocks
          for (const block of blocks) {
            if (block.type === 'drawing') {
              // Flush accumulated non-drawing blocks
              if (nonDrawingBlocks.length > 0) {
                let md = editor.blocksToMarkdownLossy(nonDrawingBlocks)
                md = md.replace(/local-asset:\/\/workspace-file\//g, '')
                markdownParts.push(md)
                nonDrawingBlocks.length = 0
              }
              // Add drawing markdown (with optional height)
              const src = (block.props as any).src
              const h = (block.props as any).height
              if (src) {
                const suffix = h ? ` =${h}` : ''
                markdownParts.push(`![drawing](${src}${suffix})\n`)
              }
            } else {
              nonDrawingBlocks.push(block)
            }
          }

          // Flush remaining non-drawing blocks
          if (nonDrawingBlocks.length > 0) {
            let md = editor.blocksToMarkdownLossy(nonDrawingBlocks)
            md = md.replace(/local-asset:\/\/workspace-file\//g, '')
            markdownParts.push(md)
          }

          const markdownBody = markdownParts.join('\n')
          const fullMarkdown = joinFrontMatter(frontMatterRef.current, markdownBody)
          onChangeRef.current(fullMarkdown)
        } catch (e) {
          console.error('Failed to convert blocks to markdown:', e)
        }
      }, 200)
    }, [editor])

    const onScrollRef = useRef(onScroll)
    onScrollRef.current = onScroll

    useImperativeHandle(ref, () => ({
      scrollToTop: () => {
        wrapperRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      },
      scrollToBottom: () => {
        if (!wrapperRef.current) return
        wrapperRef.current.scrollTo({ top: wrapperRef.current.scrollHeight, behavior: 'smooth' })
      },
      scrollToHeading: (index: number) => {
        if (!wrapperRef.current) return
        const headings = wrapperRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6')
        if (index >= 0 && index < headings.length) {
          headings[index].scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      },
    }), [])

    const handleScroll = useCallback(() => {
      if (!wrapperRef.current || !onScrollRef.current) return
      const { scrollTop, scrollHeight, clientHeight } = wrapperRef.current
      const maxScroll = scrollHeight - clientHeight
      const fraction = maxScroll > 0 ? scrollTop / maxScroll : 0
      onScrollRef.current(fraction)
    }, [])

    return (
      <div ref={wrapperRef} onScroll={handleScroll} className="rich-editor-wrapper absolute inset-0 overflow-y-auto">
        <div className="mx-auto max-w-[800px] px-4 py-6">
          <BlockNoteView
            editor={editor}
            theme={theme === 'dark' ? 'dark' : 'light'}
            onChange={handleChange}
            slashMenu={false}
          >
            <SuggestionMenuController
              triggerCharacter="/"
              getItems={getSlashMenuItems}
            />
          </BlockNoteView>
        </div>
      </div>
    )
  }
)

export default RichTextEditor
