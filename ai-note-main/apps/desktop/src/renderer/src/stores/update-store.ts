import { create } from 'zustand'
import type { UpdateStatus } from '@shared/types/ipc'

interface UpdateState {
  status: UpdateStatus['status'] | 'idle'
  version: string | null
  releaseNotes: string | null
  fileSize: number | null
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
  error: string | null
  dismissed: boolean
  showToast: boolean
  showModal: boolean
  isManualCheck: boolean

  checkForUpdate: () => Promise<void>
  manualCheckForUpdate: () => Promise<void>
  startDownload: () => Promise<void>
  installUpdate: () => void
  dismissToast: () => void
  openModalFromToast: () => void
  dismiss: () => void
  setShowModal: (show: boolean) => void
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  status: 'idle',
  version: null,
  releaseNotes: null,
  fileSize: null,
  percent: 0,
  bytesPerSecond: 0,
  transferred: 0,
  total: 0,
  error: null,
  dismissed: false,
  showToast: false,
  showModal: false,
  isManualCheck: false,

  checkForUpdate: async () => {
    set({ isManualCheck: false })
    await window.electronAPI.update.check()
  },

  manualCheckForUpdate: async () => {
    set({ isManualCheck: true, showModal: true, dismissed: false })
    await window.electronAPI.update.check()
  },

  startDownload: async () => {
    await window.electronAPI.update.download()
  },

  installUpdate: () => {
    window.electronAPI.update.install()
  },

  dismissToast: () => set({ showToast: false, dismissed: true }),
  openModalFromToast: () => set({ showToast: false, showModal: true }),
  dismiss: () => set({ dismissed: true, showModal: false, showToast: false }),
  setShowModal: (show) => set({ showModal: show })
}))

// Delayed auto-check: 2 minutes after app startup
let delayedCheckTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleDelayedCheck(): void {
  if (delayedCheckTimer) clearTimeout(delayedCheckTimer)
  delayedCheckTimer = setTimeout(() => {
    const store = useUpdateStore.getState()
    if (store.status === 'idle' && !store.dismissed) {
      store.checkForUpdate()
    }
  }, 2 * 60 * 1000) // 2 minutes
}

export function initUpdateListener(): () => void {
  return window.electronAPI.update.onStatus((data: UpdateStatus) => {
    const store = useUpdateStore.getState()

    if (data.status === 'checking') {
      useUpdateStore.setState({ status: 'checking' })
    } else if (data.status === 'available') {
      useUpdateStore.setState({
        status: 'available',
        version: data.version ?? null,
        releaseNotes: typeof data.releaseNotes === 'string' ? data.releaseNotes : null,
        fileSize: (data as any).fileSize ?? null,
        // Auto-check: show toast; Manual-check: show modal
        showToast: !store.isManualCheck && !store.dismissed,
        showModal: store.isManualCheck && !store.dismissed,
      })
    } else if (data.status === 'downloading') {
      useUpdateStore.setState({
        status: 'downloading',
        percent: data.percent ?? 0,
        bytesPerSecond: data.bytesPerSecond ?? 0,
        transferred: data.transferred ?? 0,
        total: data.total ?? 0
      })
    } else if (data.status === 'downloaded') {
      useUpdateStore.setState({ status: 'downloaded', showModal: true, showToast: false })
    } else if (data.status === 'not-available') {
      useUpdateStore.setState({
        status: 'not-available',
        // Only show modal for manual check
        showModal: store.isManualCheck,
        showToast: false,
      })
    } else if (data.status === 'error') {
      useUpdateStore.setState({
        status: 'error',
        error: data.error ?? null,
        showModal: store.isManualCheck,
        showToast: false,
      })
    }
  })
}
