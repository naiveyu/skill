import { useState, useCallback, KeyboardEvent } from 'react'
import { useI18n } from '../../../i18n'

interface PDFTagEditorProps {
  tags: string[]
  onChange: (tags: string[]) => void
  onClose: () => void
}

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function PDFTagEditor({ tags, onChange, onClose }: PDFTagEditorProps) {
  const { t } = useI18n()
  const [inputValue, setInputValue] = useState('')

  const handleAddTag = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    if (tags.includes(trimmed)) {
      setInputValue('')
      return
    }
    onChange([...tags, trimmed])
    setInputValue('')
  }, [inputValue, tags, onChange])

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      onChange(tags.filter((tag) => tag !== tagToRemove))
    },
    [tags, onChange]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddTag()
      }
    },
    [handleAddTag]
  )

  return (
    <div
      className="flex flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-primary)]"
      style={{ width: 240, flexShrink: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
        <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">
          {t('pdf.tags') || 'Tags'}
        </h3>
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-md p-0.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors duration-150"
          title={t('common.close') || 'Close'}
        >
          <XIcon size={14} />
        </button>
      </div>

      {/* Tag list */}
      <div className="flex-1 overflow-auto px-3 py-2">
        {tags.length === 0 && (
          <p className="text-xs text-[var(--color-text-muted)] italic">
            {t('pdf.noTags') || 'No tags yet.'}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-[var(--color-accent-light)] px-2.5 py-0.5 text-xs text-[var(--color-accent)]"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="flex items-center justify-center rounded-full hover:bg-[var(--color-accent)] hover:text-white transition-colors duration-150"
                style={{ width: 14, height: 14 }}
                title={`Remove "${tag}"`}
              >
                <XIcon size={10} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-[var(--color-border)] px-3 py-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('pdf.addTag') || 'Add tag...'}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors duration-150"
        />
      </div>
    </div>
  )
}

export default PDFTagEditor
