import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { useSettingsStore } from '../../stores/settings-store'

export interface SourceEditorRef {
  scrollToTop: () => void
  scrollToBottom: () => void
  scrollToLine: (line: number) => void
}

interface SourceEditorProps {
  value: string
  onChange: (value: string) => void
  onScroll?: (scrollFraction: number) => void
  scrollTo?: number
}

const SourceEditor = forwardRef<SourceEditorRef, SourceEditorProps>(
  function SourceEditor({ value, onChange, onScroll, scrollTo }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)
    const onChangeRef = useRef(onChange)
    const onScrollRef = useRef(onScroll)
    const isProgrammaticScroll = useRef(false)
    const { theme } = useSettingsStore()

    // Keep refs up to date
    onChangeRef.current = onChange
    onScrollRef.current = onScroll

    // Expose imperative methods
    useImperativeHandle(ref, () => ({
      scrollToTop: () => {
        const view = viewRef.current
        if (!view) return
        view.dispatch({
          effects: EditorView.scrollIntoView(0, { y: 'start', yMargin: 0 })
        })
      },
      scrollToBottom: () => {
        const view = viewRef.current
        if (!view) return
        const lastLine = view.state.doc.line(view.state.doc.lines)
        view.dispatch({
          effects: EditorView.scrollIntoView(lastLine.to, { y: 'end', yMargin: 0 })
        })
      },
      scrollToLine: (line: number) => {
        const view = viewRef.current
        if (!view) return
        const lineCount = view.state.doc.lines
        const targetLine = Math.min(Math.max(1, line), lineCount)
        const pos = view.state.doc.line(targetLine).from
        view.dispatch({
          effects: EditorView.scrollIntoView(pos, { y: 'start', yMargin: 50 })
        })
      }
    }), [])

    // Create editor on mount
    useEffect(() => {
      if (!containerRef.current) return

      const extensions = [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString()
            onChangeRef.current(newValue)
          }
        }),
        EditorView.lineWrapping
      ]

      // Apply dark theme if needed
      if (theme === 'dark') {
        extensions.push(oneDark)
      }

      const state = EditorState.create({
        doc: value,
        extensions
      })

      const view = new EditorView({
        state,
        parent: containerRef.current
      })

      viewRef.current = view

      // Listen for scroll events on the CodeMirror scroll DOM
      const scrollDOM = view.scrollDOM
      const handleScroll = () => {
        if (isProgrammaticScroll.current) return
        if (!onScrollRef.current) return
        const { scrollTop, scrollHeight, clientHeight } = scrollDOM
        const maxScroll = scrollHeight - clientHeight
        const fraction = maxScroll > 0 ? scrollTop / maxScroll : 0
        onScrollRef.current(fraction)
      }
      scrollDOM.addEventListener('scroll', handleScroll)

      return () => {
        scrollDOM.removeEventListener('scroll', handleScroll)
        view.destroy()
        viewRef.current = null
      }
    }, [theme]) // Recreate editor when theme changes

    // Update content when value prop changes externally
    useEffect(() => {
      const view = viewRef.current
      if (!view) return

      const currentValue = view.state.doc.toString()
      if (currentValue !== value) {
        view.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: value
          }
        })
      }
    }, [value])

    // Apply external scroll position (from preview sync)
    useEffect(() => {
      const view = viewRef.current
      if (!view || scrollTo === undefined) return

      const scrollDOM = view.scrollDOM
      const maxScroll = scrollDOM.scrollHeight - scrollDOM.clientHeight
      if (maxScroll <= 0) return

      const targetTop = scrollTo * maxScroll
      if (Math.abs(scrollDOM.scrollTop - targetTop) < 1) return

      isProgrammaticScroll.current = true
      scrollDOM.scrollTop = targetTop
      requestAnimationFrame(() => {
        isProgrammaticScroll.current = false
      })
    }, [scrollTo])

    return (
      <div
        ref={containerRef}
        className="h-full w-full overflow-hidden"
      />
    )
  }
)

export default SourceEditor
