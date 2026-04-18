import { create } from 'zustand'
import type { Tag } from '@shared/types/ipc'

interface TagState {
  tags: Tag[]
  selectedTag: string | null
  filteredNotes: string[]

  loadTags: () => Promise<void>
  selectTag: (name: string) => Promise<void>
  clearFilter: () => void
}

export const useTagStore = create<TagState>((set) => ({
  tags: [],
  selectedTag: null,
  filteredNotes: [],

  loadTags: async () => {
    try {
      const tags = await window.electronAPI.tag.getAllTags()
      set({ tags })
    } catch (error) {
      console.error('Failed to load tags:', error)
    }
  },

  selectTag: async (name: string) => {
    try {
      set({ selectedTag: name })
      const notes = await window.electronAPI.tag.getNotesByTag(name)
      set({ filteredNotes: notes })
    } catch (error) {
      console.error('Failed to filter by tag:', error)
      set({ filteredNotes: [] })
    }
  },

  clearFilter: () => {
    set({ selectedTag: null, filteredNotes: [] })
  }
}))
