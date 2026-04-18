import { create } from 'zustand'
import type { Tag } from '@ai-note/shared-types'
import { tagService } from '@/services/tag-service'

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
    const tags = await tagService.getAllTags()
    set({ tags })
  },

  selectTag: async (name) => {
    const notes = await tagService.getNotesByTag(name)
    set({ selectedTag: name, filteredNotes: notes })
  },

  clearFilter: () => set({ selectedTag: null, filteredNotes: [] }),
}))
