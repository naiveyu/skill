import { useEffect, useRef, useCallback, useState, lazy, Suspense } from 'react'
import { useEditorStore } from '../../stores/editor-store'
import { useI18n } from '../../i18n'
import { HistoryIcon, EyeIcon, EyeOffIcon, PenLineIcon, ArrowUpIcon, ArrowDownIcon, ListIcon, CodeIcon, ShareIcon, SparklesIcon } from '../common/Icons'
import TabBar from './TabBar'
import SourceEditor from './SourceEditor'
import type { SourceEditorRef } from './SourceEditor'
import type { RichTextEditorRef } from './RichTextEditor'
import { useAiStore } from '../../stores/ai-store'

// Lazy load heavy components to speed up initial render
const RichTextEditor = lazy(() => import('./RichTextEditor'))
const MarkdownPreview = lazy(() => import('./MarkdownPreview'))
const HeadingOutline = lazy(() => import('./HeadingOutline'))
const HistoryPanel = lazy(() => import('../git/HistoryPanel'))
const PublishModal = lazy(() => import('../publish/PublishModal'))
const PDFViewer = lazy(() => import('./pdf/PDFViewer'))
const ImageViewer = lazy(() => import('./ImageViewer'))
const VideoViewer = lazy(() => import('./VideoViewer'))
const AiChatPanel = lazy(() => import('../ai/AiChatPanel'))

const AUTO_SAVE_DELAY = 1000
const SCROLL_THRESHOLD = 0.02 // Consider "at top" or "at bottom" within 2%

