import { useState, useEffect, useCallback } from 'react'
import { usePublishStore } from '../../stores/publish-store'
import { useEditorStore } from '../../stores/editor-store'
import { useI18n } from '../../i18n'
import { XIcon } from '../common/Icons'
import PlatformCard from './PlatformCard'
import type { PublishPlatform, PublishOptions } from '@ai-note/shared-types'

interface PublishModalProps {
  isOpen: boolean
  onClose: () => void
}

const ALL_PLATFORMS: PublishPlatform[] = ['wechat', 'xhs']

function PublishModal({ isOpen, onClose }: PublishModalProps) {
  const { t } = useI18n()
  const { tabs, activeTabId } = useEditorStore()
  const {
    platformStatuses,
    progressMap,
    results,
    isPublishing,
    error,
    checkAllAuthStatuses,
    publish,
    cancel,
    clearResults,
    setProgress,
    addResult
  } = usePublishStore()

  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PublishPlatform>>(new Set())

  const activeTab = tabs.find((tab) => tab.id === activeTabId)

  // Initialize on open — check auth in background (non-blocking)
  useEffect(() => {
    if (isOpen) {
      clearResults()
      setSelectedPlatforms(new Set())
      // Non-blocking auth check — UI is usable immediately
      checkAllAuthStatuses()
    }
  }, [isOpen])

  // Listen for IPC events
  useEffect(() => {
    if (!isOpen) return

    const unsubProgress = window.electronAPI.publish.onProgress((progress) => {
      setProgress(progress)
    })
    const unsubResult = window.electronAPI.publish.onResult((result) => {
      addResult(result)
    })

    return () => {
      unsubProgress()
      unsubResult()
    }
  }, [isOpen, setProgress, addResult])

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPublishing) onClose()
    },
    [onClose, isPublishing]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const togglePlatform = (platform: PublishPlatform) => {
    const next = new Set(selectedPlatforms)
    if (next.has(platform)) {
      next.delete(platform)
    } else {
      next.add(platform)
    }
    setSelectedPlatforms(next)
  }

  const autoTitle = activeTab ? extractTitle(activeTab.content, activeTab.filePath) : ''

  const handlePublish = async () => {
    if (!activeTab || selectedPlatforms.size === 0) return

    const options: PublishOptions = {
      platforms: Array.from(selectedPlatforms),
      title: autoTitle,
      content: activeTab.content,
      filePath: activeTab.filePath,
      tags: extractTags(activeTab.content)
    }

    await publish(options)
  }

  const hasResults = results.length > 0
  const allDone = hasResults && results.length === selectedPlatforms.size

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => !isPublishing && onClose()}>
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg rounded-xl bg-[var(--color-bg-primary)]
                   border border-[var(--color-border)]"
        style={{ boxShadow: 'var(--shadow-float)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              {t('publish.title')}
            </h2>
            {autoTitle && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate max-w-[360px]">
                {autoTitle}
              </p>
            )}
          </div>
          {!isPublishing && (
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
        <div className="p-4 space-y-4">
          {/* Platform selection */}
          <div>
            <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-2 block">
              {t('publish.selectPlatforms')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_PLATFORMS.map((platform) => (
                <PlatformCard
                  key={platform}
                  platform={platform}
                  authStatus={platformStatuses.get(platform)}
                  selected={selectedPlatforms.has(platform)}
                  onToggle={() => togglePlatform(platform)}
                  progress={progressMap.get(platform)}
                  result={results.find((r) => r.platform === platform)}
                  isPublishing={isPublishing}
                />
              ))}
            </div>
          </div>

          {/* Hint */}
          {!isPublishing && !allDone && selectedPlatforms.size > 0 && (
            <p className="text-xs text-[var(--color-text-muted)]">
              {t('publish.autoPublishHint' as any)}
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="text-xs text-red-500 bg-red-50 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
          {isPublishing ? (
            <button
              onClick={() => cancel()}
              className="rounded-md px-4 py-1.5 text-sm font-medium text-red-600
                         border border-red-300 hover:bg-red-50
                         transition-colors duration-150"
            >
              {t('publish.cancel')}
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="rounded-md px-4 py-1.5 text-sm font-medium text-[var(--color-text-secondary)]
                           hover:bg-[var(--color-bg-tertiary)]
                           transition-colors duration-150"
              >
                {allDone ? t('publish.close') : t('publish.cancel')}
              </button>
              {!allDone && (
                <button
                  onClick={handlePublish}
                  disabled={selectedPlatforms.size === 0}
                  className="rounded-md px-4 py-1.5 text-sm font-medium text-white
                             bg-[var(--color-accent)] hover:opacity-90
                             disabled:opacity-40 disabled:cursor-not-allowed
                             transition-all duration-150"
                >
                  {t('publish.publishNow')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Extract title from markdown: front matter title → first # heading → ## 标题 section → filename
function extractTitle(content: string, filePath: string): string {
  const fmMatch = content.match(/^---\n[\s\S]*?title:\s*(.+)\n[\s\S]*?---/)
  if (fmMatch?.[1]) {
    return fmMatch[1].trim().replace(/^['"]|['"]$/g, '')
  }

  const h1Match = content.match(/^#\s+(.+)$/m)
  if (h1Match?.[1]) {
    return h1Match[1].trim()
  }

  const titleSectionMatch = content.match(/^##\s*标题\s*\n+(.+)$/m)
  if (titleSectionMatch?.[1]) {
    return titleSectionMatch[1].trim()
  }

  return filePath.replace(/^.*\//, '').replace(/\.md$/, '')
}

// Extract tags from front matter
function extractTags(content: string): string[] {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return []
  const tagLine = match[1].match(/tags:\s*\[([^\]]*)\]/)
  if (!tagLine) return []
  return tagLine[1].split(',').map((t) => t.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
}

export default PublishModal
