import { useEffect, useCallback, useState } from 'react'
import { useVersionStore } from '../../stores/git-store'
import { useEditorStore } from '../../stores/editor-store'
import { useI18n } from '../../i18n'
import { XIcon } from '../common/Icons'
import type { TranslationKey } from '../../i18n/locales/en'

interface HistoryPanelProps {
  filePath: string
  onClose: () => void
}

function formatRelativeTime(timestamp: number, t: (key: TranslationKey, params?: Record<string, string | number>) => string): string {
  const now = Date.now()
  const diff = now - timestamp * 1000
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (seconds < 60) return t('time.justNow')
  if (minutes < 60) return t('time.minutesAgo', { n: minutes })
  if (hours < 24) return t('time.hoursAgo', { n: hours })
  if (days < 7) return t('time.daysAgo', { n: days })
  if (weeks < 4) return t('time.weeksAgo', { n: weeks })
  return t('time.monthsAgo', { n: months })
}

function HistoryPanel({ filePath, onClose }: HistoryPanelProps) {
  const {
    versions, selectedSha, versionContent, isLoadingContent, isSaving,
    loadVersions, selectVersion, clearSelection, saveVersion, restoreVersion
  } = useVersionStore()
  const { tabs, activeTabId, saveFile, reloadFile } = useEditorStore()
  const { t } = useI18n()

  const [description, setDescription] = useState('')

  useEffect(() => {
    loadVersions(filePath)
  }, [filePath])

  const handleVersionClick = useCallback((sha: string) => {
    if (selectedSha === sha) {
      clearSelection()
    } else {
      selectVersion(sha, filePath)
    }
  }, [filePath, selectedSha, selectVersion, clearSelection])

  const handleSaveVersion = useCallback(async () => {
    if (!description.trim()) return
    try {
      // Ensure current editor content is saved to disk first
      if (activeTabId) {
        await saveFile(activeTabId)
      }
      await saveVersion(filePath, description.trim())
      // Reload file to pick up updated front matter timestamp
      await reloadFile(filePath)
      setDescription('')
    } catch {
      // Error already logged in store
    }
  }, [filePath, description, saveVersion, activeTabId, saveFile, reloadFile])

  const handleRestore = useCallback(async () => {
    if (!selectedSha) return
    const confirmed = window.confirm(t('version.restoreConfirm'))
    if (!confirmed) return

    try {
      await restoreVersion(filePath, selectedSha)
      clearSelection()
      await reloadFile(filePath)
      loadVersions(filePath)
    } catch {
      // Error already logged in store
    }
  }, [filePath, selectedSha, restoreVersion, clearSelection, reloadFile, loadVersions, t])

  return (
    <div className="flex h-full border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      {/* Left: version list + save input */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-[var(--color-border)]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--color-border)]">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
            {t('version.title')}
          </span>
          <button
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded-md text-[var(--color-text-muted)]
                       hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors duration-150"
          >
            <XIcon size={12} />
          </button>
        </div>

        {/* Save version input */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--color-border)]">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveVersion()
            }}
            placeholder={t('version.descriptionPlaceholder')}
            className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]
                       px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none
                       focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-light)]
                       transition-all duration-150"
          />
          <button
            onClick={handleSaveVersion}
            disabled={!description.trim() || isSaving}
            className="rounded-md bg-[var(--color-accent)] px-2.5 py-1 text-xs font-medium text-white
                       hover:bg-[var(--color-accent-hover)] shadow-sm transition-all duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isSaving ? t('version.saving') : t('version.save')}
          </button>
        </div>

        {/* Version list */}
        <div className="flex-1 overflow-y-auto thin-scrollbar">
          {versions.length === 0 ? (
            <div className="px-3 py-4 text-xs text-[var(--color-text-muted)]">
              {t('version.empty')}
            </div>
          ) : (
            <div className="flex flex-col">
              {versions.map((v) => (
                <button
                  key={v.sha}
                  onClick={() => handleVersionClick(v.sha)}
                  className={`w-full px-3 py-2 text-left transition-colors duration-100 hover:bg-[var(--color-bg-tertiary)]
                    ${selectedSha === v.sha ? 'bg-[var(--color-accent-light)]' : ''}`}
                >
                  <div className="truncate text-xs font-medium text-[var(--color-text-primary)]">
                    {v.message}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    {formatRelativeTime(v.author.timestamp, t)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: version content preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedSha ? (
          <>
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-secondary)]">
                {t('version.preview')}
              </span>
              <button
                onClick={handleRestore}
                className="rounded-md bg-[var(--color-accent)] px-3 py-1 text-xs font-medium text-white
                           hover:bg-[var(--color-accent-hover)] shadow-sm transition-all duration-150"
              >
                {t('version.restore')}
              </button>
            </div>
            <div className="flex-1 overflow-auto thin-scrollbar p-3">
              {isLoadingContent ? (
                <div className="text-xs text-[var(--color-text-muted)]">{t('version.loading')}</div>
              ) : (
                <pre className="whitespace-pre-wrap break-words text-xs text-[var(--color-text-secondary)] font-mono leading-relaxed">
                  {versionContent}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-[var(--color-text-muted)]">
            {t('version.selectToPreview')}
          </div>
        )}
      </div>
    </div>
  )
}

export default HistoryPanel
