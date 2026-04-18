export const GITHUB_URL = 'https://github.com/this-spring/ai-note'
export const APP_VERSION = '0.3.0'

export const DOWNLOAD_LINKS = {
  macos: { url: 'https://sspprriinngg.cn/releases/INote-0.3.0-arm64.dmg', format: '.dmg', requirement: 'macOS 11+' },
  windows: { url: '#', format: '.exe', requirement: 'Windows 10+' },
  linux: { url: '#', format: '.AppImage', requirement: 'Ubuntu 20.04+' },
} as const

export const TECH_STACK = [
  { name: 'Electron', role: 'Desktop Runtime' },
  { name: 'React', role: 'UI Framework' },
  { name: 'TypeScript', role: 'Type Safety' },
  { name: 'Tailwind CSS', role: 'Styling' },
  { name: 'CodeMirror 6', role: 'Code Editor' },
  { name: 'Milkdown', role: 'WYSIWYG Editor' },
  { name: 'isomorphic-git', role: 'Git Engine' },
  { name: 'FlexSearch', role: 'Search Engine' },
  { name: 'SQLite', role: 'Local Database' },
  { name: 'Zustand', role: 'State Management' },
] as const
