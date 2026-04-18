import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAiStore, ChatMessage } from '../../stores/ai-store'
import { useEditorStore } from '../../stores/editor-store'
import { useFileStore } from '../../stores/file-store'
import { useI18n } from '../../i18n'
import { XIcon, SparklesIcon } from '../common/Icons'

// ---- Icons ----
function SendIcon({ size = 16 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>)
}
function StopIcon({ size = 16 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>)
}
function KeyIcon({ size = 16 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>)
}
function TrashIcon({ size = 14 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>)
}
function CopyIcon({ size = 14 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>)
}
function SaveIcon({ size = 14 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>)
}
function CheckIcon({ size = 14 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>)
}
function PageSummaryIcon({ size = 16 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>)
}
function DocSummaryIcon({ size = 16 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>)
}
function DeepReadIcon({ size = 16 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>)
}
function KeywordsIcon({ size = 16 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>)
}
function StudySummarizeIcon({ size = 16 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="3" y2="18" /></svg>)
}
function StudyDeepReadIcon({ size = 16 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>)
}
function StudyKeyPointsIcon({ size = 16 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>)
}
function StudyNoteIcon({ size = 16 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>)
}
function StudyQuizIcon({ size = 16 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>)
}
function StudyExplainIcon({ size = 16 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>)
}

