import { useState, ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { FilesIcon, SearchIcon, TagIcon, RefreshCwIcon, MessageCircleIcon } from '../common/Icons'
import FileTree from '../file-tree/FileTree'
import SearchPanel from '../search/SearchPanel'
import TagPanel from '../tags/TagPanel'
import SyncPanel from '../sync/SyncPanel'
import FeedbackModal from '../feedback/FeedbackModal'

type SidebarPanel = 'explorer' | 'search' | 'tags' | 'sync'

// Icon button for the sidebar tab bar
function TabButton({
  icon,
  label,
  isActive,
  onClick
}: {
  icon: ReactNode
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`relative flex h-10 w-10 items-center justify-center rounded-none transition-colors duration-150
        ${
          isActive
            ? 'text-[var(--color-text-primary)]'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
        }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-r-sm bg-[var(--color-accent)]" />
      )}
      {icon}
    </button>
  )
}

function Sidebar() {
  const [activePanel, setActivePanel] = useState<SidebarPanel>('explorer')
  const [showFeedback, setShowFeedback] = useState(false)
  const { t } = useI18n()

  const renderPanel = () => {
    switch (activePanel) {
      case 'explorer':
        return <FileTree />
      case 'search':
        return <SearchPanel />
      case 'tags':
        return <TagPanel />
      case 'sync':
        return <SyncPanel />
      default:
        return null
    }
  }

  return (
    <div className="flex h-full">
      {/* Vertical tab bar */}
      <div className="flex w-11 flex-shrink-0 flex-col items-center border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] pt-1.5">
        <TabButton
          icon={<FilesIcon size={18} />}
          label={t('sidebar.explorer')}
          isActive={activePanel === 'explorer'}
          onClick={() => setActivePanel('explorer')}
        />
        <TabButton
          icon={<SearchIcon size={18} />}
          label={t('sidebar.search')}
          isActive={activePanel === 'search'}
          onClick={() => setActivePanel('search')}
        />
        <TabButton
          icon={<TagIcon size={18} />}
          label={t('sidebar.tags')}
          isActive={activePanel === 'tags'}
          onClick={() => setActivePanel('tags')}
        />
        {/* TODO: re-enable when sync feature is production-ready
        <TabButton
          icon={<RefreshCwIcon size={18} />}
          label={t('sidebar.sync')}
          isActive={activePanel === 'sync'}
          onClick={() => setActivePanel('sync')}
        />
        */}

        {/* Spacer to push feedback to bottom */}
        <div className="flex-1" />

        {/* Feedback button */}
        <div className="pb-1.5">
          <button
            onClick={() => setShowFeedback(true)}
            title={t('feedback.title')}
            className="flex h-10 w-10 items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors duration-150"
          >
            <MessageCircleIcon size={18} />
          </button>
        </div>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto thin-scrollbar bg-[var(--color-bg-secondary)]">
        {renderPanel()}
      </div>

      {/* Feedback modal */}
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
    </div>
  )
}

export default Sidebar
