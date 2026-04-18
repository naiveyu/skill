// ========== Sync Transport ==========

export type SyncTransportType = 'lan' | 'ble'

export type SyncStatus = 'idle' | 'discovering' | 'connecting' | 'syncing' | 'error'

export interface SyncDevice {
  id: string
  name: string
  type: 'mobile' | 'desktop'
  transport: SyncTransportType
  lastSeen: number
  isPaired: boolean
  isConnected: boolean
}

export interface PairingInfo {
  pin: string
  qrPayload: string
  expiresAt: number
}

export interface AuthToken {
  token: string
  deviceId: string
  deviceName: string
  createdAt: number
  lastUsed: number
}

// ========== Sync Protocol ==========

export interface NoteManifestEntry {
  path: string
  title: string
  updatedAt: number
  contentHash: string
  size: number
}

export type NoteManifest = NoteManifestEntry[]

export interface SyncDelta {
  toSend: NoteManifestEntry[]
  toReceive: NoteManifestEntry[]
  conflicts: SyncConflict[]
}

export interface SyncConflict {
  path: string
  localEntry: NoteManifestEntry
  remoteEntry: NoteManifestEntry
  resolution?: 'local' | 'remote' | 'both'
}

export interface SyncResult {
  success: boolean
  sentCount: number
  receivedCount: number
  conflictCount: number
  errors: string[]
  duration: number
}

export interface SyncProgress {
  phase: 'manifest' | 'transfer' | 'apply' | 'complete' | 'error'
  current: number
  total: number
  currentFile?: string
}

// ========== Sync Config ==========

export interface SyncConfig {
  enabled: boolean
  lanPort: number
  lanEnabled: boolean
  bleEnabled: boolean
  conflictStrategy: 'last-write-wins' | 'keep-both' | 'ask'
  autoSync: boolean
  pairedDevices: AuthToken[]
}
