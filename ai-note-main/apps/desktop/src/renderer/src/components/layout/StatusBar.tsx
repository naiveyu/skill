import { useState } from 'react'
import { useEditorStore } from '../../stores/editor-store'
import { useUpdateStore } from '../../stores/update-store'
import { useI18n, Locale } from '../../i18n'
import { GlobeIcon } from '../common/Icons'
import SyncStatusIndicator from '../sync/SyncStatusIndicator'
import UserMenu from '../auth/UserMenu'
import AuthScreen from '../auth/AuthScreen'

function StatusBar() {
  const { tabs, activeTabId, editorMode } = useEditorStore()
  const { hasUpdate, dismissed, setShowModal } = useUpdateStore()
  const { t, locale, setLocale } = useI18n()
  const [showAuthModal, setShowAuthModal] = useState(false)

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'zh' : 'en' as Locale)
  }

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const isDirty = activeTab
    ? activeTab.content !== activeTab.savedContent
    : false

  // Calculate word count for active tab
  const wordCount = activeTab
    ? activeTab.content
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length
    : 0

  // Calculate line count
  const lineCount = activeTab ? activeTab.content.split('\n').length : 0

  return (
    <div
      className="flex h-6 flex-shrink-0 items-center justify-between border-t
                    border-[var(--color-border)] bg-[var(--color-bg-secondary)]
                    px-4 text-xs text-[var(--color-text-muted)]"
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        <SyncStatusIndicator />
        {hasUpdate && !dismissed && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 rounded px-1.5 py-0.5
                       bg-[var(--color-accent)] text-white text-[10px] font-medium
                       hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            {t('update.badge')}
          </button>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {activeTab && (
          <>
            {/* Save status */}
            <span className={isDirty ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}>
              {isDirty ? t('status.unsaved') : t('status.saved')}
            </span>

            {/* Word count */}
            <span>{wordCount} {t('status.words')}</span>

            {/* Line count */}
            <span>{lineCount} {t('status.lines')}</span>

            {/* Editor mode */}
            <span className="uppercase font-medium">{editorMode === 'rich' ? 'WYSIWYG' : 'MD'}</span>
          </>
        )}

        {/* Language toggle */}
        <button
          onClick={toggleLocale}
          className="flex items-center gap-1 hover:text-[var(--color-text-primary)] transition-colors"
          title={t('settings.language')}
        >
          <GlobeIcon size={12} />
          <span>{locale === 'en' ? '中文' : 'EN'}</span>
        </button>

        {/* User account */}
        <UserMenu onSignInClick={() => setShowAuthModal(true)} />
      </div>

      <AuthScreen isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  )
}

export default StatusBar
