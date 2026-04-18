// ---- Annotation tool type ----

export type AnnotationTool = 'cursor' | 'highlight' | 'underline' | 'note' | 'text' | 'area' | 'ink' | 'eraser'

// ---- Annotation variant interfaces ----

export interface PdfHighlightAnnotation {
  id: string
  type: 'highlight'
  page: number // 0-indexed
  rects: Array<{ x: number; y: number; w: number; h: number }> // normalized 0-1
  color: string // hex e.g. '#ffeb3b'
  selectedText: string
  comment: string
  createdAt: number
  updatedAt: number
}

export interface PdfUnderlineAnnotation {
  id: string
  type: 'underline'
  page: number
  rects: Array<{ x: number; y: number; w: number; h: number }>
  color: string
  selectedText: string
  comment: string
  createdAt: number
  updatedAt: number
}

export interface PdfNoteAnnotation {
  id: string
  type: 'note'
  page: number
  position: { x: number; y: number } // normalized 0-1
  content: string
  color: string
  createdAt: number
  updatedAt: number
}

export interface PdfTextAnnotation {
  id: string
  type: 'text'
  page: number
  position: { x: number; y: number }
  content: string
  color: string
  fontSize: number
  createdAt: number
  updatedAt: number
}

export interface PdfAreaAnnotation {
  id: string
  type: 'area'
  page: number
  rect: { x: number; y: number; w: number; h: number }
  comment: string
  color: string
  createdAt: number
  updatedAt: number
}

export interface PdfInkAnnotation {
  id: string
  type: 'ink'
  page: number
  paths: Array<Array<{ x: number; y: number }>> // multiple strokes
  color: string
  strokeWidth: number
  createdAt: number
  updatedAt: number
}

// ---- Union type ----

export type PdfAnnotation =
  | PdfHighlightAnnotation
  | PdfUnderlineAnnotation
  | PdfNoteAnnotation
  | PdfTextAnnotation
  | PdfAreaAnnotation
  | PdfInkAnnotation

// ---- Sidecar meta ----

export interface PdfSidecarMeta {
  version: 1
  tags: string[]
  title: string
  annotations: PdfAnnotation[]
  createdAt: number
  updatedAt: number
}

export function createEmptyPdfMeta(title: string): PdfSidecarMeta {
  const now = Date.now()
  return {
    version: 1,
    tags: [],
    title,
    annotations: [],
    createdAt: now,
    updatedAt: now
  }
}
