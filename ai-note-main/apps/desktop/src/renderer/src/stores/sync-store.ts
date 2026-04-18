import { create } from 'zustand'
import type {
  SyncStatus,
  SyncDevice,
  SyncConfig,
  PairingInfo,
  SyncProgress,
  SyncConflict,
  AuthToken
} from '@ai-note/shared-types'

interface SyncState {
  status: SyncStatus
  devices: SyncDevice[]
  config: SyncConfig | null
  pairedDevices: AuthToken[]
  pairingInfo: PairingInfo | null
  progress: SyncProgress | null
  conflicts: SyncConflict[]
  lastSyncTime: number | null
  error: string | null

  // Actions
  loadSyncState: () => Promise<void>
  startSync: () => Promise<void>
  stopSync: () => Promise<void>
  triggerSync: (deviceId?: string) => Promise<void>
  generatePairing: () => Promise<void>
  clearPairing: () => void
  revokeDevice: (deviceId: string) => Promise<void>
  resolveConflict: (path: string, resolution: 'local' | 'remote' | 'both') => Promise<void>
  updateConfig: (key: string, value: any) => Promise<void>

  // Internal setters for event listeners
  setStatus: (status: SyncStatus) => void
  addDevice: (device: SyncDevice) => void
  removeDevice: (deviceId: string) => void
  setProgress: (progress: SyncProgress | null) => void
  setConflicts: (conflicts: SyncConflict[]) => void
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'idle',
  devices: [],
  config: null,
  pairedDevices: [],
  pairingInfo: null,
  progress: null,
  conflicts: [],
  lastSyncTime: null,
  error: null,

  loadSyncState: async () => {
    try {
      const { status, devices } = await window.electronAPI.sync.getStatus()
      const config = await window.electronAPI.sync.getConfig()
      const pairedDevices = await window.electronAPI.sync.getPairedDevices()
      set({ status, devices, config, pairedDevices, error: null })
    } catch (error) {
      console.error('Failed to load sync state:', error)
    }
  },

  startSync: async () => {
    try {
      await window.electronAPI.sync.start()
      set({ error: null })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  stopSync: async () => {
    try {
      await window.electronAPI.sync.stop()
      set({ error: null })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  triggerSync: async (deviceId?: string) => {
    try {
      await window.electronAPI.sync.triggerSync(deviceId)
      set({ error: null })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  generatePairing: async () => {
    try {
      const pairingInfo = await window.electronAPI.sync.generatePairing()
      set({ pairingInfo, error: null })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  clearPairing: () => set({ pairingInfo: null }),

  revokeDevice: async (deviceId: string) => {
    try {
      await window.electronAPI.sync.revokeDevice(deviceId)
      set({
        pairedDevices: get().pairedDevices.filter((d) => d.deviceId !== deviceId),
        error: null
      })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  resolveConflict: async (
    filePath: string,
    resolution: 'local' | 'remote' | 'both'
  ) => {
    try {
      await window.electronAPI.sync.resolveConflict(filePath, resolution)
      set({
        conflicts: get().conflicts.filter((c) => c.path !== filePath),
        error: null
      })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  updateConfig: async (key: string, value: any) => {
    try {
      await window.electronAPI.sync.setConfig(key, value)
      const config = await window.electronAPI.sync.getConfig()
      set({ config, error: null })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  setStatus: (status) => set({ status }),
  addDevice: (device) => set({ devices: [...get().devices, device] }),
  removeDevice: (deviceId) =>
    set({ devices: get().devices.filter((d) => d.id !== deviceId) }),
  setProgress: (progress) => {
    set({ progress })
    if (progress?.phase === 'complete') {
      set({ lastSyncTime: Date.now(), progress: null })
    }
  },
  setConflicts: (conflicts) => set({ conflicts })
}))
