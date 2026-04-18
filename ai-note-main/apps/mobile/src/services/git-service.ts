import git from 'isomorphic-git'
import { createPatch } from 'diff'
import * as FileSystem from 'expo-file-system'
import type { GitCommit, GitDiff, GitStatus } from '@ai-note/shared-types'
import { DEFAULT_GITIGNORE } from '@ai-note/shared-types'
import fsAdapter from './fs-adapter'

class GitService {
  private workspacePath = ''

  async initialize(workspacePath: string): Promise<void> {
    this.workspacePath = workspacePath

    // Check if .git exists
    const gitDir = `${workspacePath}/.git`
    const gitInfo = await FileSystem.getInfoAsync(gitDir)

    if (!gitInfo.exists) {
      await git.init({ fs: fsAdapter, dir: workspacePath })

      // Create .gitignore
      const gitignorePath = `${workspacePath}/.gitignore`
      await FileSystem.writeAsStringAsync(gitignorePath, DEFAULT_GITIGNORE)

      // Initial commit
      await git.add({ fs: fsAdapter, dir: workspacePath, filepath: '.gitignore' })
      await git.commit({
        fs: fsAdapter,
        dir: workspacePath,
        message: 'Initial commit',
        author: { name: 'AI-Note', email: 'ainote@local' },
      })
    }
  }

  async stageFile(relativePath: string): Promise<void> {
    await git.add({
      fs: fsAdapter,
      dir: this.workspacePath,
      filepath: relativePath,
    })
  }

  async commit(message: string, files?: string[]): Promise<string> {
    if (files) {
      for (const file of files) {
        await git.add({
          fs: fsAdapter,
          dir: this.workspacePath,
          filepath: file,
        })
      }
    }

    const sha = await git.commit({
      fs: fsAdapter,
      dir: this.workspacePath,
      message,
      author: { name: 'AI-Note', email: 'ainote@local' },
    })
    return sha
  }

  async getHistory(relativePath: string, limit = 50): Promise<GitCommit[]> {
    try {
      const logs = await git.log({
        fs: fsAdapter,
        dir: this.workspacePath,
        filepath: relativePath || undefined,
        depth: limit,
      })

      return logs.map((entry) => ({
        sha: entry.oid,
        message: entry.commit.message,
        author: {
          name: entry.commit.author.name,
          email: entry.commit.author.email,
          timestamp: entry.commit.author.timestamp,
        },
      }))
    } catch {
      return []
    }
  }

  async getDiff(
    sha1: string,
    sha2: string,
    relativePath: string
  ): Promise<GitDiff> {
    const content1 = await this.getFileContent(sha1, relativePath)
    const content2 = await this.getFileContent(sha2, relativePath)

    const patch = createPatch(relativePath, content1, content2)
    const hunks = this.parseHunks(patch)
    const additions = hunks.reduce(
      (sum, h) => sum + h.lines.filter((l) => l.startsWith('+')).length,
      0
    )
    const deletions = hunks.reduce(
      (sum, h) => sum + h.lines.filter((l) => l.startsWith('-')).length,
      0
    )

    return { additions, deletions, hunks }
  }

  async getFileContent(sha: string, relativePath: string): Promise<string> {
    try {
      const { blob } = await git.readBlob({
        fs: fsAdapter,
        dir: this.workspacePath,
        oid: sha,
        filepath: relativePath,
      })
      return new TextDecoder().decode(blob)
    } catch {
      return ''
    }
  }

  async saveVersion(
    relativePath: string,
    description: string
  ): Promise<string> {
    // Update the front matter timestamp to ensure git detects a change
    const fullPath = `${this.workspacePath}/${relativePath}`
    const content = await FileSystem.readAsStringAsync(fullPath)

    const updatedContent = content.replace(
      /^(---\n[\s\S]*?)(updated:\s*).+(\n[\s\S]*?---)/m,
      `$1$2${new Date().toISOString()}$3`
    )

    if (updatedContent !== content) {
      await FileSystem.writeAsStringAsync(fullPath, updatedContent)
    }

    await this.stageFile(relativePath)
    return await this.commit(description || `Update ${relativePath}`, [relativePath])
  }

  async restoreFile(relativePath: string, sha: string): Promise<void> {
    const content = await this.getFileContent(sha, relativePath)
    const fullPath = `${this.workspacePath}/${relativePath}`
    await FileSystem.writeAsStringAsync(fullPath, content)
  }

  async getStatus(): Promise<GitStatus> {
    try {
      const matrix = await git.statusMatrix({
        fs: fsAdapter,
        dir: this.workspacePath,
      })

      const staged: string[] = []
      const unstaged: string[] = []
      const untracked: string[] = []

      for (const [filepath, head, workdir, index] of matrix) {
        if (head === 0 && workdir === 2 && index === 0) {
          untracked.push(filepath)
        } else if (index !== head) {
          staged.push(filepath)
        } else if (workdir !== index) {
          unstaged.push(filepath)
        }
      }

      const branch = await git
        .currentBranch({
          fs: fsAdapter,
          dir: this.workspacePath,
        })
        .catch(() => 'main')

      return { branch: branch || 'main', staged, unstaged, untracked }
    } catch {
      return { branch: 'main', staged: [], unstaged: [], untracked: [] }
    }
  }

  private parseHunks(
    patch: string
  ): Array<{
    oldStart: number
    oldLines: number
    newStart: number
    newLines: number
    lines: string[]
  }> {
    const hunks: Array<{
      oldStart: number
      oldLines: number
      newStart: number
      newLines: number
      lines: string[]
    }> = []

    const hunkRegex = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/gm
    let match: RegExpExecArray | null

    while ((match = hunkRegex.exec(patch)) !== null) {
      const oldStart = parseInt(match[1])
      const oldLines = parseInt(match[2] || '1')
      const newStart = parseInt(match[3])
      const newLines = parseInt(match[4] || '1')

      // Extract lines until next hunk or end
      const startIdx = match.index + match[0].length
      const nextMatch = hunkRegex.exec(patch)
      const endIdx = nextMatch ? nextMatch.index : patch.length
      hunkRegex.lastIndex = nextMatch ? nextMatch.index : patch.length

      const content = patch.slice(startIdx, endIdx)
      const lines = content
        .split('\n')
        .filter((l) => l.startsWith('+') || l.startsWith('-') || l.startsWith(' '))

      hunks.push({ oldStart, oldLines, newStart, newLines, lines })

      if (nextMatch) {
        hunkRegex.lastIndex = nextMatch.index
      }
    }

    return hunks
  }
}

export const gitService = new GitService()