function EditorContainer() {
  const { tabs, activeTabId, showPreview, editorMode, setEditorMode, updateContent, togglePreview, saveFile } =
    useEditorStore()
  const { t } = useI18n()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sourceEditorRef = useRef<SourceEditorRef>(null)
  const richEditorRef = useRef<RichTextEditorRef>(null)

  // Bidirectional scroll sync: separate scroll targets for each side
  const [previewScrollTo, setPreviewScrollTo] = useState<number | undefined>(undefined)
  const [editorScrollTo, setEditorScrollTo] = useState<number | undefined>(undefined)
  const scrollSourceRef = useRef<'editor' | 'preview' | null>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [showHistory, setShowHistory] = useState(false)
  const [showOutline, setShowOutline] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [showScrollButtons, setShowScrollButtons] = useState(true)
  const [scrollFraction, setScrollFraction] = useState(0)
  const { isOpen: showAiChat, toggle: toggleAiChat } = useAiStore()

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const isPdfFile = activeTab?.fileType === 'pdf'
  const isImageFile = activeTab?.fileType === 'image'
  const isVideoFile = activeTab?.fileType === 'video'
  const isMarkdownFile = activeTab?.filePath.endsWith('.md') || activeTab?.filePath.endsWith('.markdown')
  const effectiveMode = isMarkdownFile ? editorMode : 'source'

  const isAtTop = scrollFraction <= SCROLL_THRESHOLD
  const isAtBottom = scrollFraction >= 1 - SCROLL_THRESHOLD

  // Auto-save: debounce content changes by 1s
  const handleContentChange = useCallback(
    (content: string) => {
      if (!activeTabId) return

      updateContent(activeTabId, content)

      // Clear existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }

      // Set new auto-save timer
      saveTimerRef.current = setTimeout(() => {
        saveFile(activeTabId)
      }, AUTO_SAVE_DELAY)
    },
    [activeTabId, updateContent, saveFile]
  )

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    }
  }, [])

  // Keyboard shortcut: Ctrl/Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (activeTabId) {
          if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current)
          }
          saveFile(activeTabId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTabId, saveFile])

  // Reset scroll when switching tabs
  useEffect(() => {
    setPreviewScrollTo(undefined)
    setEditorScrollTo(undefined)
    setScrollFraction(0)
    scrollSourceRef.current = null
  }, [activeTabId])

  // Editor scrolled → track position + sync preview
  const handleEditorScroll = useCallback((fraction: number) => {
    setScrollFraction(fraction)

    if (scrollSourceRef.current === 'preview') return
    if (!showPreview) return
    scrollSourceRef.current = 'editor'
    setPreviewScrollTo(fraction)
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      scrollSourceRef.current = null
    }, 100)
  }, [showPreview])

  // Preview scrolled → sync editor
  const handlePreviewScroll = useCallback((fraction: number) => {
    if (scrollSourceRef.current === 'editor') return
    scrollSourceRef.current = 'preview'
    setEditorScrollTo(fraction)
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      scrollSourceRef.current = null
    }, 100)
  }, [])

  // Heading outline click → scroll editor to heading
  const handleHeadingClick = useCallback((line: number, index: number) => {
    if (effectiveMode === 'rich') {
      richEditorRef.current?.scrollToHeading(index)
    } else {
      sourceEditorRef.current?.scrollToLine(line)
    }
  }, [effectiveMode])

  // Empty state
  if (!activeTab) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="text-[var(--color-text-muted)] opacity-30">
          <PenLineIcon size={48} />
        </div>
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">
          {t('editor.emptyTitle')}
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)] opacity-70">
          {t('editor.emptySubtitle')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col bg-[var(--color-bg-primary)]">
      {/* Tab bar */}
      <TabBar />

      {/* PDF mode: PDFViewer with minimal toolbar (AI button) */}
      <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-muted)]">Loading...</div>}>
      {isPdfFile ? (
        <>
          <div className="flex items-center border-b border-[var(--color-border)] px-3 py-1 gap-1">
            <div className="flex-1" />
            <button
              onClick={toggleAiChat}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150
                ${showAiChat
                  ? 'text-[var(--color-accent)] bg-[var(--color-accent-light)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                }`}
              title={t('ai.title')}
            >
              <SparklesIcon size={14} />
              AI
            </button>
          </div>
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <PDFViewer key={activeTab.id} filePath={activeTab.filePath} />
            </div>
            {showAiChat && <AiChatPanel />}
          </div>
        </>
      ) : isImageFile ? (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <ImageViewer key={activeTab.id} filePath={activeTab.filePath} />
        </div>
      ) : isVideoFile ? (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <VideoViewer key={activeTab.id} filePath={activeTab.filePath} />
        </div>
      ) : (
      <>
      {/* Toolbar */}
      <div className="flex items-center border-b border-[var(--color-border)] px-3 py-1 gap-1">
        {/* Left side */}
        <button
          onClick={() => setShowOutline(!showOutline)}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150
            ${showOutline
              ? 'text-[var(--color-accent)] bg-[var(--color-accent-light)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
            }`}
          title={t('editor.toggleOutline')}
        >
          <ListIcon size={14} />
          {t('editor.outline')}
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side */}
        <button
          onClick={() => setShowScrollButtons(!showScrollButtons)}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all duration-150
            ${showScrollButtons
              ? 'text-[var(--color-accent)] bg-[var(--color-accent-light)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
            }`}
          title={t('editor.toggleScrollButtons')}
        >
          <ArrowUpIcon size={12} />
          <ArrowDownIcon size={12} />
        </button>
        {effectiveMode === 'source' && (
          <button
            onClick={togglePreview}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]
                       hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]
                       transition-all duration-150"
            title={t('editor.togglePreview')}
          >
            {showPreview ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
            {showPreview ? t('editor.hidePreview') : t('editor.showPreview')}
          </button>
        )}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150
            ${showHistory
              ? 'text-[var(--color-accent)] bg-[var(--color-accent-light)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
            }`}
          title={t('editor.toggleHistory')}
        >
          <HistoryIcon size={14} />
          {t('editor.history')}
        </button>
        <button
          onClick={toggleAiChat}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150
            ${showAiChat
              ? 'text-[var(--color-accent)] bg-[var(--color-accent-light)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
            }`}
          title={t('ai.title')}
        >
          <SparklesIcon size={14} />
          AI
        </button>
        <button
          onClick={() => setShowPublish(true)}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150
            text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
          title={t('publish.publish')}
        >
          <ShareIcon size={14} />
          {t('publish.publish')}
        </button>

        {/* Editor mode toggle */}
        {isMarkdownFile && (
          <div className="flex items-center rounded-md border border-[var(--color-border)] overflow-hidden ml-1">
            <button
              onClick={() => setEditorMode('rich')}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium transition-all duration-150
                ${editorMode === 'rich'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
                }`}
              title={t('editor.richMode')}
            >
              <PenLineIcon size={12} />
              {t('editor.rich')}
            </button>
            <button
              onClick={() => setEditorMode('source')}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium transition-all duration-150
                ${editorMode === 'source'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
                }`}
              title={t('editor.sourceMode')}
            >
              <CodeIcon size={12} />
              {t('editor.source')}
            </button>
          </div>
        )}
      </div>

      {/* Editor content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Heading outline (left panel) */}
        {showOutline && (
          <HeadingOutline
            content={activeTab.content}
            onHeadingClick={handleHeadingClick}
          />
        )}

        {effectiveMode === 'rich' ? (
          /* Rich text mode */
          <div className="relative flex-1">
            <RichTextEditor
              ref={richEditorRef}
              key={activeTab.id}
              value={activeTab.content}
              filePath={activeTab.filePath}
              onChange={handleContentChange}
              onScroll={(fraction) => setScrollFraction(fraction)}
            />

            {/* Floating scroll buttons */}
            {showScrollButtons && (
              <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-10">
                <button
                  onClick={() => richEditorRef.current?.scrollToTop()}
                  className={`flex h-7 w-7 items-center justify-center rounded-md shadow-sm
                             border transition-all duration-150
                             ${isAtBottom
                               ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white opacity-90 hover:opacity-100'
                               : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] opacity-50 hover:opacity-100'
                             }`}
                  title={t('editor.scrollToTop')}
                >
                  <ArrowUpIcon size={14} />
                </button>
                <button
                  onClick={() => richEditorRef.current?.scrollToBottom()}
                  className={`flex h-7 w-7 items-center justify-center rounded-md shadow-sm
                             border transition-all duration-150
                             ${isAtTop
                               ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white opacity-90 hover:opacity-100'
                               : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] opacity-50 hover:opacity-100'
                             }`}
                  title={t('editor.scrollToBottom')}
                >
                  <ArrowDownIcon size={14} />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Source code mode */
          <>
            <div className={`relative ${showPreview ? 'w-1/2 border-r border-[var(--color-border)]' : 'flex-1'}`}>
              <SourceEditor
                ref={sourceEditorRef}
                value={activeTab.content}
                onChange={handleContentChange}
                onScroll={handleEditorScroll}
                scrollTo={editorScrollTo}
              />

              {/* Floating scroll buttons */}
              {showScrollButtons && (
                <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
                  <button
                    onClick={() => sourceEditorRef.current?.scrollToTop()}
                    className={`flex h-7 w-7 items-center justify-center rounded-md shadow-sm
                               border transition-all duration-150
                               ${isAtBottom
                                 ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white opacity-90 hover:opacity-100'
                                 : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] opacity-50 hover:opacity-100'
                               }`}
                    title={t('editor.scrollToTop')}
                  >
                    <ArrowUpIcon size={14} />
                  </button>
                  <button
                    onClick={() => sourceEditorRef.current?.scrollToBottom()}
                    className={`flex h-7 w-7 items-center justify-center rounded-md shadow-sm
                               border transition-all duration-150
                               ${isAtTop
                                 ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white opacity-90 hover:opacity-100'
                                 : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] opacity-50 hover:opacity-100'
                               }`}
                    title={t('editor.scrollToBottom')}
                  >
                    <ArrowDownIcon size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Markdown preview (right) */}
            {showPreview && (
              <div className="w-1/2">
                <MarkdownPreview
                  content={activeTab.content}
                  scrollTo={previewScrollTo}
                  onScroll={handlePreviewScroll}
                />
              </div>
            )}
          </>
        )}

        {/* AI chat panel (right side) */}
        {showAiChat && <AiChatPanel />}
      </div>

      {/* File version history (bottom panel) */}
      {showHistory && (
        <div className="h-56 flex-shrink-0">
          <HistoryPanel
            filePath={activeTab.filePath}
            onClose={() => setShowHistory(false)}
          />
        </div>
      )}

      {/* Publish modal */}
      <PublishModal isOpen={showPublish} onClose={() => setShowPublish(false)} />
      </>
      )}
      </Suspense>
    </div>
  )
}

export default EditorContainer
