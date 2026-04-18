import * as FileSystem from 'expo-file-system'
import FlexSearch from 'flexsearch'
import type { SearchResult, SearchMatch, SearchOptions } from '@ai-note/shared-types'

interface IndexedDoc {
  relativePath: string
  fileName: string
  content: string
}

// CJK-aware tokenizer: split Chinese/Japanese/Korean characters individually,
// keep English words intact
function cjkTokenizer(str: string): string[] {
  const tokens: string[] = []
  let current = ''
  for (const char of str) {
    if (/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(char)) {
      if (current) {
        tokens.push(current.toLowerCase())
        current = ''
      }
      tokens.push(char)
    } else if (/[\s\p{P}]/u.test(char)) {
      if (current) {
        tokens.push(current.toLowerCase())
        current = ''
      }
    } else {
      current += char
    }
  }
  if (current) tokens.push(current.toLowerCase())
  return tokens
}

class SearchService {
  private index: FlexSearch.Index | null = null
  private docs = new Map<number, IndexedDoc>()
  private workspacePath = ''

  async buildIndex(workspacePath: string): Promise<void> {
    this.workspacePath = workspacePath
    this.index = new FlexSearch.Index({
      tokenize: cjkTokenizer as any,
      cache: true,
    })
    this.docs.clear()
    await this.scanDirectory(workspacePath, '')
  }

  private async scanDirectory(dirPath: string, relativePath: string): Promise<void> {
    const entries = await FileSystem.readDirectoryAsync(dirPath)
    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules') continue
      const fullPath = `${dirPath}/${entry}`
      const info = await FileSystem.getInfoAsync(fullPath)

      if (info.isDirectory) {
        const subRelPath = relativePath ? `${relativePath}/${entry}` : entry
        await this.scanDirectory(fullPath, subRelPath)
      } else if (entry.endsWith('.md')) {
        const fileRelPath = relativePath ? `${relativePath}/${entry}` : entry
        await this.indexFile(fullPath, fileRelPath, entry)
      }
    }
  }

  private async indexFile(
    absolutePath: string,
    relativePath: string,
    fileName: string
  ): Promise<void> {
    try {
      const content = await FileSystem.readAsStringAsync(absolutePath)
      const id = this.hashPath(relativePath)
      this.docs.set(id, { relativePath, fileName, content })
      this.index?.add(id, content)
    } catch {
      // Skip files that can't be read
    }
  }

  async updateFile(relativePath: string): Promise<void> {
    const id = this.hashPath(relativePath)
    // Remove old
    this.index?.remove(id)
    this.docs.delete(id)
    // Re-index
    const absolutePath = `${this.workspacePath}/${relativePath}`
    const fileName = relativePath.split('/').pop() || relativePath
    await this.indexFile(absolutePath, relativePath, fileName)
  }

  removeFile(relativePath: string): void {
    const id = this.hashPath(relativePath)
    this.index?.remove(id)
    this.docs.delete(id)
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.index || !query.trim()) return []

    const ids = this.index.search(query, { limit: 50 })
    const results: SearchResult[] = []

    for (const id of ids) {
      const doc = this.docs.get(id as number)
      if (!doc) continue

      // Apply folder filter
      if (options?.folderFilter?.length) {
        const inFolder = options.folderFilter.some((f) =>
          doc.relativePath.startsWith(f)
        )
        if (!inFolder) continue
      }

      const matches = this.findMatches(doc.content, query, options)
      results.push({
        filePath: doc.relativePath,
        fileName: doc.fileName,
        matches,
        score: matches.length,
      })
    }

    return results.sort((a, b) => b.score - a.score)
  }

  private findMatches(
    content: string,
    query: string,
    options?: SearchOptions
  ): SearchMatch[] {
    const lines = content.split('\n')
    const matches: SearchMatch[] = []
    const searchQuery = options?.caseSensitive ? query : query.toLowerCase()

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const searchLine = options?.caseSensitive ? line : line.toLowerCase()
      let startIndex = 0

      while (startIndex < searchLine.length) {
        const matchIndex = searchLine.indexOf(searchQuery, startIndex)
        if (matchIndex === -1) break

        if (options?.wholeWord) {
          const before = matchIndex > 0 ? searchLine[matchIndex - 1] : ' '
          const after =
            matchIndex + searchQuery.length < searchLine.length
              ? searchLine[matchIndex + searchQuery.length]
              : ' '
          if (/\w/.test(before) || /\w/.test(after)) {
            startIndex = matchIndex + 1
            continue
          }
        }

        matches.push({
          lineNumber: i + 1,
          lineContent: line,
          matchStart: matchIndex,
          matchEnd: matchIndex + searchQuery.length,
        })
        startIndex = matchIndex + searchQuery.length
      }
    }

    return matches.slice(0, 20)
  }

  private hashPath(path: string): number {
    let hash = 0
    for (let i = 0; i < path.length; i++) {
      const char = path.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0
    }
    return Math.abs(hash)
  }
}

export const searchService = new SearchService()
