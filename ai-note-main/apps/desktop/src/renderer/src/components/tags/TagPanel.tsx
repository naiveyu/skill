import { useEffect } from 'react'
import { useTagStore } from '../../stores/tag-store'
import { useEditorStore } from '../../stores/editor-store'
import { useI18n } from '../../i18n'

function TagPanel() {
  const { tags, selectedTag, filteredNotes, loadTags, selectTag, clearFilter } =
    useTagStore()
  const { openFile } = useEditorStore()
  const { t } = useI18n()

  useEffect(() => {
    loadTags()
  }, [])

  const handleTagClick = (tagName: string) => {
    if (selectedTag === tagName) {
      clearFilter()
    } else {
      selectTag(tagName)
    }
  }

  const handleNoteClick = (filePath: string) => {
    openFile(filePath)
  }

  // Extract file name from path
  const getFileName = (path: string): string => {
    const parts = path.split('/')
    return parts[parts.length - 1] || path
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
          {t('tags.title')}
        </span>
        {selectedTag && (
          <button
            onClick={clearFilter}
            className="text-xs text-[var(--color-accent)] hover:underline"
          >
            {t('tags.clearFilter')}
          </button>
        )}
      </div>

      {/* Tag list */}
      <div className="flex-1 overflow-y-auto thin-scrollbar px-1">
        {tags.length === 0 ? (
          <div className="px-3 py-4 text-xs text-[var(--color-text-muted)]">
            {t('tags.empty')}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {tags.map((tag) => (
              <button
                key={tag.name}
                onClick={() => handleTagClick(tag.name)}
                className={`flex items-center justify-between rounded-md px-3 py-1.5 text-left text-sm
                  transition-all duration-150
                  ${
                    selectedTag === tag.name
                      ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)] font-medium'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
                  }`}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: tag.color || 'var(--color-accent)'
                    }}
                  />
                  <span className="truncate">{tag.name}</span>
                </span>
                <span className="flex-shrink-0 rounded-full bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]">
                  {tag.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Filtered notes */}
        {selectedTag && filteredNotes.length > 0 && (
          <div className="mt-3 border-t border-[var(--color-border)] pt-2">
            <div className="px-3 pb-1 text-xs text-[var(--color-text-muted)]">
              {t('tags.notesTagged', { tag: selectedTag })}
            </div>
            {filteredNotes.map((notePath) => (
              <button
                key={notePath}
                onClick={() => handleNoteClick(notePath)}
                className="w-full rounded-md px-3 py-1.5 text-left text-xs
                           text-[var(--color-text-secondary)]
                           hover:bg-[var(--color-bg-tertiary)] transition-colors duration-100 truncate"
              >
                {getFileName(notePath)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TagPanel
