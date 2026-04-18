// Supported publishing platforms
export type PublishPlatform = 'wechat' | 'xhs'

// Platform login status
export interface PlatformAuthStatus {
  platform: PublishPlatform
  isLoggedIn: boolean
  username?: string
  lastChecked?: string
}

// Options for publishing an article
export interface PublishOptions {
  platforms: PublishPlatform[]
  title: string
  content: string // raw markdown
  filePath?: string // absolute path to the source .md file (for resolving image references)
  summary?: string
  coverImage?: string // absolute path to image file
  tags?: string[]
}

// Result of a single platform publish
export interface PublishResult {
  platform: PublishPlatform
  success: boolean
  url?: string
  error?: string
  publishedAt?: string
}

// Progress event during publishing
export interface PublishProgress {
  platform: PublishPlatform
  step: string // e.g. 'opening-browser', 'checking-login', 'filling-content', 'publishing'
  percent: number // 0-100
}

// History entry for a published article
export interface PublishHistoryEntry {
  id: string
  filePath: string
  title: string
  platforms: PublishResult[]
  publishedAt: string
}