// ---- Assistant message ----
function AssistantMessage({ msg, isLast, isGenerating }: { msg: ChatMessage; isLast: boolean; isGenerating: boolean }) {
  const { t } = useI18n()
  const { tabs, activeTabId } = useEditorStore()
  const { loadFileTree } = useFileStore()
  const activeTab = tabs.find((tab) => tab.id === activeTabId)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle')
  const showLoading = !msg.content && isGenerating && isLast

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(msg.content)
    setCopyState('copied')
    setTimeout(() => setCopyState('idle'), 2000)
  }, [msg.content])

  const handleSaveLocal = useCallback(async () => {
    if (!activeTab?.filePath) return
    try {
      const filePath = activeTab.filePath
      const lastSlash = filePath.lastIndexOf('/')
      const dir = lastSlash >= 0 ? filePath.substring(0, lastSlash) : ''
      const fileNameWithExt = lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath
      const dotIdx = fileNameWithExt.lastIndexOf('.')
      const baseName = dotIdx >= 0 ? fileNameWithExt.substring(0, dotIdx) : fileNameWithExt
      const tree = await window.electronAPI.file.getFileTree()
      let seq = 1
      const findInTree = (nodes: any[], name: string): boolean => {
        for (const n of nodes) {
          if (n.name === name) return true
          if (n.children && findInTree(n.children, name)) return true
        }
        return false
      }
      while (seq <= 99) {
        const candidate = `${baseName}-ai${String(seq).padStart(2, '0')}.md`
        if (!findInTree(tree, candidate)) {
          await window.electronAPI.file.createFile(dir, candidate)
          const newPath = dir ? `${dir}/${candidate}` : candidate
          await window.electronAPI.file.writeFile(newPath, msg.content)
          await loadFileTree()
          setSaveState('saved')
          setTimeout(() => setSaveState('idle'), 2000)
          break
        }
        seq++
      }
    } catch (err) {
      console.error('Failed to save AI result:', err)
    }
  }, [msg.content, activeTab, loadFileTree])

  if (showLoading) {
    return (
      <div className="py-1">
        <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
          <div className="flex gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative">
      <div className="text-[13px] leading-relaxed text-[var(--color-text-primary)] ai-markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
      </div>
      {/* Hover action bar */}
      {msg.content && !isGenerating && (
        <div className="flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button onClick={handleCopy} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors" title={t('ai.copy')}>
            {copyState === 'copied' ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
            {copyState === 'copied' ? t('ai.copied') : t('ai.copy')}
          </button>
          <button onClick={handleSaveLocal} disabled={!activeTab} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors disabled:opacity-30" title={t('ai.saveLocal')}>
            {saveState === 'saved' ? <CheckIcon size={11} /> : <SaveIcon size={11} />}
            {saveState === 'saved' ? t('ai.saved') : t('ai.saveLocal')}
          </button>
        </div>
      )}
    </div>
  )
}

// ---- Quick action card ----
function QuickActionCard({ icon, label, desc, loading, disabled, onClick }: {
  icon: React.ReactNode; label: string; desc: string; loading?: boolean; disabled?: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-left bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-100 group">
      <span className="flex-shrink-0 text-[var(--color-accent)] opacity-60 group-hover:opacity-100 transition-opacity">
        {loading ? <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> : icon}
      </span>
      <span className="flex flex-col min-w-0">
        <span className="text-[12px] font-medium text-[var(--color-text-primary)] leading-tight">{label}</span>
        <span className="text-[10px] text-[var(--color-text-muted)] leading-snug truncate">{desc}</span>
      </span>
    </button>
  )
}

// ---- Study quick actions ----
const STUDY_ACTIONS = [
  { key: 'summarize', icon: StudySummarizeIcon, labelKey: 'ai.study.summarize', descKey: 'ai.study.summarizeDesc', promptKey: 'ai.study.prompt.summarize' },
  { key: 'deepRead', icon: StudyDeepReadIcon, labelKey: 'ai.study.deepRead', descKey: 'ai.study.deepReadDesc', promptKey: 'ai.study.prompt.deepRead' },
  { key: 'keyPoints', icon: StudyKeyPointsIcon, labelKey: 'ai.study.keyPoints', descKey: 'ai.study.keyPointsDesc', promptKey: 'ai.study.prompt.keyPoints' },
  { key: 'studyNote', icon: StudyNoteIcon, labelKey: 'ai.study.studyNote', descKey: 'ai.study.studyNoteDesc', promptKey: 'ai.study.prompt.studyNote' },
  { key: 'quiz', icon: StudyQuizIcon, labelKey: 'ai.study.quiz', descKey: 'ai.study.quizDesc', promptKey: 'ai.study.prompt.quiz' },
  { key: 'explain', icon: StudyExplainIcon, labelKey: 'ai.study.explain', descKey: 'ai.study.explainDesc', promptKey: 'ai.study.prompt.explain' }
] as const

// ---- Main panel ----
function AiChatPanel() {
  const { t } = useI18n()
  const {
    isOpen, close, isGenerating, messages,
    sendMessage, cancel, clearMessages, checkTokenStatus, tokenConfigured, tokenPreview, saveToken,
    pdfContext, setPdfContext, pdfPageInfo, pdfExtractText,
    _appendChunk, _finishGeneration, _setError
  } = useAiStore()
  const { tabs, activeTabId } = useEditorStore()
  const activeTab = tabs.find((tab) => tab.id === activeTabId)

  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [keySaveState, setKeySaveState] = useState<'idle' | 'saving' | 'success' | 'failed'>('idle')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Check token status on mount
  useEffect(() => {
    if (isOpen && tokenConfigured === null) checkTokenStatus()
  }, [isOpen, tokenConfigured, checkTokenStatus])

  // IPC streaming events
  useEffect(() => {
    if (!isOpen) return
    const u1 = window.electronAPI.ai.onStreamChunk((d) => _appendChunk(d.content))
    const u2 = window.electronAPI.ai.onStreamEnd(() => _finishGeneration())
    const u3 = window.electronAPI.ai.onStreamError((e) => _setError(e.message))
    return () => { u1(); u2(); u3() }
  }, [isOpen, _appendChunk, _finishGeneration, _setError])

  // Handle API key save
  const handleSaveKey = useCallback(async () => {
    const trimmed = keyInput.trim()
    if (!trimmed) return
    setKeySaveState('saving')
    const result = await saveToken(trimmed)
    if (result.success) {
      setKeySaveState('success')
      setKeyInput('')
      setTimeout(() => { setKeySaveState('idle'); setShowSettings(false) }, 1200)
    } else {
      setKeySaveState('failed')
      setTimeout(() => setKeySaveState('idle'), 2000)
    }
  }, [keyInput, saveToken])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isGenerating])
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 100) }, [isOpen])
  useEffect(() => { setPdfContext(null) }, [activeTabId, setPdfContext])
  useEffect(() => { if (pdfContext && isOpen) setTimeout(() => inputRef.current?.focus(), 100) }, [pdfContext, isOpen])

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || isGenerating) return
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    let fileContext: string | undefined
    if (activeTab?.fileType === 'pdf' && pdfContext?.text) {
      fileContext = pdfContext.text
    } else {
      fileContext = activeTab?.content || undefined
    }
    sendMessage(text, fileContext)
  }, [input, isGenerating, sendMessage, activeTab, pdfContext])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }, [handleSend])

  // PDF quick actions
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null)
  const handlePdfQuickAction = useCallback(async (actionKey: string) => {
    if (!pdfExtractText || isGenerating || quickActionLoading) return
    setQuickActionLoading(actionKey)
    try {
      let contextText = '', prompt = '', contextLabel = ''
      if (actionKey === 'summarize-page') {
        const p = pdfPageInfo?.currentPage ?? 1
        contextText = await pdfExtractText(p)
        prompt = t('pdf.ai.prompt.summarizePage').replace('{page}', String(p))
        contextLabel = `${t('pdf.ai.quickAction.page')} ${p}`
      } else if (actionKey === 'summarize-doc') {
        contextText = await pdfExtractText()
        prompt = t('pdf.ai.prompt.summarizeDoc')
        contextLabel = `${pdfPageInfo?.totalPages ?? '?'} ${t('pdf.pages')}`
      } else if (actionKey === 'deep-read') {
        const p = pdfPageInfo?.currentPage ?? 1
        contextText = await pdfExtractText(p)
        prompt = t('pdf.ai.prompt.deepRead').replace('{page}', String(p))
        contextLabel = `${t('pdf.ai.quickAction.page')} ${p}`
      } else if (actionKey === 'keywords') {
        contextText = await pdfExtractText()
        prompt = t('pdf.ai.prompt.keywords')
        contextLabel = `${pdfPageInfo?.totalPages ?? '?'} ${t('pdf.pages')}`
      }
      if (!contextText.trim()) return
      useAiStore.getState().setPdfContext({
        type: actionKey === 'summarize-page' || actionKey === 'deep-read' ? 'page' : 'full-text',
        text: contextText, label: contextLabel
      })
      sendMessage(prompt, contextText)
    } finally { setQuickActionLoading(null) }
  }, [pdfExtractText, pdfPageInfo, isGenerating, quickActionLoading, t, sendMessage])

  // Study quick actions
  const [studyActionLoading, setStudyActionLoading] = useState<string | null>(null)
  const handleStudyAction = useCallback((actionKey: string) => {
    if (isGenerating || studyActionLoading) return
    const action = STUDY_ACTIONS.find((a) => a.key === actionKey)
    if (!action) return
    setStudyActionLoading(actionKey)
    sendMessage(t(action.promptKey), activeTab?.content || undefined)
    setStudyActionLoading(null)
  }, [isGenerating, studyActionLoading, t, activeTab, sendMessage])

  if (!isOpen) return null

  const notConfigured = tokenConfigured === false

  return (
    <div className="flex h-full w-80 flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-primary)]">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between h-10 px-3 border-b border-[var(--color-border)] flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <SparklesIcon size={13} />
          <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">AI</span>
          {tokenConfigured && (
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 ml-0.5" title={t('ai.claudeReady')} />
          )}
        </div>
        <div className="flex items-center">
          {messages.length > 0 && (
            <button onClick={clearMessages} className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors" title={t('ai.clearResult')}>
              <TrashIcon size={13} />
            </button>
          )}
          <button onClick={() => setShowSettings(!showSettings)} className={`p-1 rounded-md transition-colors ${showSettings ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'}`} title={t('ai.apiKeyLabel')}>
            <KeyIcon size={13} />
          </button>
          <button onClick={close} className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors">
            <XIcon size={13} />
          </button>
        </div>
      </div>

      {/* ---- API Key settings ---- */}
      {showSettings && (
        <div className="px-3 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">{t('ai.apiKeyLabel')}</span>
            {tokenConfigured && tokenPreview && (
              <span className="text-[10px] text-green-600 dark:text-green-400 font-mono bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">{tokenPreview}</span>
            )}
          </div>
          <div className="flex gap-1.5 mb-1.5">
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveKey() }}
              placeholder={t('ai.apiKeyPlaceholder') as string}
              className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)]/50 font-mono"
            />
            <button
              onClick={handleSaveKey}
              disabled={!keyInput.trim() || keySaveState === 'saving'}
              className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
                keySaveState === 'success'
                  ? 'bg-green-500 text-white'
                  : keySaveState === 'failed'
                    ? 'bg-red-500 text-white'
                    : 'bg-[var(--color-accent)] text-white hover:opacity-90'
              }`}
            >
              {keySaveState === 'saving' ? t('ai.apiKeySaving') : keySaveState === 'success' ? t('ai.apiKeySuccess') : keySaveState === 'failed' ? t('ai.apiKeyFailed') : t('ai.saveKey')}
            </button>
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
            {t('ai.apiKeyHint')} {t('ai.apiKeyHintGetKey')}
          </p>
        </div>
      )}

      {/* ---- Messages area ---- */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Not configured state */}
        {messages.length === 0 && notConfigured && (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center mb-3">
              <KeyIcon size={20} />
            </div>
            <p className="text-[13px] font-medium text-[var(--color-text-primary)] mb-1">{t('ai.keyNotConfigured')}</p>
            <p className="text-[11px] text-[var(--color-text-muted)] text-center mb-4 leading-relaxed">
              {t('ai.keyNotConfiguredDesc')}
            </p>
            <button onClick={() => setShowSettings(true)} className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-[12px] font-medium text-white hover:opacity-90 transition-opacity">
              {t('ai.configureKey')}
            </button>
          </div>
        )}

        {/* PDF quick actions */}
        {messages.length === 0 && !notConfigured && activeTab?.fileType === 'pdf' && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">{t('pdf.ai.quickActions')}</p>
            {[
              { key: 'summarize-page', icon: <PageSummaryIcon size={14} />, label: t('pdf.ai.quickAction.summarizePage').replace('{page}', String(pdfPageInfo?.currentPage ?? 1)), desc: t('pdf.ai.quickAction.summarizePageDesc') },
              { key: 'summarize-doc', icon: <DocSummaryIcon size={14} />, label: t('pdf.ai.quickAction.summarizeDoc'), desc: t('pdf.ai.quickAction.summarizeDocDesc').replace('{total}', String(pdfPageInfo?.totalPages ?? '?')) },
              { key: 'deep-read', icon: <DeepReadIcon size={14} />, label: t('pdf.ai.quickAction.deepRead').replace('{page}', String(pdfPageInfo?.currentPage ?? 1)), desc: t('pdf.ai.quickAction.deepReadDesc') },
              { key: 'keywords', icon: <KeywordsIcon size={14} />, label: t('pdf.ai.quickAction.keywords'), desc: t('pdf.ai.quickAction.keywordsDesc') }
            ].map((a) => (
              <QuickActionCard key={a.key} icon={a.icon} label={a.label} desc={a.desc}
                loading={quickActionLoading === a.key} disabled={isGenerating || quickActionLoading !== null}
                onClick={() => handlePdfQuickAction(a.key)} />
            ))}
          </div>
        )}

        {/* Study quick actions */}
        {messages.length === 0 && !notConfigured && activeTab?.fileType !== 'pdf' && activeTab?.content && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">{t('ai.study.quickActions')}</p>
            {STUDY_ACTIONS.map((action) => {
              const IconComp = action.icon
              return (
                <QuickActionCard key={action.key} icon={<IconComp size={14} />}
                  label={t(action.labelKey)} desc={t(action.descKey)}
                  loading={studyActionLoading === action.key}
                  disabled={isGenerating || studyActionLoading !== null}
                  onClick={() => handleStudyAction(action.key)} />
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && !notConfigured && activeTab?.fileType !== 'pdf' && !activeTab?.content && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center mb-3">
              <SparklesIcon size={18} />
            </div>
            <p className="text-[12px] text-[var(--color-text-muted)]">{t('ai.noResult')}</p>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2 text-[13px] leading-relaxed bg-[var(--color-accent)] text-white">
                <pre className="whitespace-pre-wrap break-words font-sans">{msg.content}</pre>
              </div>
            </div>
          ) : (
            <AssistantMessage key={msg.id} msg={msg} isLast={i === messages.length - 1} isGenerating={isGenerating} />
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ---- PDF context chip ---- */}
      {activeTab?.fileType === 'pdf' && pdfContext && (
        <div className="flex items-center gap-1.5 mx-3 mb-1 px-2 py-1 rounded-md text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)]">
          <span className="truncate flex-1">
            {pdfContext.type === 'selection' && `PDF Selection (${pdfContext.label})`}
            {pdfContext.type === 'full-text' && `PDF (${pdfContext.label})`}
            {pdfContext.type === 'annotations' && `PDF Notes (${pdfContext.label})`}
          </span>
          <button onClick={() => setPdfContext(null)} className="flex-shrink-0 hover:text-[var(--color-text-primary)] transition-colors">
            <XIcon size={10} />
          </button>
        </div>
      )}

      {/* ---- Input area ---- */}
      <div className="px-3 pb-3 pt-1 flex-shrink-0">
        <div className={`relative rounded-xl border bg-[var(--color-bg-secondary)] transition-colors duration-150 ${
          notConfigured ? 'border-[var(--color-border)] opacity-50' : 'border-[var(--color-border)] focus-within:border-[var(--color-accent)] focus-within:ring-1 focus-within:ring-[var(--color-accent)]/20'
        }`}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={notConfigured ? (t('ai.keyPlaceholderDisabled') as string) : (t('ai.customPrompt') as string)}
            disabled={isGenerating || notConfigured}
            className="w-full resize-none bg-transparent px-3 pt-2.5 pb-8 text-[13px] text-[var(--color-text-primary)] focus:outline-none placeholder:text-[var(--color-text-muted)]/50 disabled:cursor-not-allowed"
            rows={1}
            style={{ minHeight: '36px', maxHeight: '120px' }}
          />
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
            {isGenerating ? (
              <button onClick={cancel} className="rounded-lg p-1.5 bg-red-500 text-white hover:bg-red-600 transition-colors" title={t('ai.cancel')}>
                <StopIcon size={14} />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() || notConfigured}
                className="rounded-lg p-1.5 bg-[var(--color-accent)] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                <SendIcon size={14} />
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 text-[10px] text-[var(--color-text-muted)]/50 text-center">
          Enter {t('ai.send')} / Shift+Enter {t('ai.newline') || '换行'}
        </p>
      </div>
    </div>
  )
}

export default AiChatPanel
