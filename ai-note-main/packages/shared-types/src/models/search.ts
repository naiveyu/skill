export interface SearchResult {
  filePath: string
  fileName: string
  matches: SearchMatch[]
  score: number
}

export interface SearchMatch {
  lineNumber: number
  lineContent: string
  matchStart: number
  matchEnd: number
}

export interface SearchOptions {
  caseSensitive?: boolean
  wholeWord?: boolean
  folderFilter?: string[]
  tagFilter?: string[]
}
