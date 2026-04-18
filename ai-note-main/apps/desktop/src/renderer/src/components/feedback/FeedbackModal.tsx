import { useState, useEffect, useCallback, useRef } from 'react'
import { useI18n } from '../../i18n'
import { XIcon, BugIcon, LightbulbIcon } from '../common/Icons'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

type FeedbackType = 'bug' | 'feature'

function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { t } = useI18n()
  const [type, setType] = useState<FeedbackType>('bug')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setType('bug')
      setTitle('')
      setDescription('')
      setImages([])
      setSubmitting(false)
      setSubmitted(false)
      setError(null)
    }
  }, [isOpen])

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    },
    [onClose, submitting]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (images.length >= 3) return
      if (!file.type.startsWith('image/')) return
      if (file.size > 5 * 1024 * 1024) return // 5MB limit per image

      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        setImages((prev) => prev.length < 3 ? [...prev, base64] : prev)
      }
      reader.readAsDataURL(file)
    })

    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  // Paste image from clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/') && images.length < 3) {
        const file = item.getAsFile()
        if (!file) continue
        const reader = new FileReader()
        reader.onload = () => {
          setImages((prev) => prev.length < 3 ? [...prev, reader.result as string] : prev)
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return
    setSubmitting(true)
    setError(null)

    const result = await window.electronAPI.feedback.submit({
      type,
      title: title.trim(),
      description: description.trim(),
      images: images.length > 0 ? images : undefined,
    })

    setSubmitting(false)
    if (result.success) {
      setSubmitted(true)
    } else {
      setError(result.error || t('feedback.submitError'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => !submitting && onClose()}>
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md rounded-xl bg-[var(--color-bg-primary)]
                   border border-[var(--color-border)]"
        style={{ boxShadow: 'var(--shadow-float)' }}
        onClick={(e) => e.stopPropagation()}
        onPaste={handlePaste}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {t('feedback.title')}
          </h2>
          {!submitting && (
            <button
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)]
                         hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]
                         transition-colors duration-150"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>

        {/* Body */}
        {submitted ? (
          <div className="p-6 text-center">
            <div className="text-3xl mb-3">&#10003;</div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('feedback.thankYou')}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">{t('feedback.thankYouDesc')}</p>
            <button
              onClick={onClose}
              className="mt-4 rounded-md px-4 py-1.5 text-sm font-medium text-white
                         bg-[var(--color-accent)] hover:opacity-90 transition-all duration-150"
            >
              {t('feedback.close')}
            </button>
          </div>
        ) : (
          <>
            <div className="p-4 space-y-3">
              {/* Type toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setType('bug')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-medium
                    transition-all duration-150
                    ${type === 'bug'
                      ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
                    }`}
                >
                  <BugIcon size={14} />
                  {t('feedback.bug')}
                </button>
                <button
                  onClick={() => setType('feature')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-medium
                    transition-all duration-150
                    ${type === 'feature'
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
                    }`}
                >
                  <LightbulbIcon size={14} />
                  {t('feedback.feature')}
                </button>
              </div>

              {/* Title */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={submitting}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]
                           px-3 py-1.5 text-sm text-[var(--color-text-primary)]
                           focus:border-[var(--color-accent)] focus:outline-none
                           disabled:opacity-50"
                placeholder={t('feedback.titlePlaceholder')}
                maxLength={200}
              />

              {/* Description */}
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
                rows={4}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]
                           px-3 py-1.5 text-sm text-[var(--color-text-primary)] resize-none
                           focus:border-[var(--color-accent)] focus:outline-none
                           disabled:opacity-50"
                placeholder={t('feedback.descPlaceholder')}
                maxLength={5000}
              />

              {/* Image upload */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {t('feedback.screenshots')} ({images.length}/3)
                  </span>
                  {images.length < 3 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting}
                      className="text-xs text-[var(--color-accent)] hover:underline disabled:opacity-50"
                    >
                      {t('feedback.addImage')}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>

                {images.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {images.map((img, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={img}
                          alt={`screenshot ${i + 1}`}
                          className="h-16 w-16 rounded-md object-cover border border-[var(--color-border)]"
                        />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full
                                     bg-red-500 text-white flex items-center justify-center
                                     text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                  {t('feedback.pasteHint')}
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="text-xs text-red-500 bg-red-50 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
              <button
                onClick={onClose}
                disabled={submitting}
                className="rounded-md px-4 py-1.5 text-sm font-medium text-[var(--color-text-secondary)]
                           hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50
                           transition-colors duration-150"
              >
                {t('feedback.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !title.trim() || !description.trim()}
                className="rounded-md px-4 py-1.5 text-sm font-medium text-white
                           bg-[var(--color-accent)] hover:opacity-90
                           disabled:opacity-40 disabled:cursor-not-allowed
                           transition-all duration-150"
              >
                {submitting ? t('feedback.submitting') : t('feedback.submit')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default FeedbackModal
