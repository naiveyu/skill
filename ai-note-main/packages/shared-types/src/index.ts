// Models
export type { FileNode, FileChangeEvent } from './models/file'
export type { GitCommit, GitDiff, DiffHunk, GitStatus } from './models/git'
export type { SearchResult, SearchMatch, SearchOptions } from './models/search'
export type { Tag } from './models/tag'
export type { AppConfig, AiProvider, AiProviderConfig, AiConfig } from './models/config'
export type { WorkspaceInfo } from './models/workspace'
export type {
  SyncTransportType,
  SyncStatus,
  SyncDevice,
  PairingInfo,
  AuthToken,
  NoteManifestEntry,
  NoteManifest,
  SyncDelta,
  SyncConflict,
  SyncResult,
  SyncProgress,
  SyncConfig
} from './models/sync'
export type {
  AuthUser,
  AuthCredentials,
  AuthRegisterData,
  AuthResponse,
  AuthState,
  AuthValidateResponse
} from './models/auth'
export type {
  PublishPlatform,
  PlatformAuthStatus,
  PublishOptions,
  PublishResult,
  PublishProgress,
  PublishHistoryEntry
} from './models/publish'

// Constants
export {
  APP_NAME,
  CONFIG_DIR,
  CONFIG_FILE,
  DB_FILE,
  TRASH_DIR,
  DEFAULT_GITIGNORE,
  SYNC_PORT,
  SYNC_CONFLICTS_DIR,
  SYNC_SERVICE_NAME,
  SYNC_PAIRING_TTL,
  BLE_SERVICE_UUID,
  BLE_DEVICE_INFO_UUID,
  BLE_SYNC_CONTROL_UUID,
  BLE_SYNC_DATA_UUID,
  BLE_DEFAULT_MTU,
  BLE_PREFERRED_MTU,
  BLE_COMPRESS_THRESHOLD,
  AUTH_SERVER_DEFAULT_PORT,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY
} from './constants'
