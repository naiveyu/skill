import { create } from 'zustand'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface PdfAiContext {
  type: 'selection' | 'full-text' | 'annotations' | 'page'
  text: string
  label: string
}

export interface PdfPageInfo {
  currentPage: number
  totalPages: number
}

interface AiState {
  isOpen: boolean
  isGenerating: boolean
  messages: ChatMessage[]
  tokenConfigured: boolean | null
  tokenPreview: string | null

  pdfContext: PdfAiContext | null
  setPdfContext: (ctx: PdfAiContext | null) => void
  openWithContext: (ctx: PdfAiContext) => void

  pdfPageInfo: PdfPageInfo | null
  setPdfPageInfo: (info: PdfPageInfo | null) => void
  pdfExtractText: ((page?: number) => Promise<string>) | null
  setPdfExtractText: (fn: ((page?: number) => Promise<string>) | null) => void

  toggle: () => void
  close: () => void
  sendMessage: (content: string, fileContext?: string) => Promise<void>
  cancel: () => Promise<void>
  clearMessages: () => void
  checkTokenStatus: () => Promise<void>
  saveToken: (token: string) => Promise<{ success: boolean }>

  _appendChunk: (chunk: string) => void
  _finishGeneration: () => void
  _setError: (msg: string) => void
}

let msgCounter = 0
function genId(): string {
  return `msg-${Date.now()}-${++msgCounter}`
}

export const useAiStore = create<AiState>((set, get) => ({
  isOpen: false,
  isGenerating: false,
  messages: [],
  tokenConfigured: null,
  tokenPreview: null,

  pdfContext: null,
  setPdfContext: (ctx) => set({ pdfContext: ctx }),
  openWithContext: (ctx) => set({ isOpen: true, pdfContext: ctx }),

  pdfPageInfo: null,
  setPdfPageInfo: (info) => set({ pdfPageInfo: info }),
  pdfExtractText: null,
  setPdfExtractText: (fn) => set({ pdfExtractText: fn }),

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  close: () => set({ isOpen: false }),

  sendMessage: async (content, fileContext?) => {
    const userMsg: ChatMessage = { id: genId(), role: 'user', content, timestamp: Date.now() }
    const assistantMsg: ChatMessage = { id: genId(), role: 'assistant', content: '', timestamp: Date.now() }

    set((s) => ({
      messages: [...s.messages, userMsg, assistantMsg],
      isGenerating: true
    }))

    const prompt = fileContext
      ? `${content}\n\n---\nFile content:\n${fileContext}`
      : content

    try {
      await window.electronAPI.ai.send(prompt)
    } catch (err: any) {
      set((s) => {
        const msgs = [...s.messages]
        const last = msgs[msgs.length - 1]
        if (last?.role === 'assistant') {
          last.content = `Error: ${err?.message || 'Failed to send message'}`
        }
        return { messages: msgs, isGenerating: false }
      })
    }
  },

  cancel: async () => {
    try { await window.electronAPI.ai.cancel() } catch {}
    set({ isGenerating: false })
  },

  clearMessages: () => set({ messages: [] }),

  checkTokenStatus: async () => {
    try {
      const status = await window.electronAPI.ai.getTokenStatus()
      set({
        tokenConfigured: status.configured,
        tokenPreview: status.preview || null
      })
    } catch {
      set({ tokenConfigured: false, tokenPreview: null })
    }
  },

  saveToken: async (token: string) => {
    try {
      const result = await window.electronAPI.ai.saveToken(token)
      if (result.success) {
        await get().checkTokenStatus()
      }
      return result
    } catch {
      return { success: false }
    }
  },

  _appendChunk: (chunk) =>
    set((s) => {
      const msgs = [...s.messages]
      const last = msgs[msgs.length - 1]
      if (last?.role === 'assistant') last.content += chunk
      return { messages: msgs }
    }),

  _finishGeneration: () => set({ isGenerating: false }),

  _setError: (msg) =>
    set((s) => {
      const msgs = [...s.messages]
      const last = msgs[msgs.length - 1]
      if (last?.role === 'assistant' && !last.content) last.content = `Error: ${msg}`
      return { messages: msgs, isGenerating: false }
    })
}))
