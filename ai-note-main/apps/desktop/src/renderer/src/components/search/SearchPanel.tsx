import { useEffect, useRef, useCallback } from 'react'
import { useSearchStore } from '../../stores/search-store'
import { useEditorStore } from '../../stores/editor-store'
import { useI18n } from '../../i18n'

const DEBOUNCE_DELAY = 300

function SearchPanel() {
  const { query, results, isSearching, setQuery, search, clearSearch } =
    useSearchStore()
  const { openFile } = useEditorStore()
  const { t } = useI18n()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setQuery(value)

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      if (!value.trim()) {
        clearSearch()
        return
      }

      debounceRef.current = setTimeout(() => {
        search(value)
      }, DEBOUNCE_DELAY)
    },
    [setQuery, search, clearSearch]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const handleResultClick = (filePath: string) => {
    openFile(filePath)
  }

  // Highlight keyword in text
  const highlightText = (text: string, keyword: string) => {
    if (!keyword.trim()) return text

    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="search-highlight">
          {part}
        </span>
      ) : (
        part
      )
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-3 py-2 text-xs font-semibold uppercase text-[var(--color-text-muted)]">
        {t('search.title')}
      </div>

      {/* Search input */}
      <div className="px-3 pb-2">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={t('search.placeholder')}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]
                     px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none
                     placeholder:text-[var(--color-text-muted)]
                     focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-light)]
                     transition-all duration-150"
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto thin-scrollbar px-1">
        {isSearching && (
          <div className="px-3 py-2 text-xs text-[var(--color-text-muted)]">
            {t('search.searching')}
          </div>
        )}

        {!isSearching && query && results.length === 0 && (
          <div className="px-3 py-2 text-xs text-[var(--color-text-muted)]">
            {t('search.noResults')}
          </div>
        )}

        {results.map((result) => (
          <div
            key={result.filePath}
            className="mb-1 rounded"
          >
            {/* File name */}
            <button
              onClick={() => handleResultClick(result.filePath)}
              className="w-full rounded-md px-3 py-1.5 text-left hover:bg-[var(--color-bg-tertiary)] transition-colors duration-100"
            >
              <div className="text-xs font-medium text-[var(--color-text-primary)]">
                {result.fileName}
              </div>

              {/* Match snippets */}
              {result.matches.slice(0, 3).map((match, idx) => (
                <div
                  key={idx}
                  className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]"
                >
                  <span className="text-[var(--color-text-muted)] mr-1">
                    {match.lineNumber}:
                  </span>
                  {highlightText(match.lineContent.trim(), query)}
                </div>
              ))}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SearchPanel
