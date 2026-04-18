import { create } from 'zustand'
import type { SearchResult } from '@shared/types/ipc'

interface SearchState {
  query: string
  results: SearchResult[]
  isSearching: boolean

  setQuery: (q: string) => void
  search: (q: string) => Promise<void>
  clearSearch: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: [],
  isSearching: false,

  setQuery: (q: string) => {
    set({ query: q })
  },

  search: async (q: string) => {
    if (!q.trim()) {
      set({ results: [], isSearching: false })
      return
    }

    set({ isSearching: true, query: q })
    try {
      const results = await window.electronAPI.search.query(q)
      set({ results, isSearching: false })
    } catch (error) {
      console.error('Search failed:', error)
      set({ results: [], isSearching: false })
    }
  },

  clearSearch: () => {
    set({ query: '', results: [], isSearching: false })
  }
}))
