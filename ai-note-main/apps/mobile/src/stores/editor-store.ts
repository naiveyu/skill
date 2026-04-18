import { create } from 'zustand'
import { fileService } from '@/services/file-service'

interface NoteState {
  title: string
  filePath: string
  content: string
  savedContent: string
}

interface EditorState {
  currentNote: NoteState | null
  openFile: (filePath: string) => Promise<void>
  updateContent: (content: string) => void
  saveFile: () => Promise<void>
  reloadFile: (filePath: string) => Promise<void>
  closeFile: () => void
  isDirty: () => boolean
}

export const useEditorStore = create<EditorState>((set, get) => ({
  currentNote: null,

  openFile: async (filePath) => {
    const content = await fileService.readFile(filePath)
    const fileName = filePath.split('/').pop() || filePath
    const title = fileName.replace('.md', '')
    set({
      currentNote: {
        title,
        filePath,
        content,
        savedContent: content,
      },
    })
  },

  updateContent: (content) => {
    const note = get().currentNote
    if (note) {
      set({ currentNote: { ...note, content } })
    }
  },

  saveFile: async () => {
    const note = get().currentNote
    if (note && note.content !== note.savedContent) {
      await fileService.writeFile(note.filePath, note.content)
      set({ currentNote: { ...note, savedContent: note.content } })
    }
  },

  reloadFile: async (filePath) => {
    const content = await fileService.readFile(filePath)
    const note = get().currentNote
    if (note && note.filePath === filePath) {
      set({ currentNote: { ...note, content, savedContent: content } })
    }
  },

  closeFile: () => set({ currentNote: null }),

  isDirty: () => {
    const note = get().currentNote
    return note ? note.content !== note.savedContent : false
  },
}))
