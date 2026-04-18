// Re-export platform-agnostic types from shared package
export type {
  FileNode,
  FileChangeEvent,
  GitCommit,
  GitDiff,
  DiffHunk,
  GitStatus,
  SearchResult,
  SearchMatch,
  SearchOptions,
  Tag,
  AppConfig,
  WorkspaceInfo,
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
} from '@ai-note/shared-types'

// Import types needed for ElectronAPI definition
import type {
  FileNode,
  FileChangeEvent,
  GitCommit,
  GitDiff,
  GitStatus,
  SearchResult,
  SearchOptions,
  Tag,
  AppConfig,
  WorkspaceInfo,
  SyncStatus,
  SyncDevice,
  PairingInfo,
  AuthToken,
  SyncProgress,
  SyncConflict,
  SyncConfig,
  AuthUser,
  AuthCredentials,
  AuthRegisterData,
  AuthResponse,
  AuthState,
  PublishPlatform,
  PlatformAuthStatus,
  PublishOptions,
  PublishResult,
  PublishProgress,
  PublishHistoryEntry
} from '@ai-note/shared-types'

// PDF metadata types
import type { PdfSidecarMeta } from './pdf-meta'

// Electron-specific API interface
export interface ElectronAPI {
  file: {
    readFile(filePath: string): Promise<string>
    readBinaryFile(filePath: string): Promise<Uint8Array>
    getAbsolutePath(relativePath: string): Promise<string>
    writeFile(filePath: string, content: string): Promise<void>
    deleteFile(filePath: string): Promise<void>
    renameFile(oldPath: string, newPath: string): Promise<void>
    createFile(dirPath: string, fileName: string): Promise<string>
    createFolder(parentPath: string, folderName: string): Promise<string>
    getFileTree(): Promise<FileNode[]>
    openExternal(filePath: string): Promise<string>
    importExternalFiles(absolutePaths: string[], targetDir: string): Promise<string[]>
    pasteFromClipboard(targetDir: string): Promise<string[]>
    saveImageFromClipboard(targetDir: string): Promise<string[]>
    saveDroppedImages(absolutePaths: string[], targetDir: string): Promise<string[]>
    copyWithin(sourcePath: string, targetDir: string): Promise<string>
    createDrawing(assetsDir: string): Promise<string>
    readDrawing(relativePath: string): Promise<string>
    saveDrawing(relativePath: string, data: string): Promise<boolean>
    deleteDrawing(relativePath: string): Promise<boolean>
    saveDrawingThumbnail(relativePath: string, svgString: string): Promise<boolean>
    onFileChange(callback: (event: FileChangeEvent) => void): () => void
  }
  git: {
    getHistory(filePath: string, limit?: number): Promise<GitCommit[]>
    getDiff(sha1: string, sha2: string, filePath: string): Promise<GitDiff>
    getFileContent(sha: string, filePath: string): Promise<string>
    restoreFile(filePath: string, sha: string): Promise<void>
    commit(message: string, files?: string[]): Promise<string>
    saveVersion(filePath: string, description: string): Promise<string>
    getStatus(): Promise<GitStatus>
  }
  search: {
    query(query: string, options?: SearchOptions): Promise<SearchResult[]>
    rebuildIndex(): Promise<void>
  }
  tag: {
    getAllTags(): Promise<Tag[]>
    getNotesByTag(tagName: string): Promise<string[]>
    updateNoteTags(filePath: string, tags: string[]): Promise<void>
    renameTag(oldName: string, newName: string): Promise<void>
  }
  config: {
    get(key: string): Promise<any>
    set(key: string, value: any): Promise<void>
    getAll(): Promise<AppConfig>
  }
  workspace: {
    open(folderPath?: string): Promise<string | null>
    getRecent(): Promise<WorkspaceInfo[]>
    getCurrent(): Promise<string | null>
  }
  sync: {
    start(): Promise<void>
    stop(): Promise<void>
    getStatus(): Promise<{ status: SyncStatus; devices: SyncDevice[] }>
    generatePairing(): Promise<PairingInfo>
    revokeDevice(deviceId: string): Promise<void>
    getPairedDevices(): Promise<AuthToken[]>
    triggerSync(deviceId?: string): Promise<void>
    resolveConflict(path: string, resolution: 'local' | 'remote' | 'both'): Promise<void>
    getConfig(): Promise<SyncConfig>
    setConfig(key: string, value: any): Promise<void>
    onStatusChanged(callback: (status: SyncStatus) => void): () => void
    onDeviceConnected(callback: (device: SyncDevice) => void): () => void
    onDeviceDisconnected(callback: (deviceId: string) => void): () => void
    onProgress(callback: (progress: SyncProgress) => void): () => void
    onConflict(callback: (conflicts: SyncConflict[]) => void): () => void
  }
  auth: {
    register(data: AuthRegisterData): Promise<AuthResponse>
    login(credentials: AuthCredentials): Promise<AuthResponse>
    validate(): Promise<boolean>
    getState(): Promise<AuthState>
    logout(): Promise<void>
    updateProfile(data: { username?: string; password?: string }): Promise<AuthUser>
    getServerUrl(): Promise<string>
    setServerUrl(url: string): Promise<void>
  }
  pdfMeta: {
    readMeta(relativePdfPath: string): Promise<PdfSidecarMeta>
    writeMeta(relativePdfPath: string, meta: PdfSidecarMeta): Promise<void>
  }
  feedback: {
    submit(data: {
      type: 'bug' | 'feature'
      title: string
      description: string
      images?: string[]
    }): Promise<{ success: boolean; id?: string; error?: string }>
  }
  publish: {
    getAuthStatus(platform: PublishPlatform): Promise<PlatformAuthStatus>
    login(platform: PublishPlatform): Promise<PlatformAuthStatus>
    publish(options: PublishOptions): Promise<PublishResult[]>
    getHistory(): Promise<PublishHistoryEntry[]>
    cancel(): Promise<void>
    onProgress(callback: (progress: PublishProgress) => void): () => void
    onResult(callback: (result: PublishResult) => void): () => void
  }
  ai: {
    saveToken(token: string): Promise<{ success: boolean }>
    getTokenStatus(): Promise<{ configured: boolean; preview?: string }>
    send(prompt: string): Promise<void>
    cancel(): Promise<void>
    onStreamChunk(callback: (data: { content: string }) => void): () => void
    onStreamEnd(callback: () => void): () => void
    onStreamError(callback: (error: { message: string }) => void): () => void
  }
  update: {
    check(): Promise<any>
    download(): Promise<void>
    install(): void
    onStatus(callback: (status: UpdateStatus) => void): () => void
  }
  video: {
    checkFfmpeg(): Promise<boolean>
    trim(inputPath: string, startSec: number, endSec: number, outputPath: string): Promise<void>
    onTrimProgress(cb: (percent: number) => void): () => void
    onTrimComplete(cb: (outputPath: string) => void): () => void
    onTrimError(cb: (message: string) => void): () => void
  }
}

export interface UpdateInfo {
  hasUpdate: boolean
  version?: string
  platform?: string
  fileSize?: number
  releaseNotes?: string
  downloadUrl?: string
}

export interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  releaseNotes?: string | null
  releaseDate?: string
  fileSize?: number
  downloadUrl?: string
  percent?: number
  bytesPerSecond?: number
  transferred?: number
  total?: number
  error?: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
