import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import './pdf-worker-setup'

import type { PdfSidecarMeta, PdfAnnotation, AnnotationTool } from '@shared/types/pdf-meta'
import { useI18n } from '../../../i18n'
import { useAiStore } from '../../../stores/ai-store'
import PDFToolbar from './PDFToolbar'
import PDFAnnotationLayer from './PDFAnnotationLayer'
import PDFTagEditor from './PDFTagEditor'

interface PDFViewerProps {
  filePath: string
}

const DEBOUNCE_SAVE_DELAY = 800
const DEFAULT_COLOR = '#ffeb3b'

function PDFViewer({ filePath }: PDFViewerProps) {
  const { t } = useI18n()

  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null)
  const [meta, setMeta] = useState<PdfSidecarMeta | null>(null)
  const [showTagEditor, setShowTagEditor] = useState(false)
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Annotation tool state
  const [activeTool, setActiveTool] = useState<AnnotationTool>('cursor')
  const [activeColor, setActiveColor] = useState(DEFAULT_COLOR)
  const [extracting, setExtracting] = useState(false)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pdfDocRef = useRef<any>(null)
  const fullTextCache = useRef<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])

  // Memoize file prop to prevent react-pdf from re-loading on every render
  const fileData = useMemo(
    () => (pdfData ? { data: pdfData } : null),
    [pdfData]
  )

  // Load PDF binary and sidecar meta on mount
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [binary, sidecar] = await Promise.all([
          window.electronAPI.file.readBinaryFile(filePath),
          window.electronAPI.pdfMeta.readMeta(filePath)
        ])

        if (cancelled) return

        // Deep copy via Array.from to guarantee a fresh, undetached ArrayBuffer
        setPdfData(new Uint8Array(Array.from(new Uint8Array(binary))))
        setMeta(sidecar)
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load PDF:', err)
          setError(t('pdf.loadError') || 'Failed to load PDF file.')
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [filePath, t])

  // Cleanup save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  // Debounced save helper
  const debouncedSaveMeta = useCallback(
    (updatedMeta: PdfSidecarMeta) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        window.electronAPI.pdfMeta.writeMeta(filePath, updatedMeta)
      }, DEBOUNCE_SAVE_DELAY)
    },
    [filePath]
  )

  // Annotation CRUD
  const handleAddAnnotation = useCallback(
    (annotation: PdfAnnotation) => {
      if (!meta) return
      const updatedMeta: PdfSidecarMeta = {
        ...meta,
        annotations: [...meta.annotations, annotation],
        updatedAt: Date.now()
      }
      setMeta(updatedMeta)
      debouncedSaveMeta(updatedMeta)
    },
    [meta, debouncedSaveMeta]
  )

  const handleUpdateAnnotation = useCallback(
    (id: string, changes: Partial<PdfAnnotation>) => {
      if (!meta) return
      const updatedMeta: PdfSidecarMeta = {
        ...meta,
        annotations: meta.annotations.map((ann) =>
          ann.id === id ? { ...ann, ...changes, updatedAt: Date.now() } as PdfAnnotation : ann
        ),
        updatedAt: Date.now()
      }
      setMeta(updatedMeta)
      debouncedSaveMeta(updatedMeta)
    },
    [meta, debouncedSaveMeta]
  )

  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      if (!meta) return
      const updatedMeta: PdfSidecarMeta = {
        ...meta,
        annotations: meta.annotations.filter((ann) => ann.id !== id),
        updatedAt: Date.now()
      }
      setMeta(updatedMeta)
      debouncedSaveMeta(updatedMeta)
      if (selectedAnnotation === id) setSelectedAnnotation(null)
    },
    [meta, debouncedSaveMeta, selectedAnnotation]
  )

  // Tag changes
  const handleTagsChange = useCallback(
    (tags: string[]) => {
      if (!meta) return
      const updatedMeta: PdfSidecarMeta = {
        ...meta,
        tags,
        updatedAt: Date.now()
      }
      setMeta(updatedMeta)
      debouncedSaveMeta(updatedMeta)
      window.electronAPI.tag.updateNoteTags(filePath, tags)
    },
    [meta, debouncedSaveMeta, filePath]
  )

  // ---- AI integration ----

  // Extract text for a single page (1-based) or all pages
  const extractTextForPage = useCallback(async (pageNum: number): Promise<string> => {
    const doc = pdfDocRef.current
    if (!doc) return ''
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()
    return content.items
      .filter((item: any) => item.str)
      .map((item: any) => item.str)
      .join(' ')
  }, [])

  const extractFullText = useCallback(async (): Promise<string> => {
    if (fullTextCache.current) return fullTextCache.current
    const doc = pdfDocRef.current
    if (!doc) return ''

    const pages: string[] = []
    for (let i = 1; i <= numPages; i++) {
      const text = await extractTextForPage(i)
      if (text.trim()) pages.push(`[Page ${i}]\n${text}`)
    }
    fullTextCache.current = pages.join('\n\n')
    return fullTextCache.current
  }, [numPages, extractTextForPage])

  // Unified extract function: page=undefined means full doc, page=N means single page
  const extractText = useCallback(async (page?: number): Promise<string> => {
    if (page !== undefined) return extractTextForPage(page)
    return extractFullText()
  }, [extractTextForPage, extractFullText])

  // Register extractText + page info in the store; clean up on unmount/filePath change
  useEffect(() => {
    const store = useAiStore.getState()
    store.setPdfExtractText(extractText)
    return () => {
      useAiStore.getState().setPdfExtractText(null)
      useAiStore.getState().setPdfPageInfo(null)
    }
  }, [extractText])

  // Track current visible page with IntersectionObserver
  useEffect(() => {
    if (numPages === 0) return
    const ratios = new Map<number, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = Number(entry.target.getAttribute('data-page-index'))
          ratios.set(idx, entry.intersectionRatio)
        }
        // Find most visible page
        let bestIdx = 0
        let bestRatio = -1
        ratios.forEach((ratio, idx) => {
          if (ratio > bestRatio) { bestRatio = ratio; bestIdx = idx }
        })
        useAiStore.getState().setPdfPageInfo({
          currentPage: bestIdx + 1,
          totalPages: numPages
        })
      },
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0], root: scrollContainerRef.current }
    )

    pageRefs.current.forEach((el, idx) => {
      if (el) {
        el.setAttribute('data-page-index', String(idx))
        observer.observe(el)
      }
    })

    return () => observer.disconnect()
  }, [numPages])

  const aggregateAnnotations = useCallback((): { text: string; count: number } => {
    if (!meta) return { text: '', count: 0 }
    const lines: string[] = []
    for (const ann of meta.annotations) {
      if ((ann.type === 'highlight' || ann.type === 'underline') && ann.selectedText) {
        lines.push(`[${ann.type}, P${ann.page + 1}] "${ann.selectedText}"${ann.comment ? ` -- ${ann.comment}` : ''}`)
      } else if (ann.type === 'note' && ann.content) {
        lines.push(`[Note, P${ann.page + 1}] ${ann.content}`)
      } else if (ann.type === 'area' && ann.comment) {
        lines.push(`[Area, P${ann.page + 1}] ${ann.comment}`)
      }
    }
    return { text: lines.join('\n'), count: lines.length }
  }, [meta])

  const handleAskAi = useCallback((text: string) => {
    useAiStore.getState().openWithContext({
      type: 'selection',
      text,
      label: `${text.length} ${t('pdf.ai.chars') || 'chars'}`
    })
  }, [t])

  const handleSummarizePdf = useCallback(async () => {
    setExtracting(true)
    try {
      const fullText = await extractFullText()
      if (!fullText) return
      const store = useAiStore.getState()
      if (!store.isOpen) store.toggle()
      store.setPdfContext({
        type: 'full-text',
        text: fullText,
        label: `${numPages} ${t('pdf.pages') || 'pages'}`
      })
      store.sendMessage(t('pdf.ai.summarizePrompt') || 'Please summarize the key points of this PDF:', fullText)
    } finally {
      setExtracting(false)
    }
  }, [extractFullText, numPages, t])

  const handleSummarizeNotes = useCallback(() => {
    const { text, count } = aggregateAnnotations()
    if (!text) return
    const store = useAiStore.getState()
    if (!store.isOpen) store.toggle()
    store.setPdfContext({
      type: 'annotations',
      text,
      label: `${count} ${t('pdf.ai.items') || 'items'}`
    })
    store.sendMessage(
      t('pdf.ai.summarizeNotesPrompt') || 'Please organize and summarize these PDF annotations:',
      text
    )
  }, [aggregateAnnotations, t])

  const hasAnnotations = (meta?.annotations.length ?? 0) > 0

  function onDocumentLoadSuccess(doc: any) {
    setNumPages(doc.numPages)
    pdfDocRef.current = doc
  }

  function onDocumentLoadError(err: Error) {
    console.error('react-pdf Document load error:', err)
    setError(`PDF parse error: ${err.message}`)
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-primary)]">
        <p className="text-sm text-[var(--color-text-muted)]">{error}</p>
      </div>
    )
  }

  // Loading state
  if (!pdfData) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-primary)]">
        <p className="text-sm text-[var(--color-text-muted)]">
          {t('pdf.loading') || 'Loading PDF...'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col bg-[var(--color-bg-primary)]">
      {/* Toolbar */}
      <PDFToolbar
        numPages={numPages}
        scale={scale}
        onScaleChange={setScale}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        activeColor={activeColor}
        onColorChange={setActiveColor}
        onToggleTags={() => setShowTagEditor(!showTagEditor)}
        showTagEditor={showTagEditor}
        onSummarizePdf={handleSummarizePdf}
        onSummarizeNotes={handleSummarizeNotes}
        extracting={extracting}
        hasAnnotations={hasAnnotations}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF scrollable area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-[var(--color-bg-secondary)] select-text">
          <div className="flex flex-col items-center py-4 gap-4">
            <Document
              className="flex flex-col items-center"
              file={fileData}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <p className="py-8 text-sm text-[var(--color-text-muted)]">
                  {t('pdf.loading') || 'Loading PDF...'}
                </p>
              }
              error={
                <p className="py-8 text-sm text-red-500">
                  {t('pdf.loadError') || 'Failed to load PDF.'}
                </p>
              }
            >
              {Array.from({ length: numPages }, (_, index) => (
                <div
                  key={index}
                  ref={(el) => { pageRefs.current[index] = el }}
                  className="relative mb-4 shadow-lg"
                >
                  <Page
                    pageNumber={index + 1}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                  <PDFAnnotationLayer
                    pageIndex={index}
                    scale={scale}
                    activeTool={activeTool}
                    activeColor={activeColor}
                    annotations={
                      meta?.annotations.filter((a) => a.page === index) ?? []
                    }
                    onAddAnnotation={handleAddAnnotation}
                    onUpdateAnnotation={handleUpdateAnnotation}
                    onDeleteAnnotation={handleDeleteAnnotation}
                    onAskAi={handleAskAi}
                  />
                </div>
              ))}
            </Document>
          </div>
        </div>

        {/* Tag editor sidebar */}
        {showTagEditor && (
          <PDFTagEditor
            tags={meta?.tags ?? []}
            onChange={handleTagsChange}
            onClose={() => setShowTagEditor(false)}
          />
        )}
      </div>
    </div>
  )
}

export default PDFViewer
