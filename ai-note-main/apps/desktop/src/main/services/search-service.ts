import path from 'path'
import fs from 'fs/promises'
import FlexSearch from 'flexsearch'
import { SearchResult, SearchMatch, SearchOptions } from '@shared/types/ipc'
import { logger } from '../utils/logger'

interface IndexedDoc {
  id: string
  content: string
  fileName: string
}

// CJK Unicode ranges for detecting Chinese/Japanese/Korean characters
const CJK_REGEX =
  /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/

// Custom tokenizer: splits CJK characters individually, keeps English words intact
function cjkTokenize(text: string): string[] {
  const tokens: string[] = []
  const lower = text.toLowerCase()
  let wordBuf = ''

  for (const char of lower) {
    if (CJK_REGEX.test(char)) {
      if (wordBuf) {
        tokens.push(wordBuf)
        wordBuf = ''
      }
      tokens.push(char)
    } else if (/[\s\p{P}]/u.test(char)) {
      if (wordBuf) {
        tokens.push(wordBuf)
        wordBuf = ''
      }
    } else {
      wordBuf += char
    }
  }
  if (wordBuf) tokens.push(wordBuf)
  return tokens
}

function createIndex(): FlexSearch.Index {
  return new FlexSearch.Index({
    tokenize: 'full',
    encode: (text: string) => cjkTokenize(text),
    resolution: 9,
    cache: true
  })
}

export class SearchService {
  private workspacePath: string
  private index: FlexSearch.Index
  private docMap: Map<string, IndexedDoc> = new Map()

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath
    this.index = createIndex()
  }

  async buildIndex(): Promise<void> {
    this.index = createIndex()
    this.docMap.clear()

    const mdFiles = await this.scanMarkdownFiles(this.workspacePath)

    for (const filePath of mdFiles) {
      await this.indexFile(filePath)
    }

    logger.info(`Search index built: ${this.docMap.size} files indexed`)
  }

  private async scanMarkdownFiles(dirPath: string): Promise<string[]> {
    const files: string[] = []
    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue

      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        const subFiles = await this.scanMarkdownFiles(fullPath)
        files.push(...subFiles)
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath)
      }
    }

    return files
  }

  async indexFile(absolutePath: string): Promise<void> {
    try {
      const content = await fs.readFile(absolutePath, 'utf-8')
      const relativePath = path.relative(this.workspacePath, absolutePath)
      const fileName = path.basename(absolutePath)

      // Use a numeric hash as FlexSearch ID
      const id = this.hashPath(relativePath)

      const doc: IndexedDoc = {
        id: relativePath,
        content,
        fileName
      }

      this.docMap.set(relativePath, doc)
      this.index.add(id, content)
    } catch (err) {
      logger.error('Failed to index file:', absolutePath, err)
    }
  }

  async removeFile(relativePath: string): Promise<void> {
    const id = this.hashPath(relativePath)
    this.index.remove(id)
    this.docMap.delete(relativePath)
  }

  async updateFile(absolutePath: string): Promise<void> {
    const relativePath = path.relative(this.workspacePath, absolutePath)
    await this.removeFile(relativePath)
    await this.indexFile(absolutePath)
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!query.trim()) return []

    const rawResults = this.index.search(query, { limit: 50 })
    const results: SearchResult[] = []

    for (const numericId of rawResults) {
      // Find the doc by reverse lookup
      for (const [relativePath, doc] of this.docMap) {
        if (this.hashPath(relativePath) === numericId) {
          // Apply folder filter
          if (options?.folderFilter && options.folderFilter.length > 0) {
            const inFolder = options.folderFilter.some((folder) =>
              relativePath.startsWith(folder)
            )
            if (!inFolder) continue
          }

          const matches = this.findMatches(doc.content, query, options)

          if (matches.length > 0) {
            results.push({
              filePath: relativePath,
              fileName: doc.fileName,
              matches,
              score: matches.length
            })
          }
          break
        }
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score)

    return results
  }

  findMatches(content: string, query: string, options?: SearchOptions): SearchMatch[] {
    const matches: SearchMatch[] = []
    const lines = content.split('\n')
    const caseSensitive = options?.caseSensitive ?? false
    const wholeWord = options?.wholeWord ?? false

    const searchQuery = caseSensitive ? query : query.toLowerCase()

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const searchLine = caseSensitive ? line : line.toLowerCase()

      let startPos = 0
      while (startPos < searchLine.length) {
        const matchIndex = searchLine.indexOf(searchQuery, startPos)
        if (matchIndex === -1) break

        if (wholeWord) {
          const before = matchIndex > 0 ? searchLine[matchIndex - 1] : ' '
          const after =
            matchIndex + searchQuery.length < searchLine.length
              ? searchLine[matchIndex + searchQuery.length]
              : ' '
          if (/\w/.test(before) || /\w/.test(after)) {
            startPos = matchIndex + 1
            continue
          }
        }

        matches.push({
          lineNumber: i + 1,
          lineContent: line,
          matchStart: matchIndex,
          matchEnd: matchIndex + query.length
        })

        startPos = matchIndex + searchQuery.length
      }
    }

    return matches
  }

  private hashPath(relativePath: string): number {
    let hash = 0
    for (let i = 0; i < relativePath.length; i++) {
      const char = relativePath.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0 // Convert to 32bit integer
    }
    return Math.abs(hash)
  }
}
