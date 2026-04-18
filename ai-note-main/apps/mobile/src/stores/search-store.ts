import { create } from 'zustand'
import type { SearchResult } from '@ai-note/shared-types'
import { searchService } from '@/services/search-service'

interface SearchState {
  query: string
  results: SearchResult[]
  isSearching: boolean
  setQuery: (query: string) => void
  search: (query: string) => Promise<void>
  clearSearch: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: [],
  isSearching: false,

  setQuery: (query) => set({ query }),

  search: async (query) => {
    set({ isSearching: true })
    try {
      const results = await searchService.search(query)
      set({ results })
    } finally {
      set({ isSearching: false })
    }
  },

  clearSearch: () => set({ query: '', results: [], isSearching: false }),
}))
